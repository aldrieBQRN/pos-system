import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import useCartStore from '@/Stores/useCartStore';
import CartSidebar from '@/Components/CartSidebar';
import MobileScanner from '@/Components/MobileScanner';
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

    // Store Access
    const { addToCart, setCart, cart, getComputations } = useCartStore();
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    
    const { total } = getComputations(); // Live total for mobile bar

    // 1. Fetch Initial Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [prodRes, catRes, setRes] = await Promise.all([
                    axios.get('/api/products?all=true'), 
                    axios.get('/api/categories'),
                    axios.get('/api/settings')
                ]);
                setProducts(prodRes.data);
                setFilteredProducts(prodRes.data);
                setCategories(catRes.data);
                setSettings(setRes.data);
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
            setShowScanner(false);
        } else {
            Swal.fire('Error', 'Product not found!', 'error');
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
            setCart(order.cart_data); // Restore logic
            await axios.delete(`/api/held-orders/${order.id}`); // Remove from DB
            setShowHeldOrdersModal(false);
            
            // Auto open cart on mobile
            if (window.innerWidth < 768) setIsMobileCartOpen(true);
        }
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="POS" />

            {/* Main Container */}
            <div className="flex h-[calc(100vh-65px)] bg-gray-100 overflow-hidden relative">
                
                {/* LEFT SIDE: PRODUCT CATALOG */}
                <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
                    
                    {/* Header: Search, Recall, Scan */}
                    <div className="p-4 bg-white border-b flex gap-3 items-center shadow-sm z-10">
                        <div className="relative flex-1">
                            <input 
                                type="text" 
                                placeholder="Search or scan..." 
                                className="w-full pl-10 pr-4 py-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <svg className="w-6 h-6 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>

                        {/* Recall Button */}
                        <button 
                            onClick={fetchHeldOrders} 
                            className="bg-orange-100 text-orange-600 hover:bg-orange-200 px-4 py-3 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-95" 
                            title="Recall Held Orders"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="hidden md:inline">Recall</span>
                        </button>

                        {/* Scan Button */}
                        <button 
                            onClick={() => setShowScanner(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md transition-transform active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75zM16.5 19.5h.75v.75h-.75v-.75z" /></svg>
                            <span className="hidden md:inline">Scan</span>
                        </button>
                    </div>

                    {/* Category Pills */}
                    <div className="bg-white border-b px-4 py-3 shadow-sm z-0">
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className={`px-5 py-2 rounded-full font-bold whitespace-nowrap transition-all border
                                    ${selectedCategory === 'all' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                            >
                                All Items
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-5 py-2 rounded-full font-bold whitespace-nowrap transition-all border
                                        ${selectedCategory === cat.id ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-64 text-gray-400">Loading products...</div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="flex flex-col justify-center items-center h-64 text-gray-400"><p className="text-lg">No products found.</p></div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                                {filteredProducts.map((product) => (
                                    <button 
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 border border-gray-100 flex flex-col items-center text-center h-full"
                                    >
                                        <div className="w-full aspect-square bg-gray-50 rounded-xl mb-3 flex items-center justify-center overflow-hidden relative">
                                            {product.image_path ? (
                                                <img src={product.image_path} alt={product.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-300">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                                </svg>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-gray-800 leading-tight mb-1 line-clamp-2">{product.name}</h3>
                                        <div className="mt-auto pt-2 w-full flex justify-between items-center">
                                            <span className="text-sm text-gray-400">{product.stock_quantity > 0 ? `${product.stock_quantity} left` : 'Out'}</span>
                                            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">${(product.price / 100).toFixed(2)}</span>
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
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-40 flex justify-between items-center safe-area-pb">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500 font-medium">{cart.length} items</span>
                        <span className="text-xl font-extrabold text-gray-900">${(total / 100).toFixed(2)}</span>
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

            {/* HELD ORDERS MODAL */}
            {showHeldOrdersModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800">Held Orders</h3>
                            <button onClick={() => setShowHeldOrdersModal(false)} className="text-gray-400 hover:text-red-500 text-2xl">&times;</button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-3">
                            {heldOrders.length === 0 ? (
                                <p className="text-center text-gray-400 py-4">No held orders found.</p>
                            ) : (
                                heldOrders.map(order => (
                                    <div key={order.id} className="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                        <div>
                                            <div className="font-bold text-gray-800">{order.reference_note}</div>
                                            <div className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</div>
                                            <div className="text-xs text-blue-600 font-medium mt-1">{order.cart_data.length} items • ${(order.total_amount / 100).toFixed(2)}</div>
                                        </div>
                                        <button 
                                            onClick={() => handleRecallOrder(order)}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 shadow-sm"
                                        >
                                            Recall
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* SCANNER MODAL */}
            {showScanner && <MobileScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
        </AuthenticatedLayout>
    );
}