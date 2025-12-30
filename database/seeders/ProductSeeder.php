<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Category; // Import the Category model

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Helper to get ID (or create if missing)
        $getCatId = function ($name) {
            return Category::firstOrCreate(['name' => $name])->id;
        };

        DB::table('products')->insert([
            [
                'name' => 'Espresso Shot',
                'sku'  => 'BEV-001',
                'price' => 250, // $2.50
                'stock_quantity' => 100,
                'category_id' => $getCatId('Beverages'), // <--- UPDATED
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Blueberry Muffin',
                'sku'  => 'BAK-001',
                'price' => 300, // $3.00
                'stock_quantity' => 50,
                'category_id' => $getCatId('Bakery'), // <--- UPDATED
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Club Sandwich',
                'sku'  => 'FOD-001',
                'price' => 850, // $8.50
                'stock_quantity' => 20,
                'category_id' => $getCatId('Food'), // <--- UPDATED
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Vanilla Latte',
                'sku'  => 'BEV-002',
                'price' => 450, // $4.50
                'stock_quantity' => 75,
                'category_id' => $getCatId('Beverages'), // <--- UPDATED
                'created_at' => now(),
                'updated_at' => now(),
            ]
        ]);
        
       
        for ($i = 0; $i < 10; $i++) {
            DB::table('products')->insert([
                'name' => 'Generic Item ' . $i,
                'sku' => 'GEN-' . rand(1000, 9999),
                'price' => rand(100, 5000),
                'stock_quantity' => rand(10, 100),
                'category_id' => $getCatId('General'),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        
    }
}