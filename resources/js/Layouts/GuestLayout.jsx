import { Link } from '@inertiajs/react';
import { useState } from 'react';

export default function Guest({ children }) {
    const [logoError, setLogoError] = useState(false);

    return (
        <div className="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-gray-50">
            {/* Logo Section */}
            <div className="mb-6">
                <Link href="/">
                    {!logoError ? (
                        <img 
                            src="/logo.png" 
                            alt="Store Logo" 
                            className="w-24 h-24 object-contain"
                            onError={() => setLogoError(true)} 
                        />
                    ) : (
                        // Fallback Icon if no logo
                        <div className="flex flex-col items-center gap-2 text-blue-600">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16">
                                <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" clipRule="evenodd" />
                            </svg>
                        </div>
                    )}
                </Link>
            </div>

            {/* Login Card */}
            <div className="w-full sm:max-w-md mt-2 px-8 py-8 bg-white shadow-xl overflow-hidden sm:rounded-2xl border border-gray-100">
                {children}
            </div>
            
            <div className="mt-8 text-center text-xs text-gray-400">
                &copy; {new Date().getFullYear()} POS System. All rights reserved.
            </div>
        </div>
    );
}