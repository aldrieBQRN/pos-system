import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import {
    BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import Swal from 'sweetalert2';

export default function Dashboard() {
    const [stats, setStats] = useState({
        today_sales: 0,
        sales_growth: 0,
        today_profit: 0,
        today_orders: 0,
        average_order_value: 0,
        total_products: 0,
        low_stock: [],
        chart_data: [],
        peak_hours: [],
        payment_methods: [],
        sales_by_category: [],
        top_products: [],
        recent_sales: [],
        is_filtered: false
    });

    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [filters, setFilters] = useState({ start_date: '', end_date: '' });

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    const fetchStats = async (params = {}) => {
        setLoading(true);
        try {
            const response = await axios.get('/api/dashboard', { params });
            setStats(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Dashboard error:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handleFilterSubmit = (e) => {
        e.preventDefault();
        fetchStats(filters);
    };

    const handleClear = () => {
        setFilters({ start_date: '', end_date: '' });
        fetchStats({});
    };

    const getProcessedCategoryData = () => {
        const data = stats.sales_by_category;
        if (data.length <= 4) return data;
        const sortedData = [...data].sort((a, b) => b.value - a.value);
        const top3 = sortedData.slice(0, 3);
        const othersValue = sortedData.slice(3).reduce((sum, item) => sum + item.value, 0);
        return [...top3, { name: 'Others', value: othersValue }];
    };

    const categoryData = getProcessedCategoryData();

    const exportExcel = async () => {
        setIsExporting(true);
        try {
            const params = {
                all: true,
                start_date: filters.start_date,
                end_date: filters.end_date
            };

            const response = await axios.get('/api/transactions', { params });
            const allSales = response.data;

            if (!allSales || allSales.length === 0) {
                Swal.fire('No Data', 'No sales found for this period.', 'info');
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sales Report');

            worksheet.columns = [
                { header: 'Invoice #', key: 'invoice', width: 15 },
                { header: 'Date & Time', key: 'date', width: 20 },
                { header: 'Cashier', key: 'cashier', width: 15 },
                { header: 'Payment', key: 'method', width: 12 },
                { header: 'Status', key: 'status', width: 12 },
                { header: 'Total Amount', key: 'total', width: 15 },
            ];

            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
            headerRow.height = 25;

            allSales.forEach(sale => {
                const row = worksheet.addRow({
                    invoice: sale.invoice_number,
                    date: new Date(sale.created_at).toLocaleString(),
                    cashier: sale.cashier?.name || 'Unknown',
                    method: sale.payment_method.toUpperCase(),
                    status: sale.status === 'void' ? 'VOIDED' : 'COMPLETED',
                    total: sale.total_amount / 100
                });

                if (sale.status === 'void') {
                    row.font = { color: { argb: 'FFFF0000' } };
                }

                row.getCell('total').numFmt = '"₱"#,##0.00';
                row.getCell('invoice').alignment = { horizontal: 'center' };
                row.getCell('method').alignment = { horizontal: 'center' };
                row.getCell('status').alignment = { horizontal: 'center' };
            });

            worksheet.eachRow((row) => {
                row.eachCell((cell) => {
                    cell.border = { top: { style:'thin' }, left: { style:'thin' }, bottom: { style:'thin' }, right: { style:'thin' } };
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const filename = `Dashboard_Report_${filters.start_date || 'All'}_to_${filters.end_date || 'All'}.xlsx`;
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, filename);

            Swal.fire({ icon: 'success', title: 'Report Downloaded!', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });

        } catch (error) {
            console.error("Export Error:", error);
            Swal.fire('Error', 'Failed to export report.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    if (loading && !stats.today_sales) return (
        <AuthenticatedLayout>
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        </AuthenticatedLayout>
    );

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="py-6 sm:py-8 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

                    {/* --- FILTER & EXPORT TOOLBAR --- */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        {/* Layout Logic:
                            - flex-col: Stacked by default (Mobile)
                            - md:flex-row: Inline on Tablet/Desktop (768px+)
                            - This ensures they don't 'meet' and wrap awkwardly; they switch modes cleanly.
                        */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">

                            {/* Filter Form */}
                            <form onSubmit={handleFilterSubmit} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all flex-1 sm:flex-none">
                                        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">From</span>
                                        <input
                                            type="date"
                                            className="bg-transparent border-none p-0 text-sm w-full text-gray-700 focus:ring-0 cursor-pointer"
                                            value={filters.start_date}
                                            onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all flex-1 sm:flex-none">
                                        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">To</span>
                                        <input
                                            type="date"
                                            className="bg-transparent border-none p-0 text-sm w-full text-gray-700 focus:ring-0 cursor-pointer"
                                            value={filters.end_date}
                                            onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button
                                        type="submit"
                                        className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-all active:scale-95"
                                    >
                                        Filter
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleClear}
                                        className="flex-1 sm:flex-none bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-all active:scale-95"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </form>

                            {/* Export Button */}
                            {/* w-full on Mobile (<768px), w-auto on Desktop (>=768px) */}
                            <button
                                onClick={exportExcel}
                                disabled={isExporting}
                                className={`w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95 ${isExporting ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isExporting ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        Export Excel
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* --- KPI CARDS --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        <StatCard title={stats.is_filtered ? "Revenue (Filtered)" : "Today's Revenue"} value={`₱${stats.today_sales.toFixed(2)}`} trend={stats.sales_growth} color="blue"
                            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                        <StatCard title="Net Profit" value={`₱${stats.today_profit.toFixed(2)}`} subtext="Real earnings" color="green"
                            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
                        <StatCard title="Transactions" value={stats.today_orders} color="purple"
                            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} />
                        <StatCard title="Avg Order" value={`₱${stats.average_order_value.toFixed(2)}`} subtext="Per customer" color="orange"
                            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                    </div>

                    {/* --- MAIN CHARTS --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Sales Trend */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-700 mb-4">Sales Trend {stats.is_filtered ? "" : "(Last 7 Days)"}</h3>
                            <div className="h-72 w-full">
                                {stats.chart_data.length === 0 ? (
                                    <NoData />
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats.chart_data}>
                                            <defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient></defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} />
                                            <YAxis axisLine={false} tickLine={false} />
                                            <Tooltip />
                                            <Area type="monotone" dataKey="sales" stroke="#3B82F6" fillOpacity={1} fill="url(#colorSales)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Peak Hours */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-700 mb-4">Peak Hours {stats.is_filtered ? "" : "(All Time)"}</h3>
                            <div className="h-72 w-full">
                                {stats.peak_hours.length === 0 ? (
                                    <NoData />
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.peak_hours} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="hour" type="category" width={50} style={{fontSize: '12px'}} />
                                            <Tooltip />
                                            <Bar dataKey="count" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- 3-COLUMN BREAKDOWN --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Payment Split */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                            <h3 className="text-lg font-bold text-gray-700 mb-2 w-full">Payment Split {stats.is_filtered ? "" : "(All Time)"}</h3>
                            <div className="h-64 w-full flex items-center justify-center">
                                {stats.payment_methods.length === 0 ? (
                                    <NoData />
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={stats.payment_methods} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="count" nameKey="payment_method">
                                                {stats.payment_methods.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Sales By Category */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                            <h3 className="text-lg font-bold text-gray-700 mb-2 w-full">Category Sales {stats.is_filtered ? "" : "(All Time)"}</h3>
                            <div className="h-64 w-full flex items-center justify-center">
                                {categoryData.length === 0 ? (
                                    <NoData />
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={categoryData} innerRadius={0} outerRadius={80} dataKey="value" nameKey="name">
                                                {categoryData.map((entry, index) => <Cell key={`c-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Best Sellers */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-700 mb-4">Best Sellers {stats.is_filtered ? "" : "(All Time)"}</h3>
                            <div className="overflow-y-auto h-64">
                                {stats.top_products.length === 0 ? (
                                    <NoData />
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-gray-500 sticky top-0">
                                            <tr><th className="p-2">Product</th><th className="p-2 text-right">Sold</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {stats.top_products.map((item, idx) => (
                                                <tr key={idx}><td className="p-2 font-medium text-gray-600">{item.name}</td><td className="p-2 text-right font-bold text-blue-600">{item.sold}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- ROW 4: LOW STOCK & RECENT TRANSACTIONS --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Low Stock */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-orange-400">
                            <div className="flex items-center gap-2 mb-4">
                                <h3 className="text-lg font-bold text-gray-700">Low Stock Alert</h3>
                                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <ul className="space-y-3">
                                {stats.low_stock.length === 0 ? <li className="text-green-500 text-sm">Stock levels healthy!</li> : stats.low_stock.map((item) => (
                                    <li key={item.id} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">{item.name}</span>
                                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-bold">{item.stock_quantity} left</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Recent Transactions */}
                        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100">
                            <div className="px-6 py-4 border-b border-gray-100"><h3 className="text-lg font-bold text-gray-700">Recent Transactions</h3></div>

                            {/* Desktop View */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-left text-sm text-gray-500">
                                    <thead className="bg-gray-50 uppercase text-xs">
                                        <tr><th className="px-6 py-3">Invoice</th><th className="px-6 py-3">Date</th><th className="px-6 py-3 text-right">Total</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {stats.recent_sales.map((sale) => (
                                            <tr key={sale.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-bold text-blue-600 font-mono">{sale.invoice_number}</td>
                                                <td className="px-6 py-4">{new Date(sale.created_at).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 font-bold text-green-600 text-right">₱{(sale.total_amount / 100).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile View (Cards) */}
                            <div className="sm:hidden divide-y divide-gray-100">
                                {stats.recent_sales.map((sale) => (
                                    <div key={sale.id} className="p-4 flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-blue-600 font-mono">{sale.invoice_number}</div>
                                            <div className="text-xs text-gray-400 mt-1">{new Date(sale.created_at).toLocaleString()}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-green-600 text-lg">₱{(sale.total_amount / 100).toFixed(2)}</div>
                                            <div className="text-xs text-gray-500 uppercase">{sale.payment_method}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}

// Helper: Empty State
function NoData() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-10 h-10 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="text-sm font-medium opacity-60">No Data Available</p>
        </div>
    );
}

// Helper: Stat Card
function StatCard({ title, value, icon, color, subtext, trend }) {
    const bgColors = { blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600', purple: 'bg-purple-50 text-purple-600', orange: 'bg-orange-50 text-orange-600' };
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
                <div className="text-gray-500 font-medium text-xs uppercase tracking-wide">{title}</div>
                <div className="text-2xl font-bold text-gray-800 mt-1">{value}</div>
                {trend !== undefined && <div className={`text-xs font-bold mt-1 flex items-center ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs yesterday</div>}
                {subtext && <div className="text-xs text-gray-400 mt-1">{subtext}</div>}
            </div>
            <div className={`p-3 rounded-xl ${bgColors[color]}`}>{icon}</div>
        </div>
    );
}