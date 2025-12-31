<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class GrocerySeeder extends Seeder
{
    public function run()
    {
        // 1. CLEAN DATABASE
        Schema::disableForeignKeyConstraints();
        DB::table('sale_items')->truncate();
        DB::table('sales')->truncate();
        DB::table('products')->truncate();
        DB::table('categories')->truncate();
        Schema::enableForeignKeyConstraints();

        $this->command->info('🧹 Old data cleaned!');

        // 2. CREATE CATEGORIES
        $categories = [
            ['name' => 'Fresh Produce', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Meat & Seafood', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Dairy & Eggs', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Beverages', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Snacks & Sweets', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Household', 'created_at' => now(), 'updated_at' => now()],
        ];
        DB::table('categories')->insert($categories);
        
        $catIds = DB::table('categories')->pluck('id', 'name');

        // 3. CREATE PRODUCTS
        $productsList = [
            ['Red Apple (kg)', 'Fresh Produce', 350, 200, 50],
            ['Banana (Bunch)', 'Fresh Produce', 250, 150, 45],
            ['Carrots (kg)', 'Fresh Produce', 180, 90, 60],
            ['Potatoes (kg)', 'Fresh Produce', 220, 100, 100],
            ['Broccoli', 'Fresh Produce', 400, 250, 8], 
            ['Chicken Breast (kg)', 'Meat & Seafood', 850, 600, 30],
            ['Ground Beef (kg)', 'Meat & Seafood', 1200, 900, 25],
            ['Salmon Fillet', 'Meat & Seafood', 1500, 1100, 15],
            ['Whole Milk (1L)', 'Dairy & Eggs', 300, 210, 40],
            ['Cheddar Cheese', 'Dairy & Eggs', 650, 400, 35],
            ['Dozen Eggs', 'Dairy & Eggs', 450, 300, 12],
            ['Butter (Salted)', 'Dairy & Eggs', 550, 380, 20],
            ['Orange Juice (1L)', 'Beverages', 450, 250, 40],
            ['Cola (1.5L)', 'Beverages', 220, 110, 100],
            ['Mineral Water (500ml)', 'Beverages', 100, 30, 200],
            ['Iced Coffee Can', 'Beverages', 350, 150, 5],
            ['Potato Chips (Large)', 'Snacks & Sweets', 450, 220, 60],
            ['Chocolate Bar', 'Snacks & Sweets', 150, 80, 150],
            ['Oat Cookies', 'Snacks & Sweets', 350, 180, 0],
            ['Dish Soap', 'Household', 500, 250, 30],
            ['Paper Towels (Pack)', 'Household', 800, 400, 25],
        ];

        $productIds = [];
        foreach ($productsList as $p) {
            $id = DB::table('products')->insertGetId([
                'name' => $p[0],
                'sku' => strtoupper(substr($p[1], 0, 3)) . '-' . rand(1000, 9999),
                'category_id' => $catIds[$p[1]],
                'price' => $p[2],
                'cost_price' => $p[3], 
                'stock_quantity' => $p[4],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $productIds[] = $id;
        }

        $this->command->info('🍎 Grocery products seeded!');

        // 4. GENERATE SALES
        $userId = DB::table('users')->first()->id ?? 1;

        for ($i = 30; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            $isWeekend = $date->isWeekend();
            $dailyOrders = rand(5, $isWeekend ? 15 : 8); 

            for ($j = 0; $j < $dailyOrders; $j++) {
                $saleDate = $date->copy()->setHour(rand(9, 20))->setMinute(rand(0, 59));

                $saleId = DB::table('sales')->insertGetId([
                    'invoice_number' => 'INV-' . $saleDate->format('Ymd') . '-' . rand(1000, 9999),
                    'cashier_id' => $userId, // <--- FIXED: Changed user_id to cashier_id
                    'total_amount' => 0,
                    'payment_method' => rand(0, 10) > 3 ? 'cash' : 'card',
                    'created_at' => $saleDate,
                    'updated_at' => $saleDate,
                ]);

                $itemsCount = rand(1, 6);
                $saleTotal = 0;

                for ($k = 0; $k < $itemsCount; $k++) {
                    $prodId = $productIds[array_rand($productIds)];
                    $prod = DB::table('products')->where('id', $prodId)->first();
                    $qty = rand(1, 3);

                    DB::table('sale_items')->insert([
                        'sale_id' => $saleId,
                        'product_id' => $prodId,
                        'quantity' => $qty,
                        'unit_price' => $prod->price,
                        'subtotal' => $prod->price * $qty,
                        'created_at' => $saleDate,
                        'updated_at' => $saleDate,
                    ]);

                    $saleTotal += ($prod->price * $qty);
                }

                DB::table('sales')->where('id', $saleId)->update(['total_amount' => $saleTotal]);
            }
        }

        $this->command->info('📈 30 Days of Sales History generated!');
    }
}