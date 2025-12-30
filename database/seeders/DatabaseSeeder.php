<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create Categories
        $categories = [
            'Beverages', 'Bakery', 'Food', 'General', 'Desserts'
        ];
        
        foreach ($categories as $cat) {
            \App\Models\Category::create(['name' => $cat]);
        }
        
        // 1. Create Admin (Only if not exists)
        User::firstOrCreate(
            ['email' => 'admin@email.com'], // Check this email
            [
                'name' => 'Admin User',
                'password' => bcrypt('password'),
                'is_admin' => true,
            ]
        );

        // 2. Create Cashier (Only if not exists)
        User::firstOrCreate(
            ['email' => 'cashier@email.com'], // Check this email
            [
                'name' => 'Cashier John',
                'password' => bcrypt('password'),
                'is_admin' => false,
            ]
        );

        // 3. Seed Products (ProductSeeder usually handles duplicates well, but if it fails, comment it out)
        $this->call(ProductSeeder::class);

        // 4. Seed Settings (Using insertOrIgnore to prevent duplicates)
        DB::table('settings')->insertOrIgnore([
            ['key' => 'store_name', 'value' => 'MY COFFEE SHOP', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'store_address', 'value' => '123 Main St, Batangas', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'store_phone', 'value' => '(043) 123-4567', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}