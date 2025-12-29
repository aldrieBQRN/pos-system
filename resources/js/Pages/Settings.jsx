import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

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
            alert('Settings Saved Successfully!');
        } catch (error) {
            alert('Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <AuthenticatedLayout><div>Loading...</div></AuthenticatedLayout>;

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Store Settings</h2>}
        >
            <Head title="Settings" />

            <div className="py-12">
                <div className="max-w-2xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <h3 className="text-lg font-bold mb-4">Receipt Information</h3>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Store Name</label>
                                <input 
                                    name="store_name" 
                                    value={settings.store_name} 
                                    onChange={handleChange}
                                    className="mt-1 w-full border-gray-300 rounded-md shadow-sm"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Address</label>
                                <input 
                                    name="store_address" 
                                    value={settings.store_address} 
                                    onChange={handleChange}
                                    className="mt-1 w-full border-gray-300 rounded-md shadow-sm"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                                <input 
                                    name="store_phone" 
                                    value={settings.store_phone} 
                                    onChange={handleChange}
                                    className="mt-1 w-full border-gray-300 rounded-md shadow-sm"
                                />
                            </div>

                            <div className="pt-4">
                                <button 
                                    type="submit" 
                                    disabled={saving}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
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