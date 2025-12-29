import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'; // <--- IMPORT THIS
import { Head } from '@inertiajs/react'; // <--- IMPORT THIS

export default function Inventory({ auth }) { // Receive 'auth' prop
    const [products, setProducts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Edit Mode State
    const [editMode, setEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        name: '', category: 'General', price: '', cost_price: '', stock_quantity: '', sku: '', image: null
    });

    useEffect(() => { loadProducts(); }, []);

    const loadProducts = async () => {
        const response = await axios.get('/api/products');
        setProducts(response.data.data);
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleFileChange = (e) => setFormData({ ...formData, image: e.target.files[0] });

    // Open Add Modal
    const openAddModal = () => {
        setEditMode(false);
        setEditingId(null);
        setFormData({ name: '', category: 'General', price: '', cost_price: '', stock_quantity: '', sku: '', image: null });
        setShowModal(true);
    };

    // Open Edit Modal
    const openEditModal = (product) => {
        setEditMode(true);
        setEditingId(product.id);
        setFormData({
            name: product.name,
            category: product.category || 'General',
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
        data.append('category', formData.category);
        data.append('price', formData.price);
        data.append('cost_price', formData.cost_price);
        data.append('stock_quantity', formData.stock_quantity);
        data.append('sku', formData.sku);
        if (formData.image) data.append('image', formData.image);

        try {
            if (editMode) {
                data.append('_method', 'PUT'); 
                await axios.post(`/api/products/${editingId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
                alert('Product Updated!');
            } else {
                await axios.post('/api/products', data, { headers: { 'Content-Type': 'multipart/form-data' } });
                alert('Product Added!');
            }
            setShowModal(false);
            loadProducts();
        } catch (error) {
            alert('Error: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure?')) return;
        await axios.delete(`/api/products/${id}`);
        loadProducts();
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Inventory</h2>}
        >
            <Head title="Inventory" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    
                    {/* Header Action */}
                    <div className="flex justify-between items-center mb-6 px-4 sm:px-0">
                        <h1 className="text-3xl font-bold text-gray-800">Inventory Management</h1>
                        <button onClick={openAddModal} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-lg">
                            + Add New Product
                        </button>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-600">Product</th>
                                    <th className="p-4 font-semibold text-gray-600">Category</th>
                                    <th className="p-4 font-semibold text-gray-600">Price</th>
                                    <th className="p-4 font-semibold text-gray-600">Stock</th>
                                    <th className="p-4 font-semibold text-gray-600 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((p) => (
                                    <tr key={p.id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="p-4 flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-200 rounded-md overflow-hidden shrink-0 border border-gray-300">
                                                {p.image_path ? (
                                                    <img src={p.image_path} alt="" className="w-full h-full object-cover"/>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Img</div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{p.name}</div>
                                                <div className="text-xs text-gray-400 font-mono">{p.sku}</div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-600">{p.category}</td>
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
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODAL (Kept exactly the same) */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 animate-fade-in-up">
                        <h2 className="text-xl font-bold mb-4 text-gray-800">{editMode ? 'Edit Product' : 'Add New Product'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                                <input name="name" required value={formData.name} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="e.g. Cappuccino" />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <select name="category" value={formData.category} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                        <option>General</option>
                                        <option>Food</option>
                                        <option>Beverages</option>
                                        <option>Bakery</option>
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
                                    <input name="sku" required value={formData.sku} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="SCAN-123" />
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
        </AuthenticatedLayout>
    );
}