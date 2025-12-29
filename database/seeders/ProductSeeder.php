<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create a few specific items for testing
        $products = [
            [
                'name' => 'Espresso Shot',
                'sku' => 'BEV-001',
                'price' => 250, // $2.50
                'stock_quantity' => 100,
                'category' => 'Beverages',
            ],
            [
                'name' => 'Vanilla Latte',
                'sku' => 'BEV-002',
                'price' => 450, // $4.50
                'stock_quantity' => 50,
                'category' => 'Beverages',
            ],
            [
                'name' => 'Blueberry Muffin',
                'sku' => 'BAK-001',
                'price' => 300, // $3.00
                'stock_quantity' => 20,
                'category' => 'Bakery',
            ],
            [
                'name' => 'Club Sandwich',
                'sku' => 'FOO-001',
                'price' => 850, // $8.50
                'stock_quantity' => 15,
                'category' => 'Food',
            ]
        ];

        foreach ($products as $item) {
            Product::create($item);
        }

        // 2. Optional: Generate 50 random items using a Factory
        // Ideally, you would create a ProductFactory for this, 
        // but for a quick start, we can just loop here.
        for ($i = 0; $i < 10; $i++) {
            Product::create([
                'name' => 'Generic Item ' . $i,
                'sku' => 'GEN-' . Str::random(5),
                'price' => rand(100, 5000), // Random price $1.00 - $50.00
                'stock_quantity' => rand(0, 100),
                'category' => 'General',
                'is_active' => true,
            ]);
        }
    }
}