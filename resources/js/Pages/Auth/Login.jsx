import { useEffect } from 'react';
import Checkbox from '@/Components/Checkbox';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post(route('login'));
    };

    // Helper to auto-fill demo data
    const fillDemo = (role) => {
        if (role === 'admin') {
            setData({ ...data, email: 'admin@email.com', password: 'password' });
        } else {
            setData({ ...data, email: 'cashier@email.com', password: 'password' });
        }
    };

    return (
        <GuestLayout>
            <Head title="Log in" />

            <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-gray-800">Welcome Back</h2>
                <p className="text-sm text-gray-500 mt-1">Sign in to manage your store</p>
            </div>

            {/* --- DEMO BUTTONS SECTION --- */}
            <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3 text-center">
                    Click to try Demo Users
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => fillDemo('admin')}
                        className="flex flex-col items-center justify-center p-2 bg-white border border-blue-200 rounded-lg hover:bg-blue-100 transition shadow-sm group"
                    >
                        <span className="font-bold text-gray-700 group-hover:text-blue-700 text-sm">Admin</span>
                        <span className="text-xs text-gray-400 group-hover:text-blue-500">Full Access</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => fillDemo('cashier')}
                        className="flex flex-col items-center justify-center p-2 bg-white border border-blue-200 rounded-lg hover:bg-blue-100 transition shadow-sm group"
                    >
                        <span className="font-bold text-gray-700 group-hover:text-blue-700 text-sm">Cashier</span>
                        <span className="text-xs text-gray-400 group-hover:text-blue-500">POS Only</span>
                    </button>
                </div>
            </div>

            {status && <div className="mb-4 font-medium text-sm text-green-600">{status}</div>}

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="email" value="Email" />
                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                        autoComplete="username"
                        isFocused={true}
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="email@example.com"
                    />
                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password" value="Password" />
                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                    />
                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="block mt-4 flex justify-between items-center">
                    <label className="flex items-center">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                        />
                        <span className="ms-2 text-sm text-gray-600">Remember me</span>
                    </label>

                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="underline text-sm text-gray-600 hover:text-gray-900"
                        >
                            Forgot password?
                        </Link>
                    )}
                </div>

                <div className="flex items-center justify-end mt-6">
                    <PrimaryButton className="w-full justify-center py-3 bg-gray-900 hover:bg-black rounded-xl" disabled={processing}>
                        Sign in
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}