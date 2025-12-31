import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import Barcode from '@/Components/Barcode'; 
import MobileScanner from '@/Components/MobileScanner';
import CategoryManager from '@/Components/CategoryManager';
import Swal from 'sweetalert2'; 
import { printLabels } from '@/Utils/printLabels'; 

export default function Inventory({ auth }) {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]); 
    const [links, setLinks] = useState([]); 
    const [totalRecords, setTotalRecords] = useState(0); 
    const [currentPage, setCurrentPage] = useState(1); 
    
    const [showModal, setShowModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [showLowStock, setShowLowStock] = useState(false); 

    const [formData, setFormData] = useState({
        name: '', category_id: '', price: '', cost_price: '', stock_quantity: '', sku: '', image: null
    });

    useEffect(() => { loadCategories(); }, []);

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            loadProducts();
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [searchTerm, filterCategory, showLowStock]);

    const loadProducts = async (url = '/api/products') => {
        try {
            const response = await axios.get(url, {
                params: {
                    search: searchTerm,
                    category: filterCategory,
                    low_stock: showLowStock
                }
            });
            setProducts(response.data.data);
            setLinks(response.data.links); 
            setTotalRecords(response.data.total); 
            setCurrentPage(response.data.current_page); 
        } catch (error) {
            console.error("Error loading products:", error);
        }
    };

    const loadCategories = async () => {
        try { const response = await axios.get('/api/categories'); setCategories(response.data); } catch (e) {}
    };

    const handleQuickAdd = async (product) => {
        const { value: quantity } = await Swal.fire({
            title: `Add Stock: ${product.name}`,
            input: 'number',
            inputLabel: 'Quantity to add',
            inputPlaceholder: 'Enter amount...',
            showCancelButton: true,
            confirmButtonText: 'Add Stock',
            inputValidator: (value) => {
                if (!value || value <= 0) return 'You need to write a positive number!';
            }
        });

        if (quantity) {
            try {
                await axios.post(`/api/products/${product.id}/stock`, { quantity: quantity });
                Swal.fire({ icon: 'success', title: 'Stock Updated', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
                loadProducts(); 
            } catch (error) {
                Swal.fire('Error', 'Failed to update stock', 'error');
            }
        }
    };

    const exportCSV = async () => {
        Swal.fire({ title: 'Exporting...', didOpen: () => Swal.showLoading() });
        try {
            const response = await axios.get('/api/products', {
                params: { search: searchTerm, category: filterCategory, low_stock: showLowStock, all: true }
            });
            const allData = response.data;
            if (allData.length === 0) { Swal.close(); return Swal.fire('Info', 'No data to export', 'info'); }

            let csvContent = "data:text/csv;charset=utf-8,SKU,Name,Category,Price,Cost,Stock\n";
            allData.forEach(p => {
                const safeName = p.name.replace(/"/g, '""');
                const row = `${p.sku},"${safeName}",${p.category?.name || 'Uncategorized'},${(p.price / 100).toFixed(2)},${p.cost_price ? (p.cost_price / 100).toFixed(2) : '0.00'},${p.stock_quantity}`;
                csvContent += row + "\n";
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `inventory_export_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            Swal.close();
        } catch (error) { Swal.fire('Error', 'Failed to export', 'error'); }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleFileChange = (e) => setFormData({ ...formData, image: e.target.files[0] });
    const generateSKU = () => { const r = Math.floor(10000000 + Math.random() * 90000000).toString(); setFormData({ ...formData, sku: r }); };
    
    const handleScan = (d) => { setFormData(p => ({ ...p, sku: d })); setShowScanner(false); new Audio('/beep.mp3').play().catch(()=>{}); };
    const openAddModal = () => { setEditMode(false); setEditingId(null); setFormData({ name: '', category_id: '', price: '', cost_price: '', stock_quantity: '', sku: '', image: null }); setShowModal(true); };
    const openEditModal = (p) => { setEditMode(true); setEditingId(p.id); setFormData({ name: p.name, category_id: p.category_id || '', price: (p.price / 100).toFixed(2), cost_price: p.cost_price ? (p.cost_price / 100).toFixed(2) : '', stock_quantity: p.stock_quantity, sku: p.sku, image: null }); setShowModal(true); };
    
    const handleSubmit = async (e) => {
        e.preventDefault(); setIsSaving(true);
        const data = new FormData();
        data.append('name', formData.name); data.append('category_id', formData.category_id); data.append('price', formData.price); data.append('cost_price', formData.cost_price); data.append('stock_quantity', formData.stock_quantity); data.append('sku', formData.sku); if(formData.image) data.append('image', formData.image);
        try {
            if(editMode) { data.append('_method', 'PUT'); await axios.post(`/api/products/${editingId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }); }
            else { await axios.post('/api/products', data, { headers: { 'Content-Type': 'multipart/form-data' } }); }
            setShowModal(false); loadProducts(); Swal.fire({ icon: 'success', title: 'Saved!', showConfirmButton: false, timer: 1500 });
        } catch(err) { Swal.fire('Error', 'Failed to save', 'error'); } finally { setIsSaving(false); }
    };
    const handleDelete = async (id) => { const r = await Swal.fire({ title: 'Are you sure?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Yes' }); if(r.isConfirmed) { await axios.delete(`/api/products/${id}`); loadProducts(); Swal.fire('Deleted!', '', 'success'); } };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800">Inventory</h2>}>
            <Head title="Inventory" />

            <div className="py-12 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                    
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h1 className="text-3xl font-bold text-gray-800">Inventory</h1>
                        <div className="flex gap-2">
                            <button onClick={exportCSV} className="bg-white text-green-600 border border-green-600 px-4 py-2 rounded-lg font-bold hover:bg-green-50 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                                Export
                            </button>
                            <button onClick={() => setShowCategoryManager(true)} className="bg-white text-gray-700 px-4 py-2 rounded-lg font-bold border hover:bg-gray-50">Categories</button>
                            <button onClick={openAddModal} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow">+ Add Product</button>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <input type="text" placeholder="Search product..." className="pl-10 pr-4 py-2 border rounded-lg w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="border rounded-lg py-2 pl-3 pr-10 w-full sm:w-48">
                            <option value="">All Categories</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button onClick={() => setShowLowStock(!showLowStock)} className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 border transition-all whitespace-nowrap ${showLowStock ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                            {showLowStock ? 'Low Stock Only' : 'Show Low Stock'}
                        </button>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b text-gray-600 uppercase text-xs">
                                    <tr>
                                        <th className="p-4 w-32">Barcode</th>
                                        <th className="p-4">Product</th>
                                        <th className="p-4">Category</th>
                                        <th className="p-4">Price</th>
                                        <th className="p-4">Stock</th>
                                        <th className="p-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {products.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50">
                                            <td className="p-4"><Barcode value={p.sku} width={1} height={25} fontSize={10} /></td>
                                            <td className="p-4 flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-50 rounded border flex items-center justify-center overflow-hidden">
                                                    {p.image_path ? <img src={p.image_path} className="w-full h-full object-cover"/> : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-300"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                                                    )}
                                                </div>
                                                <span className="font-bold text-gray-800">{p.name}</span>
                                            </td>
                                            <td className="p-4 text-gray-500">{p.category?.name || 'Uncategorized'}</td>
                                            <td className="p-4 font-bold text-green-600">${(p.price / 100).toFixed(2)}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${p.stock_quantity <= 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{p.stock_quantity} units</span>
                                                    <button onClick={() => handleQuickAdd(p)} className="w-6 h-6 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center font-bold" title="Quick Add Stock">+</button>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center flex justify-center gap-2">
                                                <button onClick={() => openEditModal(p)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg></button>
                                                <button onClick={() => printLabels(p)} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full" title="Print Labels"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg></button>
                                                <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* PAGINATION ADJUSTED */}
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
                            <span className="text-sm text-gray-500">
                                Page <span className="font-bold">{currentPage}</span>
                            </span>
                            <div className="flex gap-1">
                                {links.map((link, index) => (
                                    <button
                                        key={index}
                                        disabled={!link.url || link.active}
                                        onClick={() => link.url && loadProducts(link.url)}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1 rounded text-sm font-medium border transition-colors
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
            </div>

            {/* MODALS */}
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
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <select name="category_id" value={formData.category_id} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500" required>
                                        <option value="">Select...</option>
                                        {categories.map(cat => ( <option key={cat.id} value={cat.id}>{cat.name}</option> ))}
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
                                        <button type="button" onClick={() => setShowScanner(true)} className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-200 border border-blue-200 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg></button>
                                        <button type="button" onClick={generateSKU} className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 border border-gray-300 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg></button>
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

            {showCategoryManager && <CategoryManager onClose={() => setShowCategoryManager(false)} onUpdate={loadCategories} />}
            {showScanner && <MobileScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
        </AuthenticatedLayout>
    );
}