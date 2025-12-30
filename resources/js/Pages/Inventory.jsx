import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import Barcode from '@/Components/Barcode'; 
import MobileScanner from '@/Components/MobileScanner';
import Swal from 'sweetalert2'; 

export default function Inventory({ auth }) {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]); // <--- 1. Store Categories here
    const [links, setLinks] = useState([]); 
    const [showModal, setShowModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    const [editMode, setEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // 2. Updated FormData to use category_id
    const [formData, setFormData] = useState({
        name: '', category_id: '', price: '', cost_price: '', stock_quantity: '', sku: '', image: null
    });

    useEffect(() => { 
        loadProducts(); 
        loadCategories(); // <--- Fetch categories on load
    }, []);

    const loadProducts = async (url = '/api/products') => {
        try {
            const response = await axios.get(url);
            setProducts(response.data.data);
            setLinks(response.data.links); 
        } catch (error) {
            console.error("Error loading products:", error);
        }
    };

    // 3. New Helper: Fetch Categories
    const loadCategories = async () => {
        try {
            const response = await axios.get('/api/categories');
            setCategories(response.data);
        } catch (error) {
            console.error("Error loading categories:", error);
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleFileChange = (e) => setFormData({ ...formData, image: e.target.files[0] });

    const generateSKU = () => {
        const randomSku = Math.floor(10000000 + Math.random() * 90000000).toString();
        setFormData({ ...formData, sku: randomSku });
    };

    const handleScan = (decodedText) => {
        setFormData(prev => ({ ...prev, sku: decodedText }));
        setShowScanner(false);
        const audio = new Audio('/beep.mp3'); 
        audio.play().catch(e => {});
    };

    const openAddModal = () => {
        setEditMode(false);
        setEditingId(null);
        // Reset form with empty category_id
        setFormData({ name: '', category_id: '', price: '', cost_price: '', stock_quantity: '', sku: '', image: null });
        setShowModal(true);
    };

    const openEditModal = (product) => {
        setEditMode(true);
        setEditingId(product.id);
        setFormData({
            name: product.name,
            // 4. Load the existing ID (handle null case safely)
            category_id: product.category_id || '', 
            price: (product.price / 100).toFixed(2),
            cost_price: product.cost_price ? (product.cost_price / 100).toFixed(2) : '',
            stock_quantity: product.stock_quantity,
            sku: product.sku,
            image: null 
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const data = new FormData();
        data.append('name', formData.name);
        data.append('category_id', formData.category_id); // <--- Send ID
        data.append('price', formData.price);
        data.append('cost_price', formData.cost_price);
        data.append('stock_quantity', formData.stock_quantity);
        data.append('sku', formData.sku);
        if (formData.image) data.append('image', formData.image);

        try {
            if (editMode) {
                data.append('_method', 'PUT'); 
                await axios.post(`/api/products/${editingId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
                
                Swal.fire({
                    icon: 'success',
                    title: 'Updated!',
                    text: 'Product details have been updated.',
                    timer: 1500,
                    showConfirmButton: false
                });

            } else {
                await axios.post('/api/products', data, { headers: { 'Content-Type': 'multipart/form-data' } });
                
                Swal.fire({
                    icon: 'success',
                    title: 'Added!',
                    text: 'New product has been added to inventory.',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            setShowModal(false);
            loadProducts(); 
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: error.response?.data?.message || 'Something went wrong!',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`/api/products/${id}`);
                Swal.fire('Deleted!', 'Product has been removed.', 'success');
                loadProducts();
            } catch (error) {
                Swal.fire('Error!', 'Failed to delete product.', 'error');
            }
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Inventory</h2>}
        >
            <Head title="Inventory" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    
                    <div className="flex justify-between items-center mb-6 px-4 sm:px-0">
                        <h1 className="text-3xl font-bold text-gray-800">Inventory Management</h1>
                        <button onClick={openAddModal} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-lg">
                            + Add New Product
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 flex flex-col h-full">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="p-4 font-semibold text-gray-600 w-32">Barcode</th>
                                        <th className="p-4 font-semibold text-gray-600">Product</th>
                                        <th className="p-4 font-semibold text-gray-600">Category</th>
                                        <th className="p-4 font-semibold text-gray-600">Price</th>
                                        <th className="p-4 font-semibold text-gray-600">Stock</th>
                                        <th className="p-4 font-semibold text-gray-600 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="p-10 text-center text-gray-500">
                                                No products found. Add one to get started!
                                            </td>
                                        </tr>
                                    ) : (
                                        products.map((p) => (
                                            <tr key={p.id} className="border-b hover:bg-gray-50 transition-colors">
                                                <td className="p-4">
                                                    {p.sku ? (
                                                        <div className="py-1">
                                                            <Barcode value={p.sku} width={1} height={25} fontSize={10} />
                                                        </div>
                                                    ) : <span className="text-gray-400 text-xs">No SKU</span>}
                                                </td>
                                                <td className="p-4 flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-200 rounded-md overflow-hidden shrink-0 border border-gray-300">
                                                        {p.image_path ? (
                                                            <img src={p.image_path} alt="" className="w-full h-full object-cover"/>
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Img</div>
                                                        )}
                                                    </div>
                                                    <div className="font-medium text-gray-900">{p.name}</div>
                                                </td>
                                                
                                                {/* 5. Display Category Name safely */}
                                                <td className="p-4 text-gray-600">
                                                    {p.category ? (
                                                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">
                                                            {p.category.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">Uncategorized</span>
                                                    )}
                                                </td>

                                                <td className="p-4 font-bold text-green-600">${(p.price / 100).toFixed(2)}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${p.stock_quantity < 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                        {p.stock_quantity} units
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button onClick={() => openEditModal(p)} className="text-blue-600 hover:text-blue-900 font-medium text-sm mr-4 transition-colors">Edit</button>
                                                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 font-medium text-sm transition-colors">Delete</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* PAGINATION CONTROLS */}
                        <div className="p-4 border-t bg-gray-50 flex gap-2 justify-center">
                            {links.map((link, index) => (
                                <button
                                    key={index}
                                    disabled={!link.url || link.active}
                                    onClick={() => loadProducts(link.url)}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    className={`px-3 py-1 rounded border text-sm font-medium transition-colors
                                        ${link.active 
                                            ? 'bg-blue-600 text-white border-blue-600' 
                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                                        } 
                                        ${!link.url && 'opacity-50 cursor-not-allowed'}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 animate-fade-in-up max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 text-gray-800">{editMode ? 'Edit Product' : 'Add New Product'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                                <input name="name" required value={formData.name} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="e.g. Cappuccino" />
                            </div>
                            
                            <div className="flex gap-4">
                                {/* 6. DYNAMIC SELECT FROM DATABASE */}
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <select 
                                        name="category_id" 
                                        value={formData.category_id} 
                                        onChange={handleChange} 
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="">Select...</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                                    <input type="number" step="0.01" name="price" required value={formData.price} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="0.00" />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                                    <input type="number" name="stock_quantity" required value={formData.stock_quantity} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="0" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU / Barcode</label>
                                    <div className="flex gap-2">
                                        <input name="sku" required value={formData.sku} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono" placeholder="Scan..." />
                                        <button type="button" onClick={() => setShowScanner(true)} className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-200 border border-blue-200 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>
                                        </button>
                                        <button type="button" onClick={generateSKU} className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 border border-gray-300 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Image (Optional)</label>
                                <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-lg cursor-pointer"/>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
                                <button type="submit" disabled={isSaving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                                    {isSaving ? 'Saving...' : (editMode ? 'Update Product' : 'Save Product')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SCANNER OVERLAY */}
            {showScanner && (
                <MobileScanner 
                    onScan={handleScan} 
                    onClose={() => setShowScanner(false)} 
                />
            )}
        </AuthenticatedLayout>
    );
}