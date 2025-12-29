<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\Product;
use App\Models\SaleItem;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        // 1. Todays Totals
        $todayStart = Carbon::today();
        $todayEnd = Carbon::tomorrow();

        $todaySales = Sale::whereBetween('created_at', [$todayStart, $todayEnd])->sum('total_amount');
        $todayOrders = Sale::whereBetween('created_at', [$todayStart, $todayEnd])->count();
        
        // 2. Low Stock Items (Threshold < 10)
        $lowStockItems = Product::where('stock_quantity', '<=', 10)
            ->select('name', 'stock_quantity', 'sku')
            ->limit(5)
            ->get();

        // 3. Sales Chart Data (Last 7 Days)
        $chartData = Sale::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(total_amount) as total')
            )
            ->where('created_at', '>=', Carbon::now()->subDays(7))
            ->groupBy('date')
            ->orderBy('date', 'ASC')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => Carbon::parse($item->date)->format('M d'), // "Dec 25"
                    'sales' => $item->total / 100 // Convert cents to dollars
                ];
            });

        return response()->json([
            'today_sales' => $todaySales / 100,
            'today_orders' => $todayOrders,
            'total_products' => Product::count(),
            'low_stock' => $lowStockItems,
            'chart_data' => $chartData
        ]);
    }
}