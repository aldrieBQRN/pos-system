import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'; 
import { Head } from '@inertiajs/react'; 
import ProductGrid from '@/Components/ProductGrid'; 
import CartSidebar from '@/Components/CartSidebar'; 
import useCartStore from '@/Stores/useCartStore'; 
import MobileScanner from '@/Components/MobileScanner'; 
import Swal from 'sweetalert2'; 

export default function PosTerminal() { 
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]); // <--- 1. Store Categories here
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All'); // Stores ID or 'All'
    const [storeSettings, setStoreSettings] = useState(null);
    const [showScanner, setShowScanner] = useState(false);

    const addToCart = useCartStore((state) => state.addToCart);

    // Toast Notification Config
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.onmouseenter = Swal.stopTimer;
            toast.onmouseleave = Swal.resumeTimer;
        }
    });

    const barcodeBuffer = useRef('');
    const lastKeyTime = useRef(Date.now());

    // --- INITIAL DATA LOADING ---
    useEffect(() => {
        // 1. Fetch Store Settings
        axios.get('/api/settings').then(res => setStoreSettings(res.data)).catch(e => {});

        // 2. Fetch Categories from Database
        axios.get('/api/categories').then(res => {
            // Prepend 'All' option manually
            setCategories([{ id: 'All', name: 'All' }, ...res.data]);
        }).catch(err => console.error("Failed to load categories", err));
    }, []);

    // --- PRODUCT FETCHING (Search & Filter) ---
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (searchTerm) params.append('search', searchTerm);
                
                // 3. Send Category ID (or 'All') to backend
                if (selectedCategory !== 'All') params.append('category', selectedCategory);
                
                const response = await axios.get(`/api/products?${params.toString()}`);
                setProducts(response.data.data || []); 
                setLoading(false);
            } catch (error) {
                console.error(error);
                setLoading(false);
            }
        };

        const delayDebounce = setTimeout(() => { fetchProducts(); }, 300);
        return () => clearTimeout(delayDebounce);
    }, [searchTerm, selectedCategory]);

    // --- BARCODE LOGIC ---
    useEffect(() => {
        const handleKeyDown = async (e) => {
            const currentTime = Date.now();
            const timeGap = currentTime - lastKeyTime.current;
            lastKeyTime.current = currentTime;

            if (e.key === 'Enter') {
                if (barcodeBuffer.current.length > 0) {
                    await handleScan(barcodeBuffer.current);
                    barcodeBuffer.current = '';
                    e.preventDefault(); 
                }
                return;
            }
            if (timeGap > 100) barcodeBuffer.current = '';
            if (e.key.length === 1) barcodeBuffer.current += e.key;
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleScan = async (sku) => {
        try {
            const response = await axios.get(`/api/products?search=${sku}`);
            const foundProducts = response.data.data;

            if (foundProducts.length > 0) {
                const exactMatch = foundProducts.find(p => p.sku === sku) || foundProducts[0];
                addToCart(exactMatch);
                Toast.fire({ icon: 'success', title: `${exactMatch.name} added` });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Product Not Found',
                    text: `No item found with barcode: ${sku}`,
                    confirmButtonColor: '#3085d6',
                });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'System Error', text: 'Could not connect to database.' });
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="POS Terminal" />

            <div className="flex h-[calc(100vh-4.1rem)] bg-gray-100 overflow-hidden relative">
                
                {/* --- LEFT SIDE (Menu) --- */}
                <div className="flex-1 flex flex-col h-full">
                    <div className="p-6 pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h1 className="text-2xl font-bold text-gray-800">Menu</h1>
                            <div className="flex gap-2">
                                
                                <button 
                                    onClick={() => setShowScanner(true)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors"
                                    title="Open Camera Scanner"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                                    </svg>
                                    <span className="hidden sm:inline">Scan</span>
                                </button>

                                <div className="relative">
                                    <input 
                                        type="text" 
                                        placeholder="Search products..." 
                                        className="pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-64"
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                </div>
                            </div>
                        </div>

                        {/* 4. DYNAMIC CATEGORY TABS */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border
                                        ${selectedCategory === cat.id 
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 pt-0">
                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                            </div>
                        ) : (
                            <ProductGrid products={products} />
                        )}
                    </div>
                </div>

                {/* --- RIGHT SIDE (Cart) --- */}
                <div className="w-[400px] bg-white border-l shadow-xl h-full z-10 hidden md:block">
                    <CartSidebar settings={storeSettings} />
                </div>

                {/* CAMERA MODAL */}
                {showScanner && (
                    <MobileScanner 
                        onScan={handleScan} 
                        onClose={() => setShowScanner(false)} 
                    />
                )}
            </div>
        </AuthenticatedLayout>
    );
}