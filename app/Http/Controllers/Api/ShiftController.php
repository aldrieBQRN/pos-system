<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ShiftController extends Controller
{
    // Get all shifts history (For Admin)
    public function index(Request $request)
    {
        $query = Shift::with('user')->orderBy('created_at', 'desc');

        // Date Filter
        if ($request->date) {
            $query->whereDate('start_time', $request->date);
        }

        // Search Cashier Filter (NEW)
        if ($request->search) {
            $query->whereHas('user', function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%");
            });
        }

        return $query->paginate(10);
    }

    // Check for ANY open shift
    public function check(Request $request)
    {
        $shift = Shift::with('user') // <--- THIS IS CRITICAL
            ->where('status', 'open')
            ->latest()
            ->first();

        return response()->json($shift);
    }

    // Start Shift
    public function start(Request $request)
    {
        $request->validate(['amount' => 'required|numeric|min:0']);

        return DB::transaction(function () use ($request) {
            $existingShift = Shift::where('status', 'open')->lockForUpdate()->with('user')->first();

            if ($existingShift) {
                if ($existingShift->user_id == Auth::id()) {
                    return response()->json($existingShift);
                }
                return response()->json(['message' => 'Register in use by ' . $existingShift->user->name], 403);
            }

            $shift = Shift::create([
                'user_id' => Auth::id(),
                'start_time' => now(),
                'starting_cash' => $request->amount,
                'status' => 'open'
            ]);

            return response()->json($shift->load('user')); // <--- LOAD USER HERE
        });
    }

    // Close Shift
    public function close(Request $request)
    {
        $request->validate(['actual_cash' => 'required|numeric|min:0']);

        return DB::transaction(function () use ($request) {
            $shift = Shift::where('status', 'open')->lockForUpdate()->latest()->first();

            if (!$shift) return response()->json(['message' => 'Shift not found'], 404);
            if ($shift->user_id != Auth::id()) return response()->json(['message' => 'Unauthorized'], 403);

            $cashSales = DB::table('sales')
                ->where('cashier_id', Auth::id())
                ->where('payment_method', 'cash')
                ->where('created_at', '>=', $shift->start_time)
                ->sum('total_amount') / 100;

            $shift->update([
                'end_time' => now(),
                'cash_sales' => $cashSales,
                'expected_cash' => $shift->starting_cash + $cashSales,
                'actual_cash' => $request->actual_cash,
                'difference' => $request->actual_cash - ($shift->starting_cash + $cashSales),
                'status' => 'closed'
            ]);

            return response()->json($shift->load('user')); // <--- LOAD USER HERE
        });
    }
}
