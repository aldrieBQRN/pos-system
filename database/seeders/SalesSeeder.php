<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Product;
use App\Models\User;
use Carbon\Carbon;

class SalesSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Get available products and a cashier
        $products = Product::all();
        $cashier = User::first(); // Grab the first user as the cashier

        if ($products->count() === 0) {
            $this->command->info('No products found! Run ProductSeeder first.');
            return;
        }

        if (!$cashier) {
            $this->command->info('No users found! Run DatabaseSeeder first.');
            return;
        }

        // 2. Create 50 Fake Transactions
        for ($i = 0; $i < 50; $i++) {
            // Random date in the last 7 days (spread out time)
            $date = Carbon::today()->subDays(rand(0, 6))->setTime(rand(8, 20), rand(0, 59));

            // Create the Sale Ticket
            $sale = Sale::create([
                'invoice_number' => 'INV-' . strtoupper(uniqid()),
                'cashier_id' => $cashier->id,
                'total_amount' => 0, // Calculated below
                'payment_method' => rand(0, 1) ? 'cash' : 'gcash',
                'payment_reference' => rand(0, 1) ? 'REF-' . rand(1000, 9999) : null,
                'created_at' => $date,
                'updated_at' => $date,
            ]);

            // Add 1-4 Random Items to this Sale
            $total = 0;
            $itemsCount = rand(1, 4);

            for ($j = 0; $j < $itemsCount; $j++) {
                $product = $products->random();
                $quantity = rand(1, 3);
                $price = $product->price; // Price is in cents (e.g., 250)

                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'unit_price' => $price,
                    'subtotal' => $price * $quantity,
                    'created_at' => $date, // Important for "Today's Sales" chart
                    'updated_at' => $date,
                ]);

                $total += ($price * $quantity);
                
                // Simulate stock reduction
                if ($product->stock_quantity > $quantity) {
                    $product->decrement('stock_quantity', $quantity);
                }
            }

            // Update the Sale Total
            $sale->update(['total_amount' => $total]);
        }
    }
}