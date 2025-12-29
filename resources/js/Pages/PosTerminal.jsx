import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'; 
import { Head } from '@inertiajs/react'; 
import ProductGrid from '@/Components/ProductGrid'; 
import CartSidebar from '@/Components/CartSidebar'; 

export default function PosTerminal() { 
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    
    // 1. NEW: State for Store Settings
    const [storeSettings, setStoreSettings] = useState(null);

    const categories = ['All', 'Beverages', 'Bakery', 'Food', 'General'];

    useEffect(() => {
        // 2. NEW: Fetch Store Settings immediately
        axios.get('/api/settings')
            .then(response => setStoreSettings(response.data))
            .catch(error => console.error("Failed to load settings:", error));

        // Existing Product Fetch Logic
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (searchTerm) params.append('search', searchTerm);
                if (selectedCategory !== 'All') params.append('category', selectedCategory);

                const response = await axios.get(`/api/products?${params.toString()}`);
                setProducts(response.data.data || []); 
                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch products:", error);
                setLoading(false);
            }
        };

        const delayDebounce = setTimeout(() => {
            fetchProducts();
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [searchTerm, selectedCategory]);

    return (
        <AuthenticatedLayout>
            <Head title="POS Terminal" />

            <div className="flex h-[calc(100vh-4.1rem)] bg-gray-100 overflow-hidden">
                
                {/* LEFT SIDE: Product Grid */}
                <div className="flex-1 flex flex-col h-full">
                    
                    {/* Header & Search */}
                    <div className="p-6 pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h1 className="text-2xl font-bold text-gray-800">Menu</h1>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="Search products..." 
                                    className="pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>
                        </div>

                        {/* Category Tabs */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border
                                        ${selectedCategory === cat 
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Scrollable Grid Area */}
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

                {/* RIGHT SIDE: Cart Sidebar */}
                <div className="w-[400px] bg-white border-l shadow-xl h-full z-10">
                    {/* 3. NEW: Pass the settings to the sidebar for printing */}
                    <CartSidebar settings={storeSettings} />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}