import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2'; // <--- Import SweetAlert

export default function DeleteUserForm({ className = '' }) {
    const { data, setData, delete: destroy, processing, reset, errors } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => {
        Swal.fire({
            title: 'Are you sure?',
            text: "Once your account is deleted, all of its resources and data will be permanently deleted. Please enter your password to confirm you would like to permanently delete your account.",
            icon: 'warning',
            input: 'password', // Ask for password inside SweetAlert
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
                // We return a promise that resolves when the delete request finishes
                return new Promise((resolve, reject) => {
                    // Manually set the password into the form data
                    setData('password', password);
                    
                    // Trigger the delete
                    destroy(route('profile.destroy'), {
                        data: { password: password }, // Send password manually here
                        preserveScroll: true,
                        onSuccess: () => resolve(),
                        onError: () => {
                            // If password was wrong, show error inside SweetAlert
                            Swal.showValidationMessage('Incorrect password. Please try again.');
                            resolve(); // Resolve to stop the loading spinner
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
                <h2 className="text-lg font-medium text-gray-900">Delete Account</h2>
                <p className="mt-1 text-sm text-gray-600">
                    Once your account is deleted, all of its resources and data will be permanently deleted. Before
                    deleting your account, please download any data or information that you wish to retain.
                </p>
            </header>

            <button
                className="inline-flex items-center px-4 py-2 bg-red-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-red-500 active:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition ease-in-out duration-150"
                onClick={confirmUserDeletion}
            >
                Delete Account
            </button>
        </section>
    );
}