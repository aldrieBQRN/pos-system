<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Category;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        // Get all available category IDs
        $categoryIds = Category::pluck('id')->toArray();

        // Fallback just in case categories aren't seeded yet
        if (empty($categoryIds)) {
            for ($c = 1; $c <= 5; $c++) {
                $categoryIds[] = Category::firstOrCreate(['name' => 'Category ' . $c])->id;
            }
        }

        $products = [];

        // Loop to create Product 1 to 25
        for ($i = 1; $i <= 25; $i++) {
            $products[] = [
                'name' => 'Product ' . $i,
                'sku' => 'PROD-' . str_pad($i, 4, '0', STR_PAD_LEFT), // Generates PROD-0001, PROD-0002...
                'price' => rand(100, 5000), // Random price between 1.00 and 50.00
                'stock_quantity' => rand(10, 100),
                'category_id' => $categoryIds[array_rand($categoryIds)], // Randomly pick a category ID
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // Insert all 25 products into the database at once
        DB::table('products')->insert($products);
    }
}
