<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Category;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create Categories 1 to 5
        $categories = [
            'Category 1',
            'Category 2',
            'Category 3',
            'Category 4',
            'Category 5'
        ];

        foreach ($categories as $cat) {
            Category::firstOrCreate(['name' => $cat]);
        }

        // 2. Create Admin (Only if not exists)
        User::firstOrCreate(
            ['email' => 'admin@email.com'],
            [
                'name' => 'Admin User',
                'password' => bcrypt('password'),
                'is_admin' => true,
            ]
        );

        // 3. Create Cashier (Only if not exists)
        User::firstOrCreate(
            ['email' => 'cashier@email.com'],
            [
                'name' => 'Cashier John',
                'password' => bcrypt('password'),
                'is_admin' => false,
            ]
        );

        // 4. Seed Settings
        DB::table('settings')->insertOrIgnore([
            ['key' => 'store_name', 'value' => 'SMART POS', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'store_address', 'value' => '123 Main St, Batangas', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'store_phone', 'value' => '(043) 123-4567', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // 5. Call all other seeders in the correct order
        $this->call([
            ProductSeeder::class,
            SalesSeeder::class,
            ShiftSeeder::class,
        ]);
    }
}
