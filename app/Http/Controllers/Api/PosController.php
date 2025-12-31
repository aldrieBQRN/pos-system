<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class PosController extends Controller
{
    public function checkout(Request $request)
    {
        // 1. Basic Validation
        $request->validate([
            'cart' => 'required|array|min:1',
            'cart.*.id' => 'required|exists:products,id',
            'cart.*.quantity' => 'required|integer|min:1', 
            'payment_method' => 'required|string',
            // Allow cash_given and change to be nullable/numeric
            'cash_given' => 'nullable|numeric',
            'change' => 'nullable|numeric',
        ]);

        // 2. Start Database Transaction
        DB::beginTransaction();

        try {
            // 3. Handle Payment Details
            // If Cash: Convert to cents. If GCash: Null.
            $cashGiven = $request->payment_method === 'cash' ? ($request->cash_given * 100) : null;
            $change = $request->payment_method === 'cash' ? ($request->change * 100) : 0;

            // 4. Create the Sale Record
            $sale = Sale::create([
                'invoice_number' => 'INV-' . strtoupper(uniqid()),
                'cashier_id' => Auth::id(), // Uses the logged-in user
                'total_amount' => 0, 
                'payment_method' => $request->payment_method,
                'payment_reference' => $request->reference ?? null,
                'is_senior' => $request->is_senior ?? false,
                
                // NEW: Store Cash/Change info
                'cash_given' => $cashGiven,
                'change' => $change,
            ]);

            $calculatedTotal = 0;

            foreach ($request->cart as $item) {
                // 5. LOCK THE PRODUCT for stock safety
                $product = Product::lockForUpdate()->find($item['id']);

                if (!$product) {
                    throw new \Exception("Product not found: ID {$item['id']}");
                }

                if ($product->stock_quantity < $item['quantity']) {
                    throw new \Exception("Stock error: {$product->name} only has {$product->stock_quantity} left.");
                }

                // 6. Deduct Stock
                $product->decrement('stock_quantity', $item['quantity']);

                // 7. Create Sale Item
                $subtotal = $product->price * $item['quantity'];

                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => $product->price,
                    'subtotal' => $subtotal,
                ]);

                $calculatedTotal += $subtotal;
            }

            // 8. Re-calculate Senior/PWD Discount
            if ($request->is_senior) {
                $vatExempt = $calculatedTotal / 1.12;
                $discount = $vatExempt * 0.20;
                $calculatedTotal = $vatExempt - $discount;
            }

            // Update final total
            $sale->update(['total_amount' => $calculatedTotal]);

            // 9. Commit Transaction
            DB::commit();

            return response()->json([
                'success' => true,
                'sale_id' => $sale->id,
                'message' => 'Transaction successful!'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }
}