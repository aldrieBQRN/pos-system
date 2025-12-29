import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// REMOVED: { auth } prop. We don't need it anymore.
export default function Dashboard() { 
    const [stats, setStats] = useState({
        today_sales: 0,
        today_orders: 0,
        total_products: 0,
        low_stock: [],
        chart_data: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axios.get('/api/dashboard');
                setStats(response.data);
                setLoading(false);
            } catch (error) {
                console.error("Dashboard error:", error);
                setLoading(false); // Stop loading even on error
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <AuthenticatedLayout>
                 <div className="flex h-screen items-center justify-center">
                    <div className="text-xl text-gray-500">Loading Business Data...</div>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        // REMOVED: user={auth.user} prop. The Layout finds it automatically.
        <AuthenticatedLayout> 
            <Head title="Dashboard" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-8 px-4 sm:px-0">Business Overview</h1>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 px-4 sm:px-0">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-500">
                            <div className="text-gray-500 font-medium">Today's Sales</div>
                            <div className="text-4xl font-bold text-gray-800 mt-2">${stats.today_sales.toFixed(2)}</div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-green-500">
                            <div className="text-gray-500 font-medium">Transactions Today</div>
                            <div className="text-4xl font-bold text-gray-800 mt-2">{stats.today_orders}</div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-purple-500">
                            <div className="text-gray-500 font-medium">Total Products</div>
                            <div className="text-4xl font-bold text-gray-800 mt-2">{stats.total_products}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 sm:px-0">
                        {/* Chart */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm">
                            <h3 className="text-lg font-bold text-gray-700 mb-4">Sales - Last 7 Days</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.chart_data}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" />
                                        <YAxis prefix="$" />
                                        <Tooltip formatter={(value) => [`$${value}`, 'Sales']} />
                                        <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Low Stock */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-red-600">⚠️ Low Stock Alerts</h3>
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold">{stats.low_stock.length} Items</span>
                            </div>
                            {stats.low_stock.length === 0 ? (
                                <div className="text-gray-400 text-center py-10">All stocked up!</div>
                            ) : (
                                <div className="space-y-4">
                                    {stats.low_stock.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                                            <div>
                                                <div className="font-semibold text-gray-800">{item.name}</div>
                                                <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                                            </div>
                                            <div className="text-red-700 font-bold text-lg">{item.stock_quantity}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <a href="/inventory" className="block text-center text-blue-600 text-sm font-semibold mt-6 hover:underline">Go to Inventory →</a>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}