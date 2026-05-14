import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import Swal from 'sweetalert2';
import ExcelJS from 'exceljs';
import saveAs from 'file-saver';

// --- PERSISTENT SESSION CACHE ---
// Remembers the bluetooth printer until the page is refreshed to skip the selection popup
let cachedBluetoothDevice = null;

// --- HELPER: ENCODE TEXT FOR PRINTER ---
const encode = (text) => new TextEncoder().encode(text);
const formatCurrencyPH = (amount) => parseFloat(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Transactions({ auth }) {
    const [transactions, setTransactions] = useState([]);
    const [links, setLinks] = useState([]);
    const [summary, setSummary] = useState({ total_sales: 0, transaction_count: 0, cash_sales: 0, gcash_sales: 0 });
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    // Export Loading State
    const [isExporting, setIsExporting] = useState(false);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchFilter, setSearchFilter] = useState('');

    const [showDetails, setShowDetails] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);

    // ==========================================
    // PRINTER STATE & LOGIC
    // ==========================================
    const [usbDevice, setUsbDevice] = useState(null);
    const [isMobile, setIsMobile] = useState(/Android|iPhone|iPad/i.test(navigator.userAgent));

    // Auto-Connect Printer on Load (PC Only)
    useEffect(() => {
        if (isMobile) return;
        const autoConnect = async () => {
            try {
                const devices = await navigator.usb.getDevices();
                if (devices.length > 0) {
                    const device = devices[0];
                    await device.open();
                    await device.selectConfiguration(1);
                    await device.claimInterface(0);
                    setUsbDevice(device);
                }
            } catch (err) {
                console.log("Auto-connect failed:", err);
            }
        };
        autoConnect();
    }, [isMobile]);

    // Manual Connect Printer (Button Click)
    const connectUsb = async () => {
        if (isMobile) return;
        try {
            const device = await navigator.usb.requestDevice({ filters: [] });
            await device.open();
            await device.selectConfiguration(1);
            await device.claimInterface(0);
            setUsbDevice(device);
            Swal.fire({ icon: 'success', title: 'Printer Connected', timer: 1500, showConfirmButton: false });
        } catch (error) {
            Swal.fire('Connection Failed', error.message, 'error');
        }
    };

    const generateReceiptCommands = (trx) => {
        const padEnd = (str, len) => str.toString().padEnd(len, ' ');
        const padStart = (str, len) => str.toString().padStart(len, ' ');
        const separator = "-".repeat(32) + "\n";
        const fmt = (cents) => (cents / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 });

        const storeName = settings?.store_name || "Smart POS";
        const storeAddress = settings?.store_address || "";
        const storePhone = settings?.store_phone || "";

        const commands = [
            0x1B, 0x40,       // Init
            0x1B, 0x70, 0x00, 0x19, 0xFA, // Kick Drawer

            // HEADER
            0x1B, 0x61, 0x01, // Center
            0x1B, 0x45, 0x01, // Bold On
            ...encode(storeName.toUpperCase() + "\n"),
            0x1B, 0x45, 0x00, // Bold Off
            ...(storeAddress ? encode(storeAddress + "\n") : []),
            ...(storePhone ? encode("Tel: " + storePhone + "\n") : []),
            ...encode(separator),

            // TRX INFO
            0x1B, 0x61, 0x00, // Left
            ...encode(padEnd("Invoice:", 10) + (trx.invoice_number || trx.transaction_code) + " (REPRINT)\n"),
            ...encode(padEnd("Date:", 10) + new Date(trx.created_at).toLocaleString() + "\n"),
            ...encode(padEnd("Cashier:", 10) + (trx.cashier?.name || 'Unknown') + "\n"),
            ...encode(separator),
        ];

        // ITEMS
        trx.items.forEach(item => {
            const name = (item.product?.name || 'Item').substring(0, 18);
            const qtyLine = `${item.quantity} x ${name}`;
            const lineTotal = fmt(item.quantity * item.unit_price);
            const line = padEnd(qtyLine, 21) + padStart(lineTotal, 11) + "\n";
            commands.push(...encode(line));
        });

        // SENIOR/PWD DISCOUNT CALCULATIONS
        if (trx.is_senior) {
            const subtotal = trx.total_amount + (trx.discount || 0);
            commands.push(
                ...encode(separator),
                ...encode(padEnd("Subtotal (VAT Inc):", 20) + padStart(fmt(subtotal), 12) + "\n"),
                ...encode(padEnd("VAT Exempt Sales:", 20) + padStart(fmt(subtotal / 1.12), 12) + "\n"),
                ...encode(padEnd("Less: 20% Senior/PWD:", 20) + padStart("-" + fmt(trx.discount || 0), 12) + "\n")
            );
        }

        commands.push(...encode(separator));

        // TOTAL
        commands.push(
            0x1B, 0x45, 0x01, // Bold On
            ...encode(padEnd("TOTAL", 15) + padStart("P" + fmt(trx.total_amount), 17) + "\n"),
            0x1B, 0x45, 0x00  // Bold Off
        );

        // PAYMENT INFO
        const finalCashGiven = (trx.cash_given > 0 ? trx.cash_given : trx.total_amount);
        const finalChange = (trx.cash_given > 0 ? trx.change : 0);

        if (trx.payment_method === 'cash') {
            commands.push(
                ...encode(padEnd("Cash Given:", 20) + padStart(fmt(finalCashGiven), 12) + "\n"),
                ...encode(padEnd("Change:", 20) + padStart(fmt(finalChange), 12) + "\n")
            );
        } else {
            commands.push(
                ...encode(padEnd("Payment:", 15) + padStart(trx.payment_method.toUpperCase(), 17) + "\n"),
                ...(trx.payment_reference ? encode(padEnd("Ref:", 10) + trx.payment_reference + "\n") : [])
            );
        }

        // FOOTER
        commands.push(
            0x0A,
            0x1B, 0x61, 0x01, // Center
            ...encode(separator),
            ...encode("Thank you for your purchase!\n"),
            ...encode("Please come again.\n"),
            0x0A, 0x0A, 0x0A, // Feed 3
            0x1D, 0x56, 0x41  // Cut Paper
        );

        return new Uint8Array(commands);
    };

    // --- REPRINT ACTION ---
    const handleReprint = async (sale) => {
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });

        try {
            Toast.fire({ icon: 'info', title: 'Preparing Reprint...' });
            const commands = generateReceiptCommands(sale);

            // 👉 MOBILE/TABLET DIRECT BLUETOOTH (Watermark-Free)
            if (isMobile) {
                let device = cachedBluetoothDevice;

                if (!device || !device.gatt.connected) {
                    Toast.fire({ icon: 'info', title: 'Select Bluetooth Printer...' });
                    device = await navigator.bluetooth.requestDevice({
                        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
                        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
                    });
                    cachedBluetoothDevice = device;
                }

                if (!device.gatt.connected) {
                    await device.gatt.connect();
                }

                const service = await device.gatt.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
                const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

                // Send in chunks (Standard for Bluetooth)
                const chunkSize = 20;
                for (let i = 0; i < commands.length; i += chunkSize) {
                    await characteristic.writeValue(commands.slice(i, i + chunkSize));
                }

                Toast.fire({ icon: 'success', title: 'Reprinted Successfully!' });
                return;
            }

            // 👉 PC USB LOGIC
            if (!usbDevice) {
                Swal.fire({
                    title: 'No Printer Connected',
                    text: 'Please click the "Connect Printer" button at the top first.',
                    icon: 'warning',
                    confirmButtonColor: '#3085d6'
                });
                return;
            }

            const endpoint = usbDevice.configuration.interfaces[0].alternate.endpoints.find(e => e.direction === 'out');
            await usbDevice.transferOut(endpoint.endpointNumber, commands);
            Toast.fire({ icon: 'success', title: 'Reprinted Successfully!' });

        } catch (err) {
            console.error(err);
            Swal.fire("Print Failed", err.message || "An error occurred while printing.", "error");
        }
    };
    // ==========================================

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

    // --- PROFESSIONAL EXCEL EXPORT ---
    const exportExcel = async () => {
        setIsExporting(true);
        try {
            const params = { all: true };
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;
            if (searchFilter) params.search = searchFilter;

            const response = await axios.get('/api/transactions', { params });
            const allSales = response.data;

            if (!allSales || allSales.length === 0) {
                Swal.fire('No Data', 'No transactions found to export.', 'info');
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
                { header: 'Items Sold', key: 'items', width: 40 },
                { header: 'Total Amount', key: 'total', width: 15 },
            ];

            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
            headerRow.height = 25;

            allSales.forEach(sale => {
                const itemsList = sale.items.map(i => `${i.quantity}x ${i.product?.name || 'Item'}`).join(', ');

                const row = worksheet.addRow({
                    invoice: sale.invoice_number,
                    date: new Date(sale.created_at).toLocaleString(),
                    cashier: sale.cashier?.name || 'Unknown',
                    method: sale.payment_method.toUpperCase(),
                    status: sale.status === 'void' ? 'VOIDED' : 'COMPLETED',
                    items: itemsList,
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
            const filename = `Sales_Report_${startDate || 'All'}_to_${endDate || 'All'}.xlsx`;
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, filename);

            Swal.fire({ icon: 'success', title: 'Report Downloaded!', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });

        } catch (error) {
            console.error("Export Error:", error);
            Swal.fire('Error', 'Failed to export sales report.', 'error');
        } finally {
            setIsExporting(false);
        }
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

    const handleViewDetails = (sale) => {
        setSelectedSale(sale);
        setShowDetails(true);
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800">Transactions</h2>}>
            <Head title="Sales History" />

            <div className="py-6 sm:py-12 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
                            <div className="text-gray-500 text-sm font-medium uppercase">Total Sales</div>
                            <div className="text-3xl font-bold text-blue-600 mt-2">₱{(summary.total_sales / 100).toFixed(2)}</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-100">
                            <div className="text-gray-500 text-sm font-medium uppercase">Transactions</div>
                            <div className="text-3xl font-bold text-purple-600 mt-2">{summary.transaction_count}</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100">
                            <div className="text-gray-500 text-sm font-medium uppercase">Payment Split</div>
                            <div className="mt-2 text-sm space-y-1">
                                <div className="flex justify-between"><span>Cash:</span> <span className="font-bold text-green-600">₱{(summary.cash_sales / 100).toFixed(2)}</span></div>
                                <div className="flex justify-between"><span>GCash:</span> <span className="font-bold text-blue-500">₱{(summary.gcash_sales / 100).toFixed(2)}</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Responsive Toolbar */}
                    <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex flex-col md:flex-row gap-4 w-full xl:flex-1">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="Search Invoice or Cashier..."
                                    className="pl-10 pr-4 py-2 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full"
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                />
                                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <div className="flex gap-2 items-center w-full md:w-auto">
                                <input type="date" className="border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-600 w-1/2 md:w-40" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                                <span className="text-gray-400">-</span>
                                <input type="date" className="border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-600 w-1/2 md:w-40" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-2 shrink-0">
                            {/* PRINTER CONNECT BUTTON */}
                            {!isMobile && (
                                <button
                                    onClick={connectUsb}
                                    className={`w-full sm:w-auto px-4 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm transition-all border
                                        ${usbDevice ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200 animate-pulse'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                                    </svg>
                                    {usbDevice ? 'USB Connected' : 'Connect USB Printer'}
                                </button>
                            )}
                            {isMobile && <div className="text-xs text-blue-600 font-bold bg-blue-50 px-3 py-2.5 rounded-lg border border-blue-100 flex items-center justify-center">Bluetooth Print Mode Active</div>}

                            <button
                                onClick={exportExcel}
                                disabled={isExporting}
                                className={`w-full sm:w-auto bg-green-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2 shadow-sm transition-all ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isExporting ? 'Exporting...' : 'Export Excel'}
                            </button>
                        </div>
                    </div>

                    {/* DESKTOP TABLE */}
                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                                                <td className="p-4">
                                                    <div className={`font-mono font-bold ${sale.status === 'void' ? 'text-red-500 line-through' : 'text-blue-600'}`}>
                                                        {sale.invoice_number}
                                                    </div>
                                                    <div className="mt-1">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${sale.status === 'void' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                            {sale.status === 'void' ? 'VOIDED' : 'COMPLETED'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className={`p-4 text-sm ${sale.status === 'void' ? 'text-red-400' : 'text-gray-500'}`}>{new Date(sale.created_at).toLocaleString()}</td>
                                                <td className="p-4 font-medium text-gray-700">{sale.cashier?.name || 'Unknown'}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${sale.payment_method === 'gcash' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>{sale.payment_method}</span>
                                                    {sale.is_senior && <span className="ml-2 bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">PWD/Senior</span>}
                                                </td>
                                                <td className={`p-4 text-right font-bold ${sale.status === 'void' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>₱{(sale.total_amount / 100).toFixed(2)}</td>
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
                    </div>

                    {/* MOBILE CARD VIEW */}
                    <div className="md:hidden space-y-4">
                        {transactions.map((sale) => (
                            <div key={sale.id} className={`bg-white p-4 rounded-xl shadow-sm border ${sale.status === 'void' ? 'border-red-200 bg-red-50' : 'border-gray-100'} flex flex-col gap-3`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className={`font-mono font-bold text-lg ${sale.status === 'void' ? 'text-red-500 line-through' : 'text-blue-600'}`}>
                                            {sale.invoice_number}
                                        </div>
                                        <div className="text-xs text-gray-500">{new Date(sale.created_at).toLocaleString()}</div>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${sale.status === 'void' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                        {sale.status === 'void' ? 'VOID' : 'COMPLETED'}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-sm border-t border-b py-2 border-gray-100">
                                    <div className="flex flex-col">
                                        <span className="text-gray-500 text-xs">Cashier</span>
                                        <span className="font-medium text-gray-700">{sale.cashier?.name || 'Unknown'}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-gray-500 text-xs">Payment</span>
                                        <span className={`font-bold uppercase ${sale.payment_method === 'gcash' ? 'text-blue-600' : 'text-gray-700'}`}>{sale.payment_method}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-xl text-gray-800">₱{(sale.total_amount / 100).toFixed(2)}</span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 pt-2">
                                    <button onClick={() => handleViewDetails(sale)} className="py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded text-center">View</button>
                                    {sale.status !== 'void' && (
                                        <>
                                            <button onClick={() => handleReprint(sale)} className="py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded text-center">Reprint</button>
                                            <button onClick={() => handleVoid(sale)} className="py-2 text-sm font-medium text-red-600 bg-red-50 rounded text-center">Void</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-gray-50 gap-4 rounded-b-xl">
                        <span className="text-sm text-gray-500">Page <span className="font-bold">{transactions.length > 0 ? links.find(l => l.active)?.label : 0}</span></span>
                        <div className="flex gap-1 flex-wrap justify-center">
                            {links.map((link, index) => (
                                <button key={index} disabled={!link.url || link.active} onClick={() => link.url && fetchTransactions(link.url)} dangerouslySetInnerHTML={{ __html: link.label }} className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${link.active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 hover:bg-gray-100'} ${!link.url && 'opacity-50 cursor-not-allowed'}`} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* DETAILS MODAL */}
            {showDetails && selectedSale && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Transaction Details</h3>
                                <div className="text-xs text-blue-600 font-mono mt-1">{selectedSale.invoice_number}</div>
                            </div>
                            <button onClick={() => setShowDetails(false)} className="text-gray-400 hover:text-red-500 text-2xl">&times;</button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="text-gray-500 border-b">
                                    <tr><th className="text-left pb-2">Item</th><th className="text-center pb-2">Qty</th><th className="text-right pb-2">Total</th></tr>
                                </thead>
                                <tbody className="divide-y">
                                    {selectedSale.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="py-3">
                                                <div className="font-bold text-gray-800">{item.product?.name || 'Item'}</div>
                                                <div className="text-xs text-gray-500">₱{(item.unit_price / 100).toFixed(2)} each</div>
                                            </td>
                                            <td className="py-3 text-center font-bold text-gray-600">x{item.quantity}</td>
                                            <td className="py-3 text-right font-bold">₱{((item.unit_price * item.quantity) / 100).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-gray-50 px-6 py-3 border-t text-sm border-gray-200 shrink-0">
                            <div className="flex justify-between mb-1">
                                <span className="text-gray-500">Payment Method:</span>
                                <span className="font-bold uppercase text-gray-700">{selectedSale.payment_method}</span>
                            </div>
                            <div className="bg-gray-50 px-6 py-4 flex justify-end">
                                <button onClick={() => setShowDetails(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 w-full sm:w-auto">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}