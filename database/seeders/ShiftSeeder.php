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
        // Define your 2 users
        $adminId = 1;
        $cashierId = 2;

        // Generate shifts for the last 5 days
        for ($i = 5; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);

            // Create a morning shift for the Cashier
            $this->createShift($cashierId, $date->copy()->setTime(8, 0), $date->copy()->setTime(16, 0));

            // Create an evening shift for the Admin (acting as cashier)
            $this->createShift($adminId, $date->copy()->setTime(16, 0), $date->copy()->setTime(23, 0));
        }
    }

    private function createShift($userId, $start, $end)
    {
        $startingCash = 1000.00; // Fixed starting amount
        $cashSales = rand(5000, 15000); // Random sales amount
        $expectedCash = $startingCash + $cashSales;

        // Randomly simulate a small shortage or overage (difference)
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
            'status' => 'closed', // Seeded data is historical/closed
        ]);
    }
}
