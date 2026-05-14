<?php

namespace Database\Seeders;

use App\Models\Shift;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class ShiftSeeder extends Seeder
{
    public function run(): void
    {
        // Fetch users by email to prevent hardcoded ID errors
        $admin = User::where('email', 'admin@email.com')->first();
        $cashier = User::where('email', 'cashier@email.com')->first();

        if (!$admin || !$cashier) {
            $this->command->info('Users not found! Please run DatabaseSeeder first.');
            return;
        }

        // Generate shifts for the last 7 days (matching the SalesSeeder timeframe)
        for ($i = 7; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);

            // Create a morning shift for the Cashier (8 AM to 4 PM)
            $this->createShift($cashier->id, $date->copy()->setTime(8, 0), $date->copy()->setTime(16, 0));

            // Create an evening shift for the Admin (4 PM to 11 PM)
            $this->createShift($admin->id, $date->copy()->setTime(16, 0), $date->copy()->setTime(23, 0));
        }
    }

    private function createShift($userId, $start, $end)
    {
        $startingCash = 1000.00;
        $cashSales = rand(3000, 15000);
        $expectedCash = $startingCash + $cashSales;

        // Randomly simulate a small shortage or overage (difference between -50 and +50)
        $actualCash = $expectedCash + (rand(-50, 50));
        $difference = $actualCash - $expectedCash;

        Shift::create([
            'user_id' => $userId,
            'start_time' => $start,
            'end_time' => $end,
            'starting_cash' => $startingCash,
            'cash_sales' => $cashSales,
            'expected_cash' => $expectedCash,
            'actual_cash' => $actualCash,
            'difference' => $difference,
            'status' => 'closed',
        ]);
    }
}
