import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function Settings({ auth }) {
    const [settings, setSettings] = useState({
        store_name: '',
        store_address: '',
        store_phone: ''
    });
    const [logoFile, setLogoFile] = useState(null);
    const [preview, setPreview] = useState('/logo.png');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        axios.get('/api/settings').then(res => {
            setSettings(res.data);
            // Add timestamp to force refresh image cache
            setPreview(`/logo.png?t=${new Date().getTime()}`);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const handleChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        const formData = new FormData();
        formData.append('store_name', settings.store_name);
        formData.append('store_address', settings.store_address);
        formData.append('store_phone', settings.store_phone || '');

        if (logoFile) {
            formData.append('store_logo', logoFile);
        }

        try {
            await axios.post('/api/settings', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            Swal.fire({
                icon: 'success',
                title: 'Settings Saved',
                text: 'Store configuration has been updated.',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                // Reload to reflect logo change in Navbar
                window.location.reload();
            });

        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to save settings.',
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <AuthenticatedLayout user={auth?.user}>
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        </AuthenticatedLayout>
    );

    return (
        <AuthenticatedLayout user={auth?.user} header={<h2 className="font-semibold text-xl text-gray-800">Settings</h2>}>
            <Head title="Store Settings" />

            <div className="py-6 sm:py-12 bg-gray-50 min-h-screen">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Header */}
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800">Store Configuration</h3>
                            <p className="text-sm text-gray-500">Manage your store identity and contact details.</p>
                        </div>

                        <div className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-6">

                                {/* LOGO SECTION */}
                                <div className="flex flex-col sm:flex-row items-center gap-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <div className="relative shrink-0">
                                        <div className="h-24 w-24 rounded-full border-4 border-white shadow-sm overflow-hidden bg-white flex items-center justify-center">
                                            <img
                                                src={preview}
                                                alt="Store Logo"
                                                className="h-full w-full object-contain"
                                                onError={(e) => {e.target.src='https://via.placeholder.com/150?text=Logo'}}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 text-center sm:text-left">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Store Logo</label>
                                        <p className="text-xs text-gray-500 mb-3">Upload a square PNG or JPG (Max 2MB).</p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="block w-full text-sm text-gray-500
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-full file:border-0
                                                file:text-xs file:font-bold
                                                file:bg-blue-600 file:text-white
                                                hover:file:bg-blue-700
                                                cursor-pointer"
                                        />
                                    </div>
                                </div>

                                {/* INPUTS */}
                                <div className="space-y-4">
                                    {/* Store Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" /></svg>
                                            </div>
                                            <input
                                                name="store_name"
                                                value={settings.store_name || ''}
                                                onChange={handleChange}
                                                className="pl-10 w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                placeholder="e.g. My Coffee Shop"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Address */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.62.829.799 1.654 1.381 2.274 1.766.311.192.571.337.757.433a5.734 5.734 0 00.281.14l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" /></svg>
                                            </div>
                                            <input
                                                name="store_address"
                                                value={settings.store_address || ''}
                                                onChange={handleChange}
                                                className="pl-10 w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                placeholder="e.g. 123 Main St, Manila"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 012.43 8.326 13.019 13.019 0 012 5V3.5z" clipRule="evenodd" /></svg>
                                            </div>
                                            <input
                                                name="store_phone"
                                                value={settings.store_phone || ''}
                                                onChange={handleChange}
                                                className="pl-10 w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                placeholder="e.g. (02) 8123-4567"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Action */}
                                <div className="pt-4 flex flex-col sm:flex-row justify-end gap-3 border-t border-gray-100">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className={`w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2
                                            ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {saving ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}