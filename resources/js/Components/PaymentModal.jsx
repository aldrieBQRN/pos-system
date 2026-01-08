import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2'; // Ensure this is imported for mobile alerts

export default function PaymentModal({ total, onClose, onConfirm, isProcessing }) {
    const [method, setMethod] = useState('cash'); // 'cash' or 'gcash'
    const [cashGiven, setCashGiven] = useState('');
    const [reference, setReference] = useState('');
    const [change, setChange] = useState(0);

    // Calculate change automatically
    useEffect(() => {
        if (method === 'cash') {
            const given = parseFloat(cashGiven) || 0;
            setChange(given - total);
        }
    }, [cashGiven, total, method]);

    // --- MANUAL SUBMIT HANDLER (Fixes Mobile Issue) ---
    const handleManualSubmit = () => {
        // 1. Validation for CASH
        if (method === 'cash') {
            const given = parseFloat(cashGiven);

            // Check if empty or invalid
            if (isNaN(given) || !cashGiven) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Enter Cash Amount',
                    text: 'Please enter the amount received.',
                    timer: 2000,
                    showConfirmButton: false
                });
                return;
            }

            // Check if sufficient
            if (given < total) {
                Swal.fire({
                    icon: 'error',
                    title: 'Insufficient Cash',
                    text: `You need ₱${Math.abs(change).toFixed(2)} more.`,
                    timer: 2000,
                    showConfirmButton: false
                });
                return;
            }
        }

        // 2. Validation for GCASH
        if (method === 'gcash') {
            if (!reference.trim()) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Missing Reference',
                    text: 'Please enter the payment reference number.',
                    timer: 2000,
                    showConfirmButton: false
                });
                return;
            }
        }

        // 3. Proceed if Valid (Send data to parent)
        onConfirm({
            method,
            cashGiven: method === 'cash' ? parseFloat(cashGiven) : null,
            reference: method === 'gcash' ? reference : null
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 transition-opacity">

            {/* Modal Container */}
            <div className="bg-white w-full max-w-md h-[90vh] sm:h-auto rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up sm:animate-fade-in">

                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-gray-800">Checkout</h2>
                    <button onClick={onClose} className="p-2 bg-gray-200 rounded-full text-gray-600 hover:bg-red-100 hover:text-red-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* Amount Display */}
                    <div className="text-center mb-8">
                        <div className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-1">Total Amount</div>
                        <div className="text-5xl font-extrabold text-blue-600">₱{total.toFixed(2)}</div>
                    </div>

                    {/* Payment Method Tabs */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button
                            type="button"
                            onClick={() => setMethod('cash')}
                            className={`flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-all duration-200 gap-2
                                ${method === 'cash'
                                    ? 'border-green-500 bg-green-50 text-green-700 shadow-sm transform scale-[1.02]'
                                    : 'border-gray-100 bg-white text-gray-500 hover:border-gray-300'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-bold text-sm">CASH</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setMethod('gcash')}
                            className={`flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-all duration-200 gap-2
                                ${method === 'gcash'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm transform scale-[1.02]'
                                    : 'border-gray-100 bg-white text-gray-500 hover:border-gray-300'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                            </svg>
                            <span className="font-bold text-sm">GCASH</span>
                        </button>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">
                        {method === 'cash' ? (
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cash Received</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3.5 text-gray-400 font-bold">₱</span>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        step="0.01"
                                        autoFocus
                                        className="w-full pl-8 pr-4 py-3 text-xl font-bold border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                                        value={cashGiven}
                                        onChange={(e) => setCashGiven(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className={`mt-4 p-3 rounded-lg flex justify-between items-center ${change >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    <span className="font-bold text-sm">Change Due:</span>
                                    <span className="text-xl font-extrabold">₱{change >= 0 ? change.toFixed(2) : '0.00'}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Reference No.</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoFocus
                                    className="w-full px-4 py-3 text-lg font-mono border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    placeholder="Last 4 digits..."
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions (Sticky Bottom) */}
                <div className="p-4 border-t bg-white shrink-0 pb-6 sm:pb-4">
                    <button
                        type="button" // Important: Regular button, not submit
                        onClick={handleManualSubmit} // Directly calls the function
                        disabled={isProcessing}
                        className={`w-full py-4 text-white font-bold text-lg rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]
                            ${isProcessing
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {isProcessing ? (
                            <>Processing...</>
                        ) : (
                            <>Confirm Payment & Print</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}