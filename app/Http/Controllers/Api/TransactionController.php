<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $query = Sale::with(['cashier', 'items.product']); // Eager load relationships

        // Optional: Filter by Date
        if ($request->date) {
            $query->whereDate('created_at', $request->date);
        }

        // Show newest first
        $sales = $query->orderBy('created_at', 'desc')->paginate(10);

        return response()->json($sales);
    }
}