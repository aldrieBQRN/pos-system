import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
    PieChart, Pie, Cell, Legend 
} from 'recharts';

export default function Dashboard() { 
    const [stats, setStats] = useState({
        today_sales: 0,
        today_orders: 0,
        total_products: 0,
        low_stock: [],
        chart_data: [],
        category_data: [],
        top_products: [],
        recent_sales: []
    });
    const [loading, setLoading] = useState(true);

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axios.get('/api/dashboard');
                
                // FIX 1: Convert string values ("15") to numbers (15) for the chart
                const formattedCategoryData = response.data.category_data.map(item => ({
                    ...item,
                    value: parseInt(item.value) 
                }));

                setStats({
                    ...response.data,
                    category_data: formattedCategoryData
                });
                
                setLoading(false);
            } catch (error) {
                console.error("Dashboard error:", error);
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <AuthenticatedLayout>
                 <div className="flex h-screen items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout> 
            <Head title="Dashboard" />

            <div className="py-8 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    
                    {/* 1. KEY METRICS ROW */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-4 sm:px-0">
                        <StatCard 
                            title="Today's Sales" 
                            value={`$${stats.today_sales.toFixed(2)}`} 
                            color="blue" 
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-blue-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            }
                        />
                        <StatCard 
                            title="Transactions" 
                            value={stats.today_orders} 
                            color="green" 
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-green-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                            }
                        />
                        <StatCard 
                            title="Total Products" 
                            value={stats.total_products} 
                            color="purple" 
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-purple-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                                </svg>
                            }
                        />
                        <StatCard 
                            title="Low Stock" 
                            value={stats.low_stock.length} 
                            color="red" 
                            alert={stats.low_stock.length > 0}
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-8 h-8 ${stats.low_stock.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                            }
                        />
                    </div>

                    {/* 2. CHARTS ROW */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 sm:px-0">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-500"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                                Weekly Sales Trend
                            </h3>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.chart_data}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} prefix="$" />
                                        <Tooltip cursor={{fill: '#f3f4f6'}} />
                                        <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                            <h3 className="text-lg font-bold text-gray-700 mb-2 w-full text-left flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-purple-500"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>
                                Sales by Category
                            </h3>
                            <div className="h-72 w-full flex items-center justify-center">
                                {stats.category_data.length === 0 ? (
                                    <div className="text-center text-gray-400">
                                        <div className="text-4xl mb-2">📉</div>
                                        <p>No sales data yet.</p>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={stats.category_data}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={90}
                                                paddingAngle={5}
                                                dataKey="value"
                                                nameKey="category" // FIX 2: Added nameKey so it knows 'Bakery' is the label
                                            >
                                                {stats.category_data.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 3. DATA LISTS ROW */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 sm:px-0">
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-yellow-500"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-6.75a1.125 1.125 0 01-1.125-1.125v-9.375m.906 9a2.25 2.25 0 002.625 2.625h2.75a2.25 2.25 0 002.625-2.625m-6.152-2.25h8.183a6 6 0 00-3.804-5.199L15 2.25l-3 3.097-3-3.097-1.38 2.376a6 6 0 00-3.804 5.199z" /></svg>
                                Top Selling Products
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                        <tr>
                                            <th className="p-3 rounded-l-lg">Product</th>
                                            <th className="p-3">Price</th>
                                            <th className="p-3 text-right rounded-r-lg">Sold</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {stats.top_products.length === 0 ? (
                                            <tr><td colSpan="3" className="p-4 text-center text-gray-400">No sales yet</td></tr>
                                        ) : (
                                            stats.top_products.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-3 font-medium text-gray-800">{item.name}</td>
                                                    <td className="p-3 text-gray-500">${(item.price / 100).toFixed(2)}</td>
                                                    <td className="p-3 text-right font-bold text-blue-600">{item.sold}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Recent Activity
                            </h3>
                            <div className="space-y-4">
                                {stats.recent_sales.length === 0 ? (
                                    <div className="text-gray-400 text-center text-sm py-4">No recent activity</div>
                                ) : (
                                    stats.recent_sales.map((sale) => (
                                        <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
                                            <div>
                                                <div className="text-sm font-bold text-gray-800">{sale.invoice_number}</div>
                                                <div className="text-xs text-gray-500">{new Date(sale.created_at).toLocaleTimeString()}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-green-600">${(sale.total_amount / 100).toFixed(2)}</div>
                                                <div className="text-xs text-gray-500 capitalize">{sale.payment_method}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="mt-4 text-center">
                                <a href="/transactions" className="text-sm text-blue-600 hover:underline font-medium">View All History →</a>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function StatCard({ title, value, icon, color, alert = false }) {
    const bgColors = {
        blue: 'bg-blue-50',
        green: 'bg-green-50',
        purple: 'bg-purple-50',
        red: 'bg-red-50'
    };

    return (
        <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between
            ${alert ? 'ring-2 ring-red-100' : ''}`}>
            <div>
                <div className="text-gray-500 font-medium text-sm uppercase tracking-wide">{title}</div>
                <div className={`text-3xl font-bold mt-1 ${alert ? 'text-red-600' : 'text-gray-800'}`}>
                    {value}
                </div>
            </div>
            <div className={`p-3 rounded-full ${bgColors[color] || 'bg-gray-50'}`}>
                {icon}
            </div>
        </div>
    );
}