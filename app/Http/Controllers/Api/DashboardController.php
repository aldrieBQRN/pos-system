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
    public function index(Request $request)
    {
        // 1. DATE FILTERS
        if ($request->has('start_date') && $request->has('end_date')) {
            $startDate = Carbon::parse($request->start_date)->startOfDay();
            $endDate = Carbon::parse($request->end_date)->endOfDay();
            $isFiltered = true;
        } else {
            $startDate = Carbon::today();
            $endDate = Carbon::today()->endOfDay();
            $isFiltered = false;
        }

        // --- KPI CARDS ---
        $todaySales = Sale::whereBetween('created_at', [$startDate, $endDate])->sum('total_amount');
        $todayOrders = Sale::whereBetween('created_at', [$startDate, $endDate])->count();
        
        $salesGrowth = 0;
        if (!$isFiltered) {
            $yesterdaySales = Sale::whereDate('created_at', Carbon::yesterday())->sum('total_amount');
            $salesGrowth = $yesterdaySales > 0 ? (($todaySales - $yesterdaySales) / $yesterdaySales) * 100 : 0;
        }

        $averageOrderValue = $todayOrders > 0 ? $todaySales / $todayOrders : 0;

        $todayProfit = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->whereBetween('sales.created_at', [$startDate, $endDate])
            ->sum(DB::raw('(products.price - products.cost_price) * sale_items.quantity'));

        $totalProducts = Product::count();
        $lowStock = Product::where('stock_quantity', '<', 10)->limit(5)->get();

        // --- CHARTS ---
        // 1. Sales Trend
        $chartStart = $isFiltered ? $startDate : Carbon::now()->subDays(6)->startOfDay();
        $chartEnd = $isFiltered ? $endDate : Carbon::now()->endOfDay();
        
        $rawChartData = Sale::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(total_amount) as total')
            )
            ->whereBetween('created_at', [$chartStart, $chartEnd])
            ->groupBy('date')
            ->orderBy('date', 'ASC')
            ->get()
            ->keyBy('date');

        $chartData = [];
        $period = \Carbon\CarbonPeriod::create($chartStart, $chartEnd);
        foreach ($period as $date) {
            $dateKey = $date->format('Y-m-d');
            $chartData[] = [
                'date' => $date->format('M d'),
                'sales' => isset($rawChartData[$dateKey]) ? $rawChartData[$dateKey]->total / 100 : 0
            ];
        }

        // 2. Peak Hours
        $peakHoursData = Sale::select(DB::raw('HOUR(created_at) as hour'), DB::raw('COUNT(*) as count'))
            ->whereBetween('created_at', [$startDate, $endDate])
            ->groupBy('hour')
            ->orderBy('hour')
            ->get()
            ->map(function ($item) {
                return [
                    'hour' => Carbon::createFromTime($item->hour)->format('g A'),
                    'count' => $item->count
                ];
            });

        // 3. Payment Split
        $paymentMethods = Sale::select('payment_method', DB::raw('count(*) as count'))
            ->whereBetween('created_at', [$startDate, $endDate])
            ->groupBy('payment_method')
            ->get();

        // 4. Sales by Category (FIXED: Uses Left Join to catch uncategorized items)
        $salesByCategory = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id') // Changed to LEFT JOIN
            ->whereBetween('sales.created_at', [$startDate, $endDate])
            ->select('categories.name', DB::raw('SUM(sale_items.quantity) as value'))
            ->groupBy('categories.name')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->name ?? 'Uncategorized', // Fallback for null categories
                    'value' => (int) $item->value
                ];
            });

        // --- LISTS ---
        $topProducts = DB::table('sale_items')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->whereBetween('sales.created_at', [$startDate, $endDate])
            ->select('products.name', DB::raw('sum(sale_items.quantity) as sold'))
            ->groupBy('products.name')
            ->orderByDesc('sold')
            ->limit(5)
            ->get();

        $recentSales = Sale::latest()->limit(5)->get();

        return response()->json([
            'today_sales' => $todaySales / 100,
            'sales_growth' => round($salesGrowth, 1),
            'today_profit' => $todayProfit / 100,
            'today_orders' => $todayOrders,
            'average_order_value' => $averageOrderValue / 100,
            'total_products' => $totalProducts,
            'low_stock' => $lowStock,
            'chart_data' => $chartData,
            'peak_hours' => $peakHoursData,
            'payment_methods' => $paymentMethods,
            'sales_by_category' => $salesByCategory,
            'top_products' => $topProducts,
            'recent_sales' => $recentSales,
            'is_filtered' => $isFiltered
        ]);
    }

    public function export(Request $request)
    {
        $startDate = $request->start_date ? Carbon::parse($request->start_date)->startOfDay() : Carbon::today();
        $endDate = $request->end_date ? Carbon::parse($request->end_date)->endOfDay() : Carbon::today()->endOfDay();

        $sales = Sale::whereBetween('created_at', [$startDate, $endDate])
            ->orderBy('created_at', 'DESC')
            ->get();

        $headers = [
            "Content-type" => "text/csv",
            "Content-Disposition" => "attachment; filename=sales_report.csv",
            "Pragma" => "no-cache",
            "Cache-Control" => "must-revalidate, post-check=0, pre-check=0",
            "Expires" => "0"
        ];

        $callback = function() use ($sales) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Invoice', 'Date', 'Method', 'Total']);
            foreach ($sales as $sale) {
                fputcsv($file, [
                    $sale->invoice_number,
                    $sale->created_at,
                    $sale->payment_method,
                    $sale->total_amount / 100
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}