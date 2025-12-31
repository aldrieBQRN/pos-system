<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon; // <--- Import Carbon

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $query = Sale::with(['items.product', 'cashier'])
            ->orderBy('created_at', 'desc');

        // 1. UPDATED: Date Range Filter
        if ($request->start_date && $request->end_date) {
            $query->whereBetween('created_at', [
                Carbon::parse($request->start_date)->startOfDay(),
                Carbon::parse($request->end_date)->endOfDay()
            ]);
        } elseif ($request->start_date) {
            // If only start date is picked, show everything from that day onwards
            $query->where('created_at', '>=', Carbon::parse($request->start_date)->startOfDay());
        } elseif ($request->end_date) {
            // If only end date is picked, show everything up to that day
            $query->where('created_at', '<=', Carbon::parse($request->end_date)->endOfDay());
        }

        // 2. Search Filter
        if ($request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('invoice_number', 'like', "%$search%")
                  ->orWhereHas('cashier', function($q2) use ($search) {
                      $q2->where('name', 'like', "%$search%");
                  });
            });
        }

        // 3. Summaries (Exclude Voids)
        $statsQuery = clone $query;
        $statsQuery->where('status', 'completed'); 

        $summary = [
            'total_sales' => $statsQuery->sum('total_amount'),
            'transaction_count' => $statsQuery->count(),
            'cash_sales' => (clone $statsQuery)->where('payment_method', 'cash')->sum('total_amount'),
            'gcash_sales' => (clone $statsQuery)->where('payment_method', 'gcash')->sum('total_amount'),
        ];

        $sales = $query->paginate(10);

        return response()->json([
            'sales' => $sales,
            'summary' => $summary
        ]);
    }

    // ... (Keep the void function as is) ...
    public function void($id)
    {
        // ... existing void logic ...
        DB::beginTransaction();
        try {
            $sale = Sale::with('items')->findOrFail($id);
            if ($sale->status === 'void') return response()->json(['message' => 'Transaction is already void.'], 400);

            foreach ($sale->items as $item) {
                $product = Product::find($item->product_id);
                if ($product) $product->increment('stock_quantity', $item->quantity);
            }
            $sale->update(['status' => 'void']);
            DB::commit();
            return response()->json(['message' => 'Transaction voided and inventory returned.']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error voiding transaction'], 500);
        }
    }
}