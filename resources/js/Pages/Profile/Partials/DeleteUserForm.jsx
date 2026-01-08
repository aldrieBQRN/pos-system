import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function DeleteUserForm({ className = '' }) {
    const { setData, delete: destroy, reset } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => {
        Swal.fire({
            title: 'Are you sure?',
            text: "Once your account is deleted, all of its resources and data will be permanently deleted. Please enter your password to confirm.",
            icon: 'warning',
            input: 'password',
            inputPlaceholder: 'Password',
            inputAttributes: {
                autocapitalize: 'off',
                autocorrect: 'off'
            },
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete my account',
            showLoaderOnConfirm: true,
            preConfirm: (password) => {
                return new Promise((resolve, reject) => {
                    setData('password', password);

                    destroy(route('profile.destroy'), {
                        data: { password: password },
                        preserveScroll: true,
                        onSuccess: () => resolve(),
                        onError: () => {
                            Swal.showValidationMessage('Incorrect password. Please try again.');
                            resolve();
                        },
                        onFinish: () => reset(),
                    });
                });
            },
            allowOutsideClick: () => !Swal.isLoading()
        });
    };

    return (
        <section className={`space-y-6 ${className}`}>
            <header>
                <h2 className="text-lg font-bold text-gray-900">Delete Account</h2>
                <p className="mt-1 text-sm text-gray-600">
                    Once your account is deleted, all of its resources and data will be permanently deleted.
                </p>
            </header>

            <button
                className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                onClick={confirmUserDeletion}
            >
                Delete Account
            </button>
        </section>
    );
}