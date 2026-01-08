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
        // 1. DATE RANGES LOGIC
        if ($request->has('start_date') && $request->has('end_date')) {
            // IF FILTERED: Use the specific range for EVERYTHING
            $startDate = Carbon::parse($request->start_date)->startOfDay();
            $endDate = Carbon::parse($request->end_date)->endOfDay();
            $isFiltered = true;

            // Charts use the same filter
            $chartStart = $startDate;
            $chartEnd = $endDate;
        } else {
            // IF DEFAULT:
            // KPIs = Today (Standard dashboard behavior)
            $startDate = Carbon::today();
            $endDate = Carbon::today()->endOfDay();
            $isFiltered = false;

            // CHARTS/LISTS = ALL TIME (As requested)
            // We use a date far in the past to capture everything
            $chartStart = Carbon::create(2000, 1, 1);
            $chartEnd = Carbon::now()->endOfDay();
        }

        // --- KPI CARDS (Defaults to Today for "Daily Snapshot") ---
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

        // --- CHARTS (Uses $chartStart / $chartEnd) ---

        // 1. Sales Trend (Line Chart)
        // Default to Last 7 Days if not filtered (showing "All Time" daily points is too messy)
        $trendStart = $isFiltered ? $startDate : Carbon::now()->subDays(6)->startOfDay();

        $rawChartData = Sale::select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('SUM(total_amount) as total')
        )
            ->whereBetween('created_at', [$trendStart, $chartEnd])
            ->groupBy('date')
            ->orderBy('date', 'ASC')
            ->get()
            ->keyBy('date');

        $chartData = [];
        $period = \Carbon\CarbonPeriod::create($trendStart, $chartEnd);
        foreach ($period as $date) {
            $dateKey = $date->format('Y-m-d');
            $chartData[] = [
                'date' => $date->format('M d'),
                'sales' => isset($rawChartData[$dateKey]) ? $rawChartData[$dateKey]->total / 100 : 0
            ];
        }

        // 2. Peak Hours (Uses Chart Range - All Time by default)
        $peakHoursData = Sale::select(DB::raw('HOUR(created_at) as hour'), DB::raw('COUNT(*) as count'))
            ->whereBetween('created_at', [$chartStart, $chartEnd])
            ->groupBy('hour')
            ->orderBy('hour')
            ->get()
            ->map(function ($item) {
                return [
                    'hour' => Carbon::createFromTime($item->hour)->format('g A'),
                    'count' => $item->count
                ];
            });

        // 3. Payment Split (Uses Chart Range - All Time by default)
        $paymentMethods = Sale::select('payment_method', DB::raw('count(*) as count'))
            ->whereBetween('created_at', [$chartStart, $chartEnd])
            ->groupBy('payment_method')
            ->get();

        // 4. Sales by Category (Uses Chart Range - All Time by default)
        $salesByCategory = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->whereBetween('sales.created_at', [$chartStart, $chartEnd])
            ->select('categories.name', DB::raw('SUM(sale_items.quantity) as value'))
            ->groupBy('categories.name')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->name ?? 'Uncategorized',
                    'value' => (int) $item->value
                ];
            });

        // --- LISTS (Uses Chart Range - All Time by default) ---
        $topProducts = DB::table('sale_items')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->whereBetween('sales.created_at', [$chartStart, $chartEnd])
            ->select('products.name', DB::raw('sum(sale_items.quantity) as sold'))
            ->groupBy('products.name')
            ->orderByDesc('sold')
            ->limit(5)
            ->get();

        // Recent Sales always shows actual latest
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
        $startDate = $request->start_date ? Carbon::parse($request->start_date)->startOfDay() : Carbon::create(2000, 1, 1);
        $endDate = $request->end_date ? Carbon::parse($request->end_date)->endOfDay() : Carbon::now()->endOfDay();

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

        $callback = function () use ($sales) {
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
