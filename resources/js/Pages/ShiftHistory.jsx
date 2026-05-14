import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import Swal from 'sweetalert2';

// --- PERSISTENT SESSION CACHE ---
// Remembers the bluetooth printer until the page is refreshed to skip the selection popup
let cachedBluetoothDevice = null;

// --- HELPER: ENCODE TEXT FOR PRINTER ---
const encode = (text) => new TextEncoder().encode(text);
const formatCurrencyPH = (amount) => parseFloat(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ShiftHistory({ auth }) {
    const [shifts, setShifts] = useState([]);
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Filters
    const [dateFilter, setDateFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // ==========================================
    // PRINTER STATE & LOGIC
    // ==========================================
    const [usbDevice, setUsbDevice] = useState(null);
    const [isMobile, setIsMobile] = useState(/Android|iPhone|iPad/i.test(navigator.userAgent));

    // Auto-Connect USB Printer on Load (PC Only)
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
            } catch (err) { console.log("Auto-connect failed:", err); }
        };
        autoConnect();
    }, [isMobile]);

    const connectUsb = async () => {
        try {
            const device = await navigator.usb.requestDevice({ filters: [] });
            await device.open();
            await device.selectConfiguration(1);
            await device.claimInterface(0);
            setUsbDevice(device);
            Swal.fire({ icon: 'success', title: 'Printer Connected', timer: 1500, showConfirmButton: false });
        } catch (error) { Swal.fire('Connection Failed', error.message, 'error'); }
    };

    const generateShiftCommands = (data) => {
        const padEnd = (str, len) => str.toString().padEnd(len, ' ');
        const padStart = (str, len) => str.toString().padStart(len, ' ');
        const separator = "-".repeat(32) + "\n";
        const fmt = (val) => "P" + formatCurrencyPH(val);

        const diff = Number(data.difference);
        let diffLabel = 'BALANCED';
        if (diff > 0.01) diffLabel = 'OVERAGE (+)';
        if (diff < -0.01) diffLabel = 'SHORTAGE (-)';

        return new Uint8Array([
            0x1B, 0x40,                   // Initialize printer
            0x1B, 0x70, 0x00, 0x19, 0xFA, // 👉 KICK CASH DRAWER
            0x1B, 0x61, 0x01,             // Center align
            0x1B, 0x45, 0x01, ...encode((settings?.store_name || "POS").toUpperCase() + "\n"), 0x1B, 0x45, 0x00,
            ...(settings?.store_address ? encode(settings.store_address + "\n") : []),
            ...(settings?.store_phone ? encode("Tel: " + settings.store_phone + "\n") : []),
            ...encode(separator),
            0x1B, 0x45, 0x01, ...encode("Z-READ REPORT (REPRINT)\n"), 0x1B, 0x45, 0x00,
            ...encode("Shift ID: #" + (data.shift_id || 'N/A') + "\n"),
            ...encode(separator),
            0x1B, 0x61, 0x00,             // Left align
            ...encode(padEnd("Cashier:", 10) + data.staff_name + "\n"),
            ...encode(padEnd("Opened:", 10) + data.start + "\n"),
            ...encode(padEnd("Closed:", 10) + data.end + "\n"),
            ...encode(separator),
            ...encode(padEnd("Starting Cash:", 18) + padStart(fmt(data.starting_cash), 14) + "\n"),
            ...encode(padEnd("+ Cash Sales:", 18) + padStart(fmt(data.cash_sales), 14) + "\n"),
            ...encode(separator),
            0x1B, 0x45, 0x01,
            ...encode(padEnd("EXPECTED CASH:", 18) + padStart(fmt(data.expected_cash), 14) + "\n"),
            ...encode(padEnd("ACTUAL COUNT:", 18) + padStart(fmt(data.ending_cash), 14) + "\n"),
            ...encode(separator),
            ...encode(padEnd("DIFFERENCE:", 15) + padStart((diff > 0 ? "+" : "") + fmt(data.difference), 17) + "\n"),
            0x1B, 0x61, 0x01, ...encode("\n[ " + diffLabel + " ]\n"), 0x1B, 0x45, 0x00,
            ...encode(separator),
            ...encode("Printed: " + data.printed_at + "\n\n\n________________________________\nManager Signature\n"),
            0x1D, 0x56, 0x41             // Cut Paper
        ]);
    };

    const handlePrintShift = async (shiftId) => {
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });

        try {
            Toast.fire({ icon: 'info', title: 'Preparing Data...' });
            const res = await axios.get(`/api/pos/shift/data/${shiftId}`);
            const commands = generateShiftCommands({ ...res.data, shift_id: shiftId });

            // 👉 MOBILE/TABLET DIRECT BLUETOOTH (No watermarks)
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

                const chunkSize = 20;
                for (let i = 0; i < commands.length; i += chunkSize) {
                    await characteristic.writeValue(commands.slice(i, i + chunkSize));
                }

                Toast.fire({ icon: 'success', title: 'Bluetooth Print Success!' });
                return;
            }

            // 👉 PC USB LOGIC
            if (!usbDevice) {
                 Swal.fire({ title: 'No Printer Connected', text: 'Please connect your USB printer first.', icon: 'warning' });
                 return;
            }
            const endpoint = usbDevice.configuration.interfaces[0].alternate.endpoints.find(e => e.direction === 'out');
            await usbDevice.transferOut(endpoint.endpointNumber, commands);
            Toast.fire({ icon: 'success', title: 'USB Print Success!' });

        } catch (err) {
            console.error(err);
            Swal.fire("Printer Error", "Could not connect. Ensure printer is ON and within range.", "error");
        }
    };
    // ==========================================

    useEffect(() => {
        axios.get('/api/settings').then(res => setSettings(res.data));
    }, []);

    const fetchShifts = async (url = '/api/shifts') => {
        setLoading(true);
        try {
            const res = await axios.get(url, { params: { date: dateFilter, search: searchQuery } });
            setShifts(res.data.data);
            setLinks(res.data.links);
            setCurrentPage(res.data.current_page);
        } catch (error) { console.error("Error loading shifts", error); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        const delayDebounce = setTimeout(() => { fetchShifts(); }, 500);
        return () => clearTimeout(delayDebounce);
    }, [dateFilter, searchQuery]);

    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
    const formatTime = (dateString) => dateString ? new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-';

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800">Shift Management</h2>}>
            <Head title="Shift History" />
            <div className="py-6 sm:py-12 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

                    {/* RESPONSIVE HEADER CONTAINER */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Shift History</h1>
                            <p className="text-sm text-gray-500">Track register activity and reprint reports.</p>
                        </div>
                        {!isMobile && (
                            <button onClick={connectUsb} className={`w-full sm:w-auto px-4 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 border transition-all shadow-sm ${usbDevice ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200 animate-pulse'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>
                                {usbDevice ? 'USB Connected' : 'Connect USB Printer'}
                            </button>
                        )}
                        {isMobile && <div className="text-xs text-blue-600 font-bold bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">Bluetooth Printing Mode Active</div>}
                    </div>

                    {/* SEARCH & FILTERS */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" /></svg></span>
                            <input type="text" placeholder="Search Cashier Name..." className="pl-10 pr-4 py-2.5 border-gray-300 rounded-lg w-full focus:ring-blue-500" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                        <input type="date" className="w-full md:w-48 py-2.5 px-3 border-gray-300 rounded-lg text-gray-600 cursor-pointer" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                    </div>

                    {/* TABLE VIEW (Desktop) */}
                    <div className="hidden md:block bg-white rounded-t-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs border-b">
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
                            <tbody className="divide-y">
                                {loading ? (<tr><td colSpan="8" className="p-8 text-center text-gray-400">Loading...</td></tr>) : shifts.length === 0 ? (<tr><td colSpan="8" className="p-8 text-center text-gray-400">No shifts found.</td></tr>) : (
                                    shifts.map((shift) => (
                                        <tr key={shift.id} className="hover:bg-blue-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-800">{shift.user?.name || 'Unknown'}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900">{formatDate(shift.start_time)}</div>
                                                <div className="text-xs text-gray-400">{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">₱{formatCurrencyPH(shift.starting_cash)}</td>
                                            <td className="px-6 py-4 text-right text-green-600 font-bold">+₱{formatCurrencyPH(shift.cash_sales)}</td>
                                            <td className="px-6 py-4 text-right font-bold text-blue-600">{shift.actual_cash ? `₱${formatCurrencyPH(shift.actual_cash)}` : '-'}</td>
                                            <td className="px-6 py-4 text-center">
                                                {shift.difference !== null ? (
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${Math.abs(Number(shift.difference)) < 1 ? 'bg-gray-100 text-gray-600' : Number(shift.difference) < 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                                        {Number(shift.difference) > 0 ? '+' : ''}{Number(shift.difference).toFixed(2)}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center"><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${shift.status === 'open' ? 'bg-green-100 text-green-600 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>{shift.status}</span></td>
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={() => handlePrintShift(shift.id)} className="text-gray-400 hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-blue-50" title="Reprint Report">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* CARD VIEW (Mobile) */}
                    <div className="md:hidden space-y-4">
                        {shifts.map((shift) => (
                            <div key={shift.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div><h4 className="font-bold text-gray-900 text-lg">{shift.user?.name || 'Unknown'}</h4><p className="text-xs text-gray-500">{formatDate(shift.start_time)} • {formatTime(shift.start_time)}</p></div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${shift.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{shift.status}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                                    <div className="flex flex-col"><span className="text-xs text-gray-400">Starting</span><span className="font-medium">₱{formatCurrencyPH(shift.starting_cash)}</span></div>
                                    <div className="flex flex-col items-end"><span className="text-xs text-gray-400">Sales</span><span className="font-bold text-green-600">+₱{formatCurrencyPH(shift.cash_sales)}</span></div>
                                    <div className="flex flex-col"><span className="text-xs text-gray-400">Expected</span><span className="font-bold">₱{formatCurrencyPH(shift.expected_cash)}</span></div>
                                    <div className="flex flex-col items-end"><span className="text-xs text-gray-400">Actual</span><span className="font-bold text-blue-600">{shift.actual_cash ? `₱${formatCurrencyPH(shift.actual_cash)}` : '-'}</span></div>
                                </div>
                                <div className="flex justify-between items-center mt-2 pt-2 border-t">
                                    <div className={`text-xs font-bold px-2 py-1 rounded ${Math.abs(Number(shift.difference)) < 1 ? 'bg-gray-50' : Number(shift.difference) < 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{shift.difference !== null ? (Number(shift.difference) > 0 ? '+' : '') + Number(shift.difference).toFixed(2) : '-'}</div>
                                    <button onClick={() => handlePrintShift(shift.id)} className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg active:scale-95 transition-all">Reprint Report</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* PAGINATION */}
                    <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-gray-50 gap-4 rounded-b-xl">
                        <span className="text-sm text-gray-500">Page <span className="font-bold">{currentPage}</span></span>
                        <div className="flex gap-1 flex-wrap justify-center">
                            {links.map((link, index) => (
                                <button key={index} disabled={!link.url || link.active} onClick={() => link.url && fetchShifts(link.url)} dangerouslySetInnerHTML={{ __html: link.label }} className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${link.active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'} ${!link.url && 'opacity-50 cursor-not-allowed'}`} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}