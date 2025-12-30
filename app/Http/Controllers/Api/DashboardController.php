<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\Product;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        $today = Carbon::today();

        // 1. Basic Stats
        $todaySales = Sale::whereDate('created_at', $today)->sum('total_amount');
        $todayOrders = Sale::whereDate('created_at', $today)->count();
        $totalProducts = Product::count();
        $lowStock = Product::where('stock_quantity', '<', 10)->get();

        // 2. Bar Chart: Sales Last 7 Days
        $chartData = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            $sum = Sale::whereDate('created_at', $date)->sum('total_amount');
            $chartData[] = [
                'date' => $date->format('M d'), 
                'sales' => $sum / 100
            ];
        }

       // 3. Pie Chart: Sales by Category
        $categoryData = DB::table('sale_items')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('categories', 'products.category_id', '=', 'categories.id') // <--- NEW JOIN
            ->select('categories.name as category', DB::raw('sum(sale_items.quantity) as value')) // <--- Select Name from Categories table
            ->groupBy('categories.name')
            ->get();

        // 4. Table: Top 5 Best Sellers
        $topProducts = DB::table('sale_items')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->select('products.name', 'products.price', DB::raw('sum(sale_items.quantity) as sold'))
            ->groupBy('products.name', 'products.price')
            ->orderByDesc('sold')
            ->limit(5)
            ->get();

        // 5. List: Recent 5 Transactions
        $recentSales = Sale::with('cashier')->latest()->limit(5)->get();

        return response()->json([
            'today_sales' => $todaySales / 100,
            'today_orders' => $todayOrders,
            'total_products' => $totalProducts,
            'low_stock' => $lowStock,
            'chart_data' => $chartData,
            'category_data' => $categoryData,
            'top_products' => $topProducts,
            'recent_sales' => $recentSales
        ]);
    }
}