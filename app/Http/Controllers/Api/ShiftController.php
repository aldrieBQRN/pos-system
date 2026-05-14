<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ShiftController extends Controller
{
    public function index(Request $request)
    {
        $query = Shift::with('user')->orderBy('created_at', 'desc');
        if ($request->date) $query->whereDate('start_time', $request->date);
        if ($request->search) {
            $query->whereHas('user', function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%");
            });
        }
        return $query->paginate(10);
    }

    public function data($id)
    {
        $shift = Shift::with('user')->findOrFail($id);

        $otherSales = DB::table('sales')
            ->where('cashier_id', $shift->user_id)
            ->where('payment_method', '!=', 'cash')
            ->where('status', 'completed')
            ->whereBetween('created_at', [$shift->start_time, $shift->end_time ?? now()])
            ->sum('total_amount') / 100;

        return response()->json([
            'staff_name'     => $shift->user->name,
            'start'          => $shift->start_time->format('m/d/Y h:i A'),
            'end'            => $shift->end_time ? $shift->end_time->format('m/d/Y h:i A') : 'ACTIVE',
            'printed_at'     => now()->format('m/d/Y h:i A'),
            'starting_cash'  => $shift->starting_cash,
            'cash_sales'     => $shift->cash_sales ?? 0,
            'other_sales'    => $otherSales,
            'ending_cash'    => $shift->actual_cash ?? 0,
            'expected_cash'  => $shift->expected_cash ?? 0,
            'difference'     => $shift->difference ?? 0,
        ]);
    }

    public function check(Request $request)
    {
        $shift = Shift::with('user')->where('status', 'open')->latest()->first();
        return response()->json($shift);
    }

    public function start(Request $request)
    {
        $request->validate(['amount' => 'required|numeric|min:0']);
        return DB::transaction(function () use ($request) {
            $existingShift = Shift::where('status', 'open')->lockForUpdate()->with('user')->first();
            if ($existingShift) {
                if ($existingShift->user_id == Auth::id()) return response()->json($existingShift);
                return response()->json(['message' => 'Register in use by ' . $existingShift->user->name], 403);
            }
            $shift = Shift::create([
                'user_id' => Auth::id(),
                'start_time' => now(),
                'starting_cash' => $request->amount,
                'status' => 'open'
            ]);
            return response()->json($shift->load('user'));
        });
    }

    public function close(Request $request)
    {
        $request->validate(['actual_cash' => 'required|numeric|min:0']);

        return DB::transaction(function () use ($request) {
            $shift = Shift::where('status', 'open')->where('user_id', Auth::id())->lockForUpdate()->latest()->first();
            if (!$shift) return response()->json(['message' => 'Shift not found'], 404);

            $cashSales = DB::table('sales')
                ->where('cashier_id', Auth::id())
                ->where('payment_method', 'cash')
                ->where('status', 'completed')
                ->where('created_at', '>=', $shift->start_time)
                ->sum('total_amount') / 100;

            // Simplified: starting + sales
            $expectedCash = $shift->starting_cash + $cashSales;
            $actualCash = $request->actual_cash;

            $shift->update([
                'end_time'      => now(),
                'cash_sales'    => $cashSales,
                'expected_cash' => $expectedCash,
                'actual_cash'   => $actualCash,
                'difference'    => $actualCash - $expectedCash,
                'status'        => 'closed'
            ]);

            return response()->json($shift->load('user'));
        });
    }
}
