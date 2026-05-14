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
        $products = Product::all();
        $users = User::all(); // Fetch all users to distribute sales

        if ($products->count() === 0) {
            $this->command->info('No products found! Run ProductSeeder first.');
            return;
        }

        if ($users->count() === 0) {
            $this->command->info('No users found! Run DatabaseSeeder first.');
            return;
        }

        // Create 100 Fake Transactions to populate the charts
        for ($i = 0; $i < 100; $i++) {
            // Random date in the last 7 days
            $date = Carbon::today()->subDays(rand(0, 7))->setTime(rand(8, 22), rand(0, 59));

            // Randomly assign the sale to either Admin or Cashier
            $cashier = $users->random();

            // Create the Sale Ticket
            // Create the Sale Ticket
            $sale = Sale::create([
                'invoice_number' => 'INV-' . strtoupper(uniqid()),
                'cashier_id' => $cashier->id,
                'total_amount' => 0,
                'payment_method' => rand(1, 10) > 2 ? 'cash' : 'gcash',
                'payment_reference' => null,
                'transaction_date' => $date, // <--- ADD THIS LINE
                'created_at' => $date,
                'updated_at' => $date,
            ]);

            // If GCash, generate a reference number
            if ($sale->payment_method === 'gcash') {
                $sale->update(['payment_reference' => 'REF-' . rand(100000, 999999)]);
            }

            // Add 1-5 Random Items to this Sale
            $total = 0;
            $itemsCount = rand(1, 5);

            for ($j = 0; $j < $itemsCount; $j++) {
                $product = $products->random();
                $quantity = rand(1, 4);
                $price = $product->price;

                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'unit_price' => $price,
                    'subtotal' => $price * $quantity,
                    'created_at' => $date,
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
