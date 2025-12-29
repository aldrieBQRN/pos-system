<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Support\Facades\Auth;

class PosController extends Controller
{
    public function checkout(Request $request)
    {
        // 1. Validate
        $validated = $request->validate([
            'cart' => 'required|array|min:1',
            'cart.*.id' => 'required|exists:products,id',
            'cart.*.quantity' => 'required|integer|min:1',
            // NEW: Validation for Payment
            'payment_method' => 'required|in:cash,gcash',
            'payment_reference' => 'nullable|string',
        ]);

        try {
            $transactionResult = DB::transaction(function () use ($validated) {
                $cashierId = \Illuminate\Support\Facades\Auth::id() ?? 1; 

                // A. Create Sale Header with NEW FIELDS
                $sale = Sale::create([
                    'transaction_date'  => now(),
                    'invoice_number'    => 'INV-' . time(),
                    'cashier_id'        => $cashierId,
                    'total_amount'      => 0,
                    // Save the method and reference
                    'payment_method'    => $validated['payment_method'],
                    'payment_reference' => $validated['payment_reference'] ?? null,
                ]);

                // ... (The rest of the loop logic REMAINS THE SAME) ...
                $totalAmount = 0;
                foreach ($validated['cart'] as $cartItem) {
                    // ... copy your existing loop code here ...
                    $product = Product::where('id', $cartItem['id'])->lockForUpdate()->first();
                    // ... stock checks ...
                    $lineTotal = $product->price * $cartItem['quantity'];
                    $totalAmount += $lineTotal;
                    $product->decrement('stock_quantity', $cartItem['quantity']);
                    SaleItem::create([
                        'sale_id' => $sale->id,
                        'product_id' => $product->id,
                        'quantity' => $cartItem['quantity'],
                        'unit_price' => $product->price,
                        'subtotal' => $lineTotal,
                    ]);
                }

                $sale->update(['total_amount' => $totalAmount]);
                return $sale;
            });

            return response()->json([
                'success' => true,
                'sale_id' => $transactionResult->id, 
                'message' => 'Transaction successful'
            ], 201);

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 400);
        }
    }
}