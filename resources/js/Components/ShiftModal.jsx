import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import axios from 'axios';
import Swal from 'sweetalert2';

// --- PERSISTENT SESSION CACHE ---
// Remembers the bluetooth printer until the page is hard-refreshed
let cachedBluetoothDevice = null;

// --- HELPER: ENCODE TEXT FOR PRINTER ---
const encode = (text) => new TextEncoder().encode(text);
const formatCurrency = (amount) => parseFloat(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ShiftModal({ isOpen, mode = 'start', settings, onClose, onShiftCompleted }) {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState(null);

    const [usbDevice, setUsbDevice] = useState(null);
    const [isMobile, setIsMobile] = useState(/Android|iPhone|iPad/i.test(navigator.userAgent));

    // Reset form when modal opens or mode changes
    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setSummary(null);
        }
    }, [isOpen, mode]);

    // PC Printer Auto-connect
    useEffect(() => {
        if (isMobile || !isOpen) return;
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
            } catch (err) { console.log(err); }
        };
        autoConnect();
    }, [isMobile, isOpen]);

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
        const fmt = (val) => "₱" + formatCurrency(val);
        const diff = Number(data.difference);

        // Match Z-Read Logic
        let diffLabel = 'BALANCED';
        if (diff > 0.01) diffLabel = 'OVERAGE (+)';
        if (diff < -0.01) diffLabel = 'SHORTAGE (-)';

        return new Uint8Array([
            0x1B, 0x40,                   // Initialize printer
            0x1B, 0x70, 0x00, 0x19, 0xFA, // 👉 KICK CASH DRAWER
            0x1B, 0x61, 0x01,             // Center Align
            0x1B, 0x45, 0x01, ...encode((settings?.store_name || "Smart POS").toUpperCase() + "\n"), 0x1B, 0x45, 0x00,
            ...(settings?.store_address ? encode(settings.store_address + "\n") : []),
            ...(settings?.store_phone ? encode("Tel: " + settings.store_phone + "\n") : []),
            ...encode(separator),
            0x1B, 0x45, 0x01, ...encode("Z-READ REPORT\n"), 0x1B, 0x45, 0x00,
            ...encode("Shift ID: #" + (data.shift_id || 'N/A') + "\n"),
            ...encode(separator),
            0x1B, 0x61, 0x00,             // Left Align
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

                const chunkSize = 20;
                for (let i = 0; i < commands.length; i += chunkSize) {
                    await characteristic.writeValue(commands.slice(i, i + chunkSize));
                }

                Toast.fire({ icon: 'success', title: 'Bluetooth Print Success!' });
                handleFinalDone(); // Background reload after success
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
            handleFinalDone();
        } catch (err) {
            console.error(err);
            Swal.fire("Printer Error", "Could not connect. Ensure printer is ON and within range.", "error");
        }
    };

    const handleFinalDone = () => {
        // 👉 AJAX based reload to sync shift state
        router.reload({
            onSuccess: () => {
                onShiftCompleted(null);
                onClose();
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (mode === 'start') {
                const res = await axios.post('/api/shift/start', { amount: parseFloat(amount) });
                Swal.fire({ icon: 'success', title: 'Shift Started', timer: 1500, showConfirmButton: false });
                onShiftCompleted(res.data);
            } else {
                const res = await axios.post('/api/shift/close', { actual_cash: parseFloat(amount) });
                setSummary(res.data);
            }
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'Something went wrong.', 'error');
        } finally { setLoading(false); }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-gray-800">
                <div className={`p-6 border-b text-white flex justify-between items-start ${mode === 'start' ? 'bg-blue-600' : 'bg-gray-800'}`}>
                    <h2 className="text-xl font-bold">{summary ? 'Shift Summary' : (mode === 'start' ? 'Start Shift' : 'End of Shift')}</h2>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="p-6">
                    {summary ? (
                        <div className="space-y-5">
                            <div className="bg-gray-50 p-5 rounded-xl space-y-3 border border-gray-200 text-sm shadow-inner">
                                <div className="flex justify-between"><span>Starting Cash</span><span className="font-bold">₱{formatCurrency(summary.starting_cash)}</span></div>
                                <div className="flex justify-between"><span>Cash Sales</span><span className="font-bold text-green-600">+₱{formatCurrency(summary.cash_sales)}</span></div>
                                <div className="border-t border-dashed border-gray-300 my-1"></div>
                                <div className="flex justify-between font-bold"><span>Expected</span><span>₱{formatCurrency(summary.expected_cash)}</span></div>
                                <div className="flex justify-between font-bold text-blue-600"><span>Actual</span><span>₱{formatCurrency(summary.actual_cash)}</span></div>
                            </div>

                            <div className={`p-4 rounded-xl text-center border-2 shadow-sm ${Math.abs(summary.difference) < 0.01 ? 'bg-green-50 text-green-700 border-green-100' : summary.difference > 0 ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                <div className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">
                                    {Math.abs(summary.difference) < 0.01 ? 'Status' : (summary.difference > 0 ? 'Overage' : 'Shortage')}
                                </div>
                                <div className="text-2xl font-extrabold tracking-tight">
                                    {Math.abs(summary.difference) < 0.01 ? 'BALANCED' : `₱${Math.abs(summary.difference).toFixed(2)}`}
                                </div>
                            </div>

                            <button onClick={() => handlePrintShift(summary.id)} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition-all">Print Z-Read Report</button>
                            <button onClick={handleFinalDone} className="w-full py-3.5 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors">Done</button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="mb-8 text-center">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{mode === 'start' ? 'Initial Cash Float' : 'Drawer Count'}</label>
                                <div className="relative group">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-2xl group-focus-within:text-blue-500 transition-colors">₱</span>
                                    <input type="number" step="0.01" required autoFocus className="w-full pl-12 pr-6 py-5 text-4xl font-black border-2 border-gray-100 rounded-2xl text-center text-gray-800 focus:border-blue-500 focus:ring-0 transition-all bg-gray-50 focus:bg-white" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                                </div>
                            </div>
                            <button type="submit" disabled={loading || !amount} className={`w-full py-4 text-white font-bold text-lg rounded-xl shadow-lg transition-all active:scale-[0.98] ${loading || !amount ? 'bg-gray-300' : mode === 'start' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                {loading ? 'Processing...' : (mode === 'start' ? 'Open Register' : 'Finalize & Close Shift')}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}