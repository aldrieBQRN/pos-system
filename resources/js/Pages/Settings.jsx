import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function Settings() {
    const [settings, setSettings] = useState({
        store_name: '',
        store_address: '',
        store_phone: ''
    });
    const [logoFile, setLogoFile] = useState(null); // To store the selected file
    const [preview, setPreview] = useState('/logo.png'); // Default preview
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        axios.get('/api/settings').then(res => {
            setSettings(res.data);
            // Add a timestamp to logo URL to force refresh browser cache if it exists
            setPreview(`/logo.png?t=${new Date().getTime()}`);
            setLoading(false);
        });
    }, []);

    const handleChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            // Create a temporary preview URL
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        // 1. Create FormData (Required for File Uploads)
        const formData = new FormData();
        formData.append('store_name', settings.store_name);
        formData.append('store_address', settings.store_address);
        formData.append('store_phone', settings.store_phone || '');
        
        if (logoFile) {
            formData.append('store_logo', logoFile);
        }

        try {
            // Important: Send formData, not the JSON object
            await axios.post('/api/settings', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: 'Store settings and logo updated.',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                // Reload page to see the new logo in the Navbar immediately
                window.location.reload();
            });

        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Failed to save settings. Please try again.',
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <AuthenticatedLayout>
            <div className="flex h-screen items-center justify-center text-gray-500">
                Loading Settings...
            </div>
        </AuthenticatedLayout>
    );

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Store Settings</h2>}
        >
            <Head title="Settings" />

            <div className="py-12">
                <div className="max-w-2xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <h3 className="text-lg font-bold mb-6 text-gray-800 border-b pb-2">Configuration</h3>
                        
                        <form onSubmit={handleSubmit} className="space-y-6">
                            
                            {/* --- LOGO UPLOAD SECTION --- */}
                            <div className="flex flex-col items-center sm:flex-row gap-6 mb-6">
                                <div className="shrink-0">
                                    <p className="block text-sm font-medium text-gray-700 mb-2 sm:hidden">Store Logo</p>
                                    <div className="h-24 w-24 border rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
                                        <img 
                                            src={preview} 
                                            alt="Logo Preview" 
                                            className="h-full w-full object-contain"
                                            onError={(e) => {e.target.src='https://via.placeholder.com/150?text=No+Logo'}} 
                                        />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700">Update Logo</label>
                                    <p className="text-xs text-gray-500 mb-2">Recommended: PNG, Transparent Background (Max 2MB)</p>
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="block w-full text-sm text-gray-500
                                            file:mr-4 file:py-2 file:px-4
                                            file:rounded-full file:border-0
                                            file:text-sm file:font-semibold
                                            file:bg-blue-50 file:text-blue-700
                                            hover:file:bg-blue-100
                                            cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* --- TEXT FIELDS --- */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Store Name</label>
                                <input 
                                    name="store_name" 
                                    value={settings.store_name || ''} 
                                    onChange={handleChange}
                                    className="mt-1 w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    placeholder="e.g. My Coffee Shop"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Store Address</label>
                                <input 
                                    name="store_address" 
                                    value={settings.store_address || ''} 
                                    onChange={handleChange}
                                    className="mt-1 w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    placeholder="e.g. 123 Main St, Manila"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                                <input 
                                    name="store_phone" 
                                    value={settings.store_phone || ''} 
                                    onChange={handleChange}
                                    className="mt-1 w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    placeholder="e.g. (02) 8123-4567"
                                />
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button 
                                    type="submit" 
                                    disabled={saving}
                                    className={`bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-md transition-all
                                        ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}