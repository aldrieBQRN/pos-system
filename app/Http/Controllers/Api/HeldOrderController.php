<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HeldOrder;
use Illuminate\Http\Request;

class HeldOrderController extends Controller
{
    public function index()
    {
        return HeldOrder::orderBy('created_at', 'desc')->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'cart' => 'required|array',
            'total' => 'required|integer'
        ]);

        HeldOrder::create([
            'reference_note' => $request->note ?? 'Unnamed Order',
            'cart_data' => $request->cart,
            'total_amount' => $request->total
        ]);

        return response()->json(['message' => 'Order held successfully']);
    }

    public function destroy($id)
    {
        HeldOrder::destroy($id);
        return response()->json(['message' => 'Order removed']);
    }
}