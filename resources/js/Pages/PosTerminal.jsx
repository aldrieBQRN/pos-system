import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import useCartStore from '@/Stores/useCartStore';
import CartSidebar from '@/Components/CartSidebar';
import MobileScanner from '@/Components/MobileScanner';
import ShiftModal from '@/Components/ShiftModal';
import Swal from 'sweetalert2';

export default function PosTerminal({ auth }) {
    // Data States
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    // UI States
    const [isLoading, setIsLoading] = useState(true);
    const [showScanner, setShowScanner] = useState(false);
    const [settings, setSettings] = useState(null);
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

    // 1. Fetch Initial Data
    // 1. Fetch Initial Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [prodRes, catRes, setRes, shiftRes] = await Promise.all([
                    axios.get('/api/products?all=true'),
                    axios.get('/api/categories'),
                    axios.get('/api/settings'),
                    axios.get('/api/shift/check')
                ]);

                setProducts(prodRes.data);
                setFilteredProducts(prodRes.data);
                setCategories(catRes.data);
                setSettings(setRes.data);

                // --- FIX: STRICT CHECK ---
                // Only set shift if it exists AND has a valid ID.
                // This prevents empty arrays [] or objects {} from locking the screen.
                if (shiftRes.data && shiftRes.data.id) {
                    setShift(shiftRes.data);
                } else {
                    setShift(null); // Ensure it's null if invalid
                }

            } catch (error) {
                console.error("Error loading POS data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // 2. Filter Logic
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

    // 3. Scan Logic
    const handleScan = (code) => {
        const product = products.find(p => p.sku === code);
        if (product) {
            addToCart(product);
            new Audio('/beep.mp3').play().catch(()=>{});
        } else {
            Swal.fire({
                icon: 'error', title: 'Product not found', text: code,
                toast: true, position: 'top', showConfirmButton: false, timer: 2000,
                background: '#FEF2F2', color: '#991B1B'
            });
        }
    };

    // 4. Held Orders Logic
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
        const result = await Swal.fire({
            title: 'Recall Order?',
            text: "This will replace your current cart.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Recall',
            confirmButtonColor: '#3b82f6'
        });

        if (result.isConfirmed) {
            setCart(order.cart_data);
            await axios.delete(`/api/held-orders/${order.id}`);
            setShowHeldOrdersModal(false);
            if (window.innerWidth < 768) setIsMobileCartOpen(true);
        }
    };

    // 5. Shift Completed Handler
    const handleShiftCompleted = (data) => {
        // If data is null or status is closed, the shift just ended.
        if (!data || data.status === 'closed' || data.status === 'closed_force_reset') {

            // Clear shift data so the button turns Blue ("Start Shift")
            setShift(null);
            setShowShiftModal(false);

            // We DO NOT re-open the modal automatically.
            // The user must click the button if they want to start again.

        } else if (data.status === 'open') {
            // Shift Started Successfully
            setShift(data);
            setShowShiftModal(false);
        }
    };

    // --- CHECK SHIFT OWNERSHIP ---
    // If a shift exists, does it belong to the current user?
    const isMyShift = shift && shift.user_id === auth.user.id;
    // If a shift exists but it's NOT mine, the register is locked.
    const isShiftLocked = shift && !isMyShift;

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="POS Terminal" />

            <div className="flex h-[calc(100vh-65px)] bg-gray-100 overflow-hidden relative">

                {/* LEFT SIDE: PRODUCT CATALOG */}
                <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">

                    {/* POS HEADER */}
                    <div className="p-4 bg-white border-b flex gap-2 items-center shadow-sm z-10 shrink-0">

                        {/* Search Bar */}
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

                        {/* RECALL BUTTON */}
                        <button
                            onClick={fetchHeldOrders}
                            className="bg-orange-100 text-orange-600 hover:bg-orange-200 px-3 md:px-4 py-3 rounded-xl font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all"
                            title="Recall Held Orders"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="hidden md:inline">Recall</span>
                        </button>

                        {/* SMART SHIFT BUTTON */}
                        <button
                            onClick={() => {
                                if (isShiftLocked) return; // Locked: Do nothing
                                if (isMyShift) {
                                    setShiftMode('close'); // Mine: Close it
                                } else {
                                    setShiftMode('start'); // None: Start it
                                }
                                setShowShiftModal(true);
                            }}
                            disabled={isShiftLocked}
                            className={`px-3 md:px-4 py-3 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all border
                                ${isShiftLocked
                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' // Locked
                                    : isMyShift
                                        ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-100 active:scale-95' // Close
                                        : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600 shadow-md active:scale-95' // Start
                                }`}
                            title={isShiftLocked ? `Register used by ${shift?.user?.name}` : (isMyShift ? "Close Shift" : "Start New Shift")}
                        >
                            {/* Icon Logic */}
                            {isShiftLocked ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                            ) : isMyShift ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>
                            )}

                            {/* Text Logic */}
                            <span className="hidden md:inline">
                                {isShiftLocked
                                    ? `Busy (${shift?.user?.name?.split(' ')[0]})`
                                    : (isMyShift ? 'Shift' : 'Start')}
                            </span>
                        </button>

                        {/* SCAN BUTTON */}
                        <button onClick={() => setShowScanner(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75zM16.5 19.5h.75v.75h-.75v-.75z" /></svg>
                            <span className="hidden md:inline">Scan</span>
                        </button>
                    </div>

                    {/* PRODUCT GRID (Unchanged) */}
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
                                        onClick={() => addToCart(product)}
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
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
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
                        <div className="overflow-y-auto p-0 md:p-0 bg-gray-50 md:bg-white flex-1">
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
                settings={settings} // <--- ADD THIS PROP
                onClose={() => setShowShiftModal(false)}
                onShiftCompleted={handleShiftCompleted}
            />

        </AuthenticatedLayout>
    );
}