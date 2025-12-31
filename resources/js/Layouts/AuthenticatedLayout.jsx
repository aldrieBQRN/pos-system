import { useState } from 'react';
// import axios from 'axios'; <--- REMOVE THIS
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';

export default function AuthenticatedLayout({ header, children }) {
    // 1. Get 'settings' directly from the backend props
    const { auth, settings } = usePage().props; 
    const user = auth.user;
    
    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);
    const [logoError, setLogoError] = useState(false);

    // 2. Use the prop directly (Fall back to 'POS System' if empty)
    const storeName = settings?.store_name || 'POS System';

    // REMOVED: The useEffect and useState for storeName are no longer needed!

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="border-b border-gray-100 bg-white">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex">
                            {/* --- LOGO SECTION --- */}
                            <div className="flex shrink-0 items-center">
                                <Link href="/" className="flex items-center gap-4">
                                    {!logoError ? (
                                        <img 
                                            // Use a cache-buster (?v=...) so updates show instantly
                                            src={`/logo.png?v=${new Date().getDate()}`} 
                                            alt="Store Logo" 
                                            className="block h-10 w-auto object-contain"
                                            onError={() => setLogoError(true)} 
                                        />
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-blue-600">
                                            <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                    
                                    {/* --- STORE NAME --- */}
                                    <span className="font-medium text-lg text-gray-700 uppercase tracking-[0.2em] hidden md:block">
                                        {storeName}
                                    </span>
                                </Link>
                            </div>

                            {/* --- DESKTOP NAVIGATION --- */}
                            <div className="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex">
                                {user.is_admin && (
                                    <NavLink href={route('dashboard')} active={route().current('dashboard')}>
                                        Dashboard
                                    </NavLink>
                                )}
                                <NavLink href="/pos" active={window.location.pathname === '/pos'}>
                                    POS Terminal
                                </NavLink>
                                {user.is_admin && (
                                    <>
                                        <NavLink href="/inventory" active={window.location.pathname === '/inventory'}>
                                            Inventory
                                        </NavLink>
                                        <NavLink href="/transactions" active={window.location.pathname === '/transactions'}>
                                            Transactions
                                        </NavLink>
                                        <NavLink href={route('settings')} active={route().current('settings')}>
                                            Settings
                                        </NavLink>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* User Dropdown */}
                        <div className="hidden sm:ms-6 sm:flex sm:items-center">
                            <div className="relative ms-3">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <span className="inline-flex rounded-md">
                                            <button type="button" className="inline-flex items-center rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-500 transition duration-150 ease-in-out hover:text-gray-700 focus:outline-none">
                                                {user.name} ({user.is_admin ? 'Admin' : 'Cashier'})
                                                <svg className="-me-0.5 ms-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </span>
                                    </Dropdown.Trigger>

                                    <Dropdown.Content>
                                        <Dropdown.Link href={route('profile.edit')}>Profile</Dropdown.Link>
                                        <Dropdown.Link href={route('logout')} method="post" as="button">Log Out</Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        </div>

                        {/* Hamburger Button */}
                        <div className="-me-2 flex items-center sm:hidden">
                            <button onClick={() => setShowingNavigationDropdown((previousState) => !previousState)} className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none">
                                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                    <path className={!showingNavigationDropdown ? 'inline-flex' : 'hidden'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    <path className={showingNavigationDropdown ? 'inline-flex' : 'hidden'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- MOBILE NAVIGATION --- */}
                <div className={(showingNavigationDropdown ? 'block' : 'hidden') + ' sm:hidden'}>
                    <div className="space-y-1 pb-3 pt-2">
                        {user.is_admin && <ResponsiveNavLink href={route('dashboard')} active={route().current('dashboard')}>Dashboard</ResponsiveNavLink>}
                        <ResponsiveNavLink href="/pos" active={window.location.pathname === '/pos'}>POS Terminal</ResponsiveNavLink>
                        {user.is_admin && (
                            <>
                                <ResponsiveNavLink href="/inventory" active={window.location.pathname === '/inventory'}>Inventory</ResponsiveNavLink>
                                <ResponsiveNavLink href="/transactions" active={window.location.pathname === '/transactions'}>Transactions</ResponsiveNavLink>
                                <ResponsiveNavLink href={route('settings')} active={route().current('settings')}>Settings</ResponsiveNavLink>
                            </>
                        )}
                    </div>
                    <div className="border-t border-gray-200 pb-1 pt-4">
                        <div className="px-4">
                            <div className="text-base font-medium text-gray-800">{user.name}</div>
                            <div className="text-sm font-medium text-gray-500">{user.email}</div>
                        </div>
                        <div className="mt-3 space-y-1">
                            <ResponsiveNavLink href={route('profile.edit')}>Profile</ResponsiveNavLink>
                            <ResponsiveNavLink method="post" href={route('logout')} as="button">Log Out</ResponsiveNavLink>
                        </div>
                    </div>
                </div>
            </nav>

            {header && (
                <header className="bg-white shadow">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}
            <main>{children}</main>
        </div>
    );
}