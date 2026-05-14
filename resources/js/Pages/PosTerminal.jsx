import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import useCartStore from '@/Stores/useCartStore';
import CartSidebar from '@/Components/CartSidebar';
import MobileScanner from '@/Components/MobileScanner';
import ShiftModal from '@/Components/ShiftModal';
import Swal from 'sweetalert2';

// --- PERSISTENT SESSION CACHE ---
// Remembers the bluetooth printer until the page is hard-refreshed
let cachedBluetoothDevice = null;

// --- HELPER: ENCODE TEXT FOR PRINTER ---
const encode = (text) => new TextEncoder().encode(text);

export default function PosTerminal({ auth, store_settings }) {
    // Data States
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    // UI States
    const [isLoading, setIsLoading] = useState(true);
    const [showScanner, setShowScanner] = useState(false);

    // Initialized directly from Inertia props passed via web.php
    const [settings, setSettings] = useState(store_settings || null);
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

    // Held Orders State
    const [heldOrders, setHeldOrders] = useState([]);
    const [showHeldOrdersModal, setShowHeldOrdersModal] = useState(false);

    // Shift Management
    const [shift, setShift] = useState(null);
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [shiftMode, setShiftMode] = useState('start');

    // Store Access
    const { addToCart, setCart, cart, getComputations } = useCartStore();
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const { total } = getComputations();

    // ==========================================
    // PRINTER STATE & LOGIC
    // ==========================================
    const [usbDevice, setUsbDevice] = useState(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMobile(/Android|iPhone|iPad/i.test(navigator.userAgent));
    }, []);

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

        const storeName = settings?.store_name || "Smart POS";
        const storeAddress = settings?.store_address || "";
        const storePhone = settings?.store_phone || "";

        const fmt = (cents) => (cents / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 });

        const commands = [
            0x1B, 0x40,       // Init
            0x1B, 0x70, 0x00, 0x19, 0xFA, // Kick Drawer

            // HEADER
            0x1B, 0x61, 0x01, // Center
            0x1B, 0x21, 0x10, // Double Height
            ...encode(storeName.toUpperCase() + "\n"),
            0x1B, 0x21, 0x00, // Normal
            ...(storeAddress ? encode(storeAddress + "\n") : []),
            ...(storePhone ? encode("Tel: " + storePhone + "\n") : []),
            ...encode(separator),

            // INFO
            0x1B, 0x61, 0x00, // Left
            ...encode(padEnd("Invoice:", 10) + (trx.invoice_number || trx.transaction_code) + "\n"),
            ...encode(padEnd("Date:", 10) + new Date(trx.created_at).toLocaleString() + "\n"),
            ...encode(padEnd("Cashier:", 10) + (trx.cashier?.name || auth.user.name) + "\n"),
            ...encode(separator),
        ];

        // ITEMS
        trx.items.forEach(item => {
            const name = (item.product?.name || item.name || 'Item').substring(0, 18);
            const qtyLine = `${item.quantity} x ${name}`;
            const lineTotal = fmt(item.quantity * (item.unit_price || item.price));

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
        if (trx.payment_method === 'cash') {
            commands.push(
                ...encode(padEnd("Cash Given:", 20) + padStart(fmt(trx.cash_given), 12) + "\n"),
                ...encode(padEnd("Change:", 20) + padStart(fmt(trx.change), 12) + "\n")
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
            0x0A, 0x0A, 0x0A, // Feed 3 lines
            0x1D, 0x56, 0x41  // Cut Paper
        );

        return new Uint8Array(commands);
    };

    const handlePrintReceipt = async (trxId) => {
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });

        try {
            Toast.fire({ icon: 'info', title: 'Preparing Data...' });

            const res = await axios.get(`/api/transactions/${trxId}`);
            const trx = res.data;
            const commands = generateReceiptCommands(trx);

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

                Toast.fire({ icon: 'success', title: 'Printed via Bluetooth!' });
                return;
            }

            // 👉 PC USB PRINTING
            if (!usbDevice) {
                Swal.fire({
                    title: 'No Printer Connected',
                    text: 'Please connect the USB thermal printer first.',
                    icon: 'warning',
                    confirmButtonColor: '#3085d6'
                });
                return;
            }

            Toast.fire({ icon: 'info', title: 'Printing...' });
            const endpoint = usbDevice.configuration.interfaces[0].alternate.endpoints.find(e => e.direction === 'out');
            await usbDevice.transferOut(endpoint.endpointNumber, commands);
            Toast.fire({ icon: 'success', title: 'Printed Successfully!' });

        } catch (err) {
            console.error(err);
            Swal.fire("Print Failed", err.message || "Could not connect to printer.", "error");
        }
    };
    // ==========================================

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [prodRes, catRes, shiftRes] = await Promise.all([
                    axios.get('/api/products?all=true'),
                    axios.get('/api/categories'),
                    axios.get('/api/shift/check')
                ]);

                setProducts(prodRes.data);
                setFilteredProducts(prodRes.data);
                setCategories(catRes.data);

                if (shiftRes.data && shiftRes.data.id) {
                    setShift(shiftRes.data);
                } else {
                    setShift(null);
                }

            } catch (error) {
                console.error("Error loading POS data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        let result = products;
        if (selectedCategory !== 'all') {
            result = result.filter(p => p.category_id === selectedCategory);
        }
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(lowerQuery) ||
                p.sku.includes(lowerQuery)
            );
        }
        setFilteredProducts(result);
    }, [selectedCategory, searchQuery, products]);

    const handleAddToCart = (product) => {
        if (product.stock_quantity <= 0) {
            Swal.fire({ icon: 'error', title: 'Out of Stock', text: `${product.name} is currently unavailable.`, toast: true, position: 'top', showConfirmButton: false, timer: 2000, background: '#FEF2F2', color: '#991B1B' });
            return false;
        }

        const cartItem = cart.find(item => item.id === product.id);
        if (cartItem && cartItem.quantity >= product.stock_quantity) {
            Swal.fire({ icon: 'error', title: 'Limit Reached', text: `Only ${product.stock_quantity} stocks remaining!`, toast: true, position: 'top', showConfirmButton: false, timer: 2000, background: '#FEF2F2', color: '#991B1B' });
            return false;
        }

        addToCart(product);
        return true;
    };

    const handleScan = (code) => {
        const product = products.find(p => p.sku === code);
        if (product) return handleAddToCart(product);
        else {
            Swal.fire({ icon: 'error', title: 'Product not found', text: code, toast: true, position: 'top', showConfirmButton: false, timer: 2000 });
            return false;
        }
    };

    const fetchHeldOrders = async () => {
        try {
            const response = await axios.get('/api/held-orders');
            setHeldOrders(response.data);
            setShowHeldOrdersModal(true);
        } catch (error) {
            console.error(error);
        }
    };

    const handleRecallOrder = async (order) => {
        const result = await Swal.fire({ title: 'Recall Order?', text: "This will replace your current cart.", icon: 'question', showCancelButton: true, confirmButtonText: 'Yes, Recall', confirmButtonColor: '#3b82f6' });
        if (result.isConfirmed) {
            setCart(order.cart_data);
            await axios.delete(`/api/held-orders/${order.id}`);
            setShowHeldOrdersModal(false);
            if (window.innerWidth < 768) setIsMobileCartOpen(true);
        }
    };

    const handleShiftCompleted = (data) => {
        if (!data || data.status === 'closed' || data.status === 'closed_force_reset') {
            setShift(null);
        } else {
            setShift(data);
        }
        setShowShiftModal(false);
    };

    const isMyShift = shift && shift.user_id === auth.user.id;
    const isShiftLocked = shift && !isMyShift;

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="POS Terminal" />

            <div className="flex h-[calc(100vh-65px)] bg-gray-100 overflow-hidden relative">

                {/* LEFT SIDE: PRODUCT CATALOG */}
                <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">

                    {/* POS HEADER */}
                    <div className="p-4 bg-white border-b flex gap-2 items-center shadow-sm z-10 shrink-0">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Search product..."
                                className="w-full pl-10 pr-4 py-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <svg className="w-6 h-6 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>

                        {!isMobile && (
                            <button
                                onClick={connectUsb}
                                className={`px-4 py-3 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all border
                                    ${usbDevice ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200 animate-pulse'}`}
                                title={usbDevice ? "Printer Connected" : "Connect Printer"}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>
                                <span className="hidden lg:inline">{usbDevice ? 'Connected' : 'Connect Printer'}</span>
                            </button>
                        )}

                        <button onClick={fetchHeldOrders} className="bg-orange-100 text-orange-600 hover:bg-orange-200 px-3 md:px-4 py-3 rounded-xl font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="hidden lg:inline">Recall</span>
                        </button>

                        <button
                            onClick={() => { if (isShiftLocked) return; if (isMyShift) setShiftMode('close'); else setShiftMode('start'); setShowShiftModal(true); }}
                            disabled={isShiftLocked}
                            className={`px-3 md:px-4 py-3 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all border ${isShiftLocked ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : isMyShift ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-600 text-white border-blue-600'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                {isShiftLocked ? <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /> : isMyShift ? <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />}
                            </svg>
                            <span className="hidden lg:inline">{isShiftLocked ? `Busy` : (isMyShift ? 'Shift' : 'Start')}</span>
                        </button>

                        <button onClick={() => setShowScanner(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75zM16.5 19.5h.75v.75h-.75v-.75z" /></svg>
                            <span className="hidden lg:inline">Scan</span>
                        </button>
                    </div>

                    {/* PRODUCT GRID */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-full text-gray-400">Loading products...</div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="flex flex-col justify-center items-center h-full text-gray-400"><p className="text-lg">No products found.</p></div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-24 md:pb-4">
                                {filteredProducts.map((product) => (
                                    <button
                                        key={product.id}
                                        onClick={() => handleAddToCart(product)}
                                        className="bg-white p-3 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 border border-gray-100 flex flex-col items-center text-center h-full"
                                    >
                                        <div className="w-full aspect-square bg-gray-50 rounded-xl mb-3 flex items-center justify-center overflow-hidden relative">
                                            {product.image_path ? (
                                                <img src={product.image_path} alt={product.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-300">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                                </svg>
                                            )}
                                            {product.stock_quantity <= 0 && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><span className="bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded">SOLD OUT</span></div>}
                                        </div>
                                        <h3 className="font-bold text-gray-800 text-sm leading-tight mb-1 line-clamp-2">{product.name}</h3>
                                        <div className="mt-auto pt-2 w-full flex justify-between items-center">
                                            <span className={`text-xs ${product.stock_quantity < 10 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>{product.stock_quantity} left</span>
                                            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm">₱{(product.price / 100).toFixed(2)}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* DESKTOP SIDEBAR */}
                <div className="hidden md:flex w-96 bg-white border-l shadow-xl z-20 flex-col h-full">
                    <CartSidebar
                        settings={settings}
                        showPaymentModal={showPaymentModal}
                        setShowPaymentModal={setShowPaymentModal}
                        onPrintReceipt={handlePrintReceipt}
                    />
                </div>

                {/* MOBILE BOTTOM BAR */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500 font-medium">{cart.length} items</span>
                        <span className="text-xl font-extrabold text-gray-900">₱{(total / 100).toFixed(2)}</span>
                    </div>
                    <button
                        onClick={() => setIsMobileCartOpen(true)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-transform"
                    >
                        View Order
                    </button>
                </div>

                {/* MOBILE CART MODAL */}
                {isMobileCartOpen && (
                    <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col animate-slide-up">
                        <CartSidebar
                            settings={settings}
                            showPaymentModal={showPaymentModal}
                            setShowPaymentModal={setShowPaymentModal}
                            onClose={() => setIsMobileCartOpen(false)}
                            onPrintReceipt={handlePrintReceipt}
                        />
                    </div>
                )}
            </div>

            {/* --- HELD ORDERS MODAL --- */}
            {showHeldOrdersModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                            <h3 className="font-bold text-lg text-gray-800">Held Orders</h3>
                            <button onClick={() => setShowHeldOrdersModal(false)} className="text-gray-400 hover:text-red-500 text-2xl font-bold transition-colors">&times;</button>
                        </div>
                        <div className="overflow-y-auto bg-gray-50 md:bg-white flex-1">
                            {heldOrders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                    <p>No held orders found.</p>
                                </div>
                            ) : (
                                <>
                                    <table className="w-full text-left hidden md:table">
                                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="p-4">Reference Note</th>
                                                <th className="p-4">Date Saved</th>
                                                <th className="p-4 text-center">Items</th>
                                                <th className="p-4 text-right">Total Amount</th>
                                                <th className="p-4 text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {heldOrders.map(order => (
                                                <tr key={order.id} className="hover:bg-blue-50 transition-colors">
                                                    <td className="p-4 font-bold text-gray-800">{order.reference_note}</td>
                                                    <td className="p-4 text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</td>
                                                    <td className="p-4 text-center"><span className="bg-gray-100 text-gray-600 py-1 px-3 rounded-full text-xs font-bold">{order.cart_data.length}</span></td>
                                                    <td className="p-4 text-right font-mono font-bold text-blue-600">₱{(order.total_amount / 100).toFixed(2)}</td>
                                                    <td className="p-4 text-center">
                                                        <button onClick={() => handleRecallOrder(order)} className="bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all active:scale-95">Recall</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="md:hidden space-y-3 p-4">
                                        {heldOrders.map(order => (
                                            <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-bold text-gray-800 text-lg">{order.reference_note}</div>
                                                        <div className="text-xs text-gray-400 mt-1">{new Date(order.created_at).toLocaleString()}</div>
                                                    </div>
                                                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold">{order.cart_data.length} Items</span>
                                                </div>
                                                <div className="flex justify-between items-center border-t pt-3 mt-1">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-gray-400 uppercase font-bold">Total</span>
                                                        <span className="text-xl font-extrabold text-gray-900">₱{(order.total_amount / 100).toFixed(2)}</span>
                                                    </div>
                                                    <button onClick={() => handleRecallOrder(order)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-md active:scale-95 transition-all">Recall</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* SCANNER MODAL */}
            {showScanner && <MobileScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}

            {/* SHIFT MODAL */}
            <ShiftModal
                isOpen={showShiftModal}
                mode={shiftMode}
                settings={settings}
                onClose={() => setShowShiftModal(false)}
                onShiftCompleted={handleShiftCompleted}
            />

        </AuthenticatedLayout>
    );
}