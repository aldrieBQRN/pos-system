import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { printZRead } from '@/Utils/printZRead';

export default function ShiftHistory({ auth }) {
    const [shifts, setShifts] = useState([]);
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Filters
    const [dateFilter, setDateFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        axios.get('/api/settings').then(res => setSettings(res.data));
    }, []);

    const fetchShifts = async (url = '/api/shifts') => {
        setLoading(true);
        try {
            const res = await axios.get(url, {
                params: {
                    date: dateFilter,
                    search: searchQuery
                }
            });
            setShifts(res.data.data);
            setLinks(res.data.links);
            setCurrentPage(res.data.current_page);
        } catch (error) {
            console.error("Error loading shifts", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            fetchShifts();
        }, 500);
        return () => clearTimeout(delayDebounce);
    }, [dateFilter, searchQuery]);

    // Helpers
    const formatCurrency = (amount) => `₱${Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
    const formatTime = (dateString) => dateString ? new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-';

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800">Shift Management</h2>}
        >
            <Head title="Shift History" />

            <div className="py-6 sm:py-12 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

                    {/* --- HEADER TITLE --- */}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Shift History</h1>
                        <p className="text-sm text-gray-500">Track register activity, shortages, and reprint reports.</p>
                    </div>

                    {/* --- RESPONSIVE TOOLBAR (White Box) --- */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">

                        {/* Search Bar (Flex Grow) */}
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                placeholder="Search Cashier Name..."
                                className="pl-10 pr-4 py-2.5 border-gray-300 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500 transition-shadow shadow-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Date Filter (Auto Width on Desktop, Full on Mobile) */}
                        <div className="w-full md:w-auto">
                            <input
                                type="date"
                                className="w-full md:w-48 py-2.5 px-3 border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-600 cursor-pointer"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* --- DESKTOP TABLE VIEW (Hidden on Mobile) --- */}
                    <div className="hidden md:block bg-white rounded-t-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4">Cashier</th>
                                    <th className="px-6 py-4">Date & Time</th>
                                    <th className="px-6 py-4 text-right">Starting</th>
                                    <th className="px-6 py-4 text-right">Sales</th>
                                    <th className="px-6 py-4 text-right">Actual</th>
                                    <th className="px-6 py-4 text-center">Difference</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan="8" className="p-8 text-center text-gray-400">Loading...</td></tr>
                                ) : shifts.length === 0 ? (
                                    <tr><td colSpan="8" className="p-8 text-center text-gray-400">No shifts found.</td></tr>
                                ) : (
                                    shifts.map((shift) => (
                                        <tr key={shift.id} className="hover:bg-blue-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-800">{shift.user?.name || 'Unknown'}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900">{formatDate(shift.start_time)}</div>
                                                <div className="text-xs text-gray-400">{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">{formatCurrency(shift.starting_cash)}</td>
                                            <td className="px-6 py-4 text-right text-green-600 font-bold">+{formatCurrency(shift.cash_sales)}</td>
                                            <td className="px-6 py-4 text-right font-bold text-blue-600">
                                                {shift.actual_cash ? formatCurrency(shift.actual_cash) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {shift.difference !== null ? (
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                                        Math.abs(Number(shift.difference)) < 1
                                                            ? 'bg-gray-100 text-gray-600 border-gray-200'
                                                            : Number(shift.difference) < 0
                                                                ? 'bg-red-50 text-red-700 border-red-200'
                                                                : 'bg-green-50 text-green-700 border-green-200'
                                                    }`}>
                                                        {Number(shift.difference) > 0 ? '+' : ''}{Number(shift.difference).toFixed(2)}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    shift.status === 'open' ? 'bg-green-100 text-green-600 animate-pulse' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {shift.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => printZRead(shift, settings)}
                                                    className="text-gray-400 hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-blue-50"
                                                    title="Reprint Report"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* --- MOBILE CARD VIEW (Visible only on Mobile) --- */}
                    <div className="md:hidden space-y-4">
                        {loading ? (
                            <div className="text-center text-gray-400 py-8">Loading...</div>
                        ) : shifts.length === 0 ? (
                            <div className="text-center text-gray-400 py-8">No shifts found.</div>
                        ) : (
                            shifts.map((shift) => (
                                <div key={shift.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-lg">{shift.user?.name || 'Unknown'}</h4>
                                            <p className="text-xs text-gray-500">
                                                {formatDate(shift.start_time)} • {formatTime(shift.start_time)}
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                                            shift.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {shift.status}
                                        </span>
                                    </div>

                                    <div className="border-t border-dashed border-gray-200"></div>

                                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-400 uppercase">Starting</span>
                                            <span className="font-medium text-gray-700">{formatCurrency(shift.starting_cash)}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs text-gray-400 uppercase">Sales</span>
                                            <span className="font-bold text-green-600">+{formatCurrency(shift.cash_sales)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-400 uppercase">Expected</span>
                                            <span className="font-bold text-gray-800">{formatCurrency(shift.expected_cash)}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs text-gray-400 uppercase">Actual</span>
                                            <span className="font-bold text-blue-600">
                                                {shift.actual_cash ? formatCurrency(shift.actual_cash) : '-'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                                        <div className={`text-xs font-bold px-2 py-1 rounded ${
                                            Math.abs(Number(shift.difference)) < 1
                                                ? 'bg-gray-50 text-gray-600'
                                                : Number(shift.difference) < 0
                                                    ? 'bg-red-50 text-red-700'
                                                    : 'bg-green-50 text-green-700'
                                        }`}>
                                            {shift.difference ? (Number(shift.difference) > 0 ? '+' : '') + Number(shift.difference).toFixed(2) : '-'}
                                        </div>

                                        <button
                                            onClick={() => printZRead(shift, settings)}
                                            className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                                            </svg>
                                            Print Report
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* --- PAGINATION --- */}
                    <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-gray-50 gap-4 rounded-b-xl">
                        <span className="text-sm text-gray-500">
                            Page <span className="font-bold">{currentPage}</span>
                        </span>
                        <div className="flex gap-1 flex-wrap justify-center">
                            {links.map((link, index) => (
                                <button
                                    key={index}
                                    disabled={!link.url || link.active}
                                    onClick={() => link.url && fetchShifts(link.url)}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    className={`px-3 py-1 rounded text-sm font-medium border transition-colors
                                        ${link.active
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                                        }
                                        ${!link.url && 'opacity-50 cursor-not-allowed'}`}
                                />
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}