import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import Swal from 'sweetalert2'; // <--- 1. Import SweetAlert

export default function Settings() {
    const [settings, setSettings] = useState({
        store_name: '',
        store_address: '',
        store_phone: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        axios.get('/api/settings').then(res => {
            setSettings(res.data);
            setLoading(false);
        });
    }, []);

    const handleChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.post('/api/settings', settings);
            
            // 2. Use SweetAlert Success
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: 'Store settings have been updated.',
                timer: 1500,
                showConfirmButton: false
            });

        } catch (error) {
            // 3. Use SweetAlert Error
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
                        <h3 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">Receipt Configuration</h3>
                        
                        <form onSubmit={handleSubmit} className="space-y-5">
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
                                    {saving ? 'Saving...' : 'Save Settings'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}