import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { printReceipt } from '@/Utils/printReceipt'; // Reuse your print logic!

export default function Transactions({ auth }) {
    const [transactions, setTransactions] = useState([]);
    const [links, setLinks] = useState([]); // For pagination
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState('');

    useEffect(() => {
        fetchTransactions();
    }, [dateFilter]);

    const fetchTransactions = async (url = '/api/transactions') => {
        setLoading(true);
        try {
            // Append date filter if exists
            const endpoint = dateFilter ? `${url}?date=${dateFilter}` : url;
            const response = await axios.get(endpoint);
            setTransactions(response.data.data);
            setLinks(response.data.links);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Prepare data for the print utility
    const handleReprint = (sale) => {
        const receiptData = {
            invoice_number: sale.invoice_number,
            cashier_id: sale.cashier?.name || 'Unknown',
            items: sale.items.map(item => ({
                name: item.product?.name || 'Deleted Product',
                quantity: item.quantity,
                price: item.unit_price
            })),
            total: sale.total_amount,
            payment_method: sale.payment_method,
            cash_given: 0, // We assume 0 for reprints as we don't store cash given in 'sales' table yet
            change: 0,
            reference: sale.payment_reference
        };
        printReceipt(receiptData);
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Transaction History</h2>}
        >
            <Head title="Transactions" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    
                    {/* Filters */}
                    <div className="flex justify-between items-center mb-6 px-4 sm:px-0">
                        <h1 className="text-3xl font-bold text-gray-800">Sales History</h1>
                        <input 
                            type="date" 
                            className="border rounded-lg px-4 py-2"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        />
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-600">Invoice</th>
                                    <th className="p-4 font-semibold text-gray-600">Date & Time</th>
                                    <th className="p-4 font-semibold text-gray-600">Cashier</th>
                                    <th className="p-4 font-semibold text-gray-600">Payment</th>
                                    <th className="p-4 font-semibold text-gray-600">Total</th>
                                    <th className="p-4 font-semibold text-gray-600 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="p-10 text-center text-gray-500">Loading...</td>
                                    </tr>
                                ) : transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-10 text-center text-gray-500">No transactions found.</td>
                                    </tr>
                                ) : (
                                    transactions.map((sale) => (
                                        <tr key={sale.id} className="border-b hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-mono text-blue-600 font-bold">{sale.invoice_number}</td>
                                            <td className="p-4 text-gray-600">
                                                {new Date(sale.created_at).toLocaleString()}
                                            </td>
                                            <td className="p-4 text-gray-800">{sale.cashier?.name || 'N/A'}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase
                                                    ${sale.payment_method === 'gcash' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                    {sale.payment_method}
                                                </span>
                                            </td>
                                            <td className="p-4 font-bold text-gray-900">${(sale.total_amount / 100).toFixed(2)}</td>
                                            <td className="p-4 text-center">
                                                <button 
                                                    onClick={() => handleReprint(sale)}
                                                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-medium border"
                                                >
                                                    🖨️ Reprint
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        
                        {/* Simple Pagination */}
                        <div className="p-4 flex gap-2 justify-center">
                            {links.map((link, index) => (
                                <button
                                    key={index}
                                    disabled={!link.url || link.active}
                                    onClick={() => fetchTransactions(link.url)}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    className={`px-3 py-1 rounded border ${
                                        link.active ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                                    } ${!link.url && 'opacity-50 cursor-not-allowed'}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}