import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { printReceipt } from '@/Utils/printReceipt';
import Swal from 'sweetalert2';

export default function Transactions({ auth }) {
    const [transactions, setTransactions] = useState([]);
    const [links, setLinks] = useState([]);
    const [summary, setSummary] = useState({ total_sales: 0, transaction_count: 0, cash_sales: 0, gcash_sales: 0 });
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchFilter, setSearchFilter] = useState('');
    
    const [showDetails, setShowDetails] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);

    useEffect(() => {
        fetchTransactions();
        fetchSettings();
    }, [startDate, endDate]); 

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            fetchTransactions();
        }, 500);
        return () => clearTimeout(delayDebounce);
    }, [searchFilter]);

    const fetchTransactions = async (url = '/api/transactions') => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (searchFilter) params.append('search', searchFilter);

            const endpoint = url.includes('?') ? `${url}&${params.toString()}` : `${url}?${params.toString()}`;
            const response = await axios.get(endpoint);
            
            setTransactions(response.data.sales.data);
            setLinks(response.data.sales.links);
            setSummary(response.data.summary);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try { const res = await axios.get('/api/settings'); setSettings(res.data); } catch (e) {}
    };

    const exportCSV = () => {
        if (transactions.length === 0) return;
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Invoice,Date,Cashier,Method,Status,Total,Items\n";

        transactions.forEach(t => {
            const items = t.items.map(i => `${i.quantity}x ${i.product?.name || 'Item'}`).join('; ');
            const status = t.status === 'void' ? 'VOID' : 'Completed';
            const row = `${t.invoice_number},${new Date(t.created_at).toLocaleDateString()},${t.cashier?.name},${t.payment_method},${status},${(t.total_amount / 100).toFixed(2)},"${items}"`;
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `sales_report_${startDate || 'all'}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    const handleVoid = async (sale) => {
        const result = await Swal.fire({
            title: 'Void Transaction?',
            text: `This will cancel Invoice ${sale.invoice_number} and return items to inventory.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, Void it!'
        });

        if (result.isConfirmed) {
            try {
                await axios.post(`/api/transactions/${sale.id}/void`);
                Swal.fire('Voided!', 'Transaction has been voided.', 'success');
                fetchTransactions(); 
            } catch (error) {
                Swal.fire('Error', error.response?.data?.message || 'Failed to void transaction.', 'error');
            }
        }
    };

    const handleReprint = (sale) => {
        let subtotal = sale.total_amount;
        let discount = 0;
        
        if (sale.is_senior) {
            const vatExempt = sale.total_amount / 0.80; 
            discount = vatExempt * 0.20;
            subtotal = vatExempt * 1.12; 
        }

        const finalCashGiven = sale.cash_given > 0 ? sale.cash_given : sale.total_amount;
        const finalChange = sale.cash_given > 0 ? sale.change : 0;

        printReceipt({
            invoice_number: sale.invoice_number,
            cashier_id: sale.cashier?.name || 'Unknown',
            store_name: settings?.store_name || "My Store",
            store_address: settings?.store_address || "",
            store_phone: settings?.store_phone || "",
            items: sale.items.map(i => ({ name: i.product?.name || 'Item', quantity: i.quantity, price: i.unit_price })),
            is_senior: Boolean(sale.is_senior),
            subtotal: subtotal,
            discount: discount,
            total: sale.total_amount,
            payment_method: sale.payment_method,
            cash_given: finalCashGiven, 
            change: finalChange,
            reference: sale.payment_reference
        });
    };

    const handleViewDetails = (sale) => {
        setSelectedSale(sale);
        setShowDetails(true);
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800">Transactions</h2>}>
            <Head title="Sales History" />

            <div className="py-12 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 relative overflow-hidden">
                            <div className="text-gray-500 text-sm font-medium uppercase">Total Sales</div>
                            <div className="text-3xl font-bold text-blue-600 mt-2">${(summary.total_sales / 100).toFixed(2)}</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-100 relative overflow-hidden">
                            <div className="text-gray-500 text-sm font-medium uppercase">Transactions</div>
                            <div className="text-3xl font-bold text-purple-600 mt-2">{summary.transaction_count}</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100 relative overflow-hidden">
                            <div className="text-gray-500 text-sm font-medium uppercase">Payment Split</div>
                            <div className="mt-2 text-sm space-y-1">
                                <div className="flex justify-between"><span>Cash:</span> <span className="font-bold text-green-600">${(summary.cash_sales / 100).toFixed(2)}</span></div>
                                <div className="flex justify-between"><span>GCash:</span> <span className="font-bold text-blue-500">${(summary.gcash_sales / 100).toFixed(2)}</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
                        <div className="flex flex-col sm:flex-row gap-4 w-full">
                            <div className="relative flex-1">
                                <input 
                                    type="text" 
                                    placeholder="Search Invoice or Cashier..." 
                                    className="pl-10 pr-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full"
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                />
                                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <div className="flex gap-2 items-center">
                                <input type="date" className="border rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" value={startDate} onChange={(e) => setStartDate(e.target.value)} title="Start Date" />
                                <span className="text-gray-400">-</span>
                                <input type="date" className="border rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" value={endDate} onChange={(e) => setEndDate(e.target.value)} title="End Date" />
                            </div>
                        </div>
                        <button onClick={exportCSV} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 flex items-center gap-2 shadow-sm whitespace-nowrap">Export CSV</button>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b text-gray-600 uppercase text-xs">
                                    <tr>
                                        <th className="p-4">Invoice / Status</th>
                                        <th className="p-4">Date & Time</th>
                                        <th className="p-4">Cashier</th>
                                        <th className="p-4">Payment</th>
                                        <th className="p-4 text-right">Total</th>
                                        <th className="p-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr><td colSpan="6" className="p-10 text-center text-gray-400">Loading records...</td></tr>
                                    ) : transactions.length === 0 ? (
                                        <tr><td colSpan="6" className="p-10 text-center text-gray-400">No transactions found.</td></tr>
                                    ) : (
                                        transactions.map((sale) => (
                                            <tr key={sale.id} className={`transition-colors ${sale.status === 'void' ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                                                
                                                {/* NEW: Invoice + Status Badge */}
                                                <td className="p-4">
                                                    <div className={`font-mono font-bold ${sale.status === 'void' ? 'text-red-500 line-through' : 'text-blue-600'}`}>
                                                        {sale.invoice_number}
                                                    </div>
                                                    <div className="mt-1">
                                                        {sale.status === 'void' ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wide">
                                                                VOIDED
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-wide">
                                                                COMPLETED
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className={`p-4 text-sm ${sale.status === 'void' ? 'text-red-400' : 'text-gray-500'}`}>
                                                    {new Date(sale.created_at).toLocaleString()}
                                                </td>
                                                <td className="p-4 font-medium text-gray-700">{sale.cashier?.name || 'Unknown'}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${sale.payment_method === 'gcash' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                                        {sale.payment_method}
                                                    </span>
                                                    {sale.is_senior && <span className="ml-2 bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">PWD/Senior</span>}
                                                </td>
                                                <td className={`p-4 text-right font-bold ${sale.status === 'void' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                                    ${(sale.total_amount / 100).toFixed(2)}
                                                </td>
                                                <td className="p-4 flex justify-center gap-2">
                                                    <button onClick={() => handleViewDetails(sale)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="View Items">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                    </button>
                                                    
                                                    {sale.status !== 'void' && (
                                                        <>
                                                            <button onClick={() => handleReprint(sale)} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors" title="Reprint">
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>
                                                            </button>
                                                            <button onClick={() => handleVoid(sale)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Void Transaction">
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                                            </button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
                            <span className="text-sm text-gray-500">Page <span className="font-bold">{transactions.length > 0 ? 1 : 0}</span></span>
                            <div className="flex gap-1">
                                {links.map((link, index) => (
                                    <button key={index} disabled={!link.url || link.active} onClick={() => link.url && fetchTransactions(link.url)} dangerouslySetInnerHTML={{ __html: link.label }} className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${link.active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 hover:bg-gray-100'} ${!link.url && 'opacity-50 cursor-not-allowed'}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* DETAILS MODAL */}
            {showDetails && selectedSale && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden m-4">
                        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Transaction Details</h3>
                                <div className="text-xs text-blue-600 font-mono mt-1">{selectedSale.invoice_number}</div>
                                {selectedSale.status === 'void' && <span className="text-[10px] font-bold text-red-600 uppercase bg-red-100 px-2 py-0.5 rounded mt-1 inline-block">VOIDED</span>}
                            </div>
                            <button onClick={() => setShowDetails(false)} className="text-gray-400 hover:text-red-500 text-2xl">&times;</button>
                        </div>
                        <div className="p-6 max-h-[50vh] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="text-gray-500 border-b">
                                    <tr><th className="text-left pb-2">Item</th><th className="text-center pb-2">Qty</th><th className="text-right pb-2">Total</th></tr>
                                </thead>
                                <tbody className="divide-y">
                                    {selectedSale.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="py-3">
                                                <div className="font-bold text-gray-800">{item.product?.name || 'Item'}</div>
                                                <div className="text-xs text-gray-500">${(item.unit_price / 100).toFixed(2)} each</div>
                                            </td>
                                            <td className="py-3 text-center font-bold text-gray-600">x{item.quantity}</td>
                                            <td className="py-3 text-right font-bold">${((item.unit_price * item.quantity) / 100).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-gray-50 px-6 py-3 border-t text-sm border-gray-200">
                            <div className="flex justify-between mb-1">
                                <span className="text-gray-500">Payment Method:</span>
                                <span className="font-bold uppercase text-gray-700">{selectedSale.payment_method}</span>
                            </div>
                            {selectedSale.payment_method === 'gcash' && (
                                <div className="flex justify-between mb-1">
                                    <span className="text-gray-500">Reference No:</span>
                                    <span className="font-mono font-bold text-blue-600">{selectedSale.payment_reference || 'N/A'}</span>
                                </div>
                            )}
                            {selectedSale.payment_method === 'cash' && selectedSale.cash_given > 0 && (
                                <>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-gray-500">Cash Given:</span>
                                        <span className="font-bold text-gray-700">${(selectedSale.cash_given / 100).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Change:</span>
                                        <span className="font-bold text-green-600">${(selectedSale.change / 100).toFixed(2)}</span>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="bg-gray-50 px-6 py-4 flex justify-end">
                            <button onClick={() => setShowDetails(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}