import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function CategoryManager({ onClose, onUpdate }) {
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        const res = await axios.get('/api/categories');
        setCategories(res.data);
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newCategory.trim()) return;

        try {
            setLoading(true);
            await axios.post('/api/categories', { name: newCategory });
            setNewCategory('');
            fetchCategories();
            onUpdate(); 
            
            // CENTERED SUCCESS
            Swal.fire({ 
                icon: 'success', 
                title: 'Category Added!', 
                text: 'New category created successfully.',
                showConfirmButton: false, 
                timer: 1500 
            });

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to add category'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            // Confirm before delete
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
                await axios.delete(`/api/categories/${id}`);
                fetchCategories();
                onUpdate();
                
                // CENTERED SUCCESS
                Swal.fire({ 
                    icon: 'success', 
                    title: 'Deleted!', 
                    text: 'Category has been removed.',
                    showConfirmButton: false, 
                    timer: 1500 
                });
            }

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Cannot Delete',
                text: error.response?.data?.message || 'Category is in use or system error.'
            });
        }
    };

    const handleEdit = async (category) => {
        const { value: newName } = await Swal.fire({
            title: 'Rename Category',
            input: 'text',
            inputValue: category.name,
            showCancelButton: true,
            confirmButtonText: 'Update',
            inputValidator: (value) => {
                if (!value) return 'You need to write something!';
            }
        });

        if (newName && newName !== category.name) {
            try {
                await axios.put(`/api/categories/${category.id}`, { name: newName });
                fetchCategories();
                onUpdate();
                
                // CENTERED SUCCESS
                Swal.fire({ 
                    icon: 'success', 
                    title: 'Updated!', 
                    text: 'Category name has been changed.',
                    showConfirmButton: false, 
                    timer: 1500 
                });

            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to update category name.'
                });
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Manage Categories</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-2xl">&times;</button>
                </div>

                {/* Body */}
                <div className="p-6 flex-1 overflow-y-auto">
                    
                    {/* Add Form */}
                    <form onSubmit={handleAdd} className="flex gap-2 mb-6">
                        <input 
                            type="text" 
                            className="flex-1 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="New Category Name..."
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                        />
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                        >
                            Add
                        </button>
                    </form>

                    {/* List */}
                    <div className="space-y-2">
                        {categories.map(cat => (
                            <div key={cat.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border hover:border-blue-200 transition-colors">
                                <span className="font-medium text-gray-700">{cat.name}</span>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleEdit(cat)}
                                        className="text-blue-600 hover:bg-blue-100 p-1 rounded"
                                        title="Edit"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                        </svg>
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(cat.id)}
                                        className="text-red-500 hover:bg-red-100 p-1 rounded"
                                        title="Delete"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}