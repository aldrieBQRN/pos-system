import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { printZRead } from '@/Utils/printZRead';

export default function ShiftModal({ isOpen, mode = 'start', settings, onClose, onShiftCompleted }) {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState(null);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setSummary(null);
        }
    }, [isOpen, mode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (mode === 'start') {
                // --- START SHIFT ---
                const res = await axios.post('/api/shift/start', { amount: parseFloat(amount) });

                Swal.fire({
                    icon: 'success',
                    title: 'Shift Started',
                    text: `Register opened with ₱${parseFloat(amount).toFixed(2)}`,
                    timer: 1500,
                    showConfirmButton: false
                });

                onShiftCompleted(res.data);
            } else {
                // --- CLOSE SHIFT (PREVIEW) ---
                const res = await axios.post('/api/shift/close', { actual_cash: parseFloat(amount) });
                setSummary(res.data);
            }
        } catch (error) {
            console.error(error);

            // Handle "Already Closed" Error (Race Condition)
            if (error.response && error.response.status === 404) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Shift Already Closed',
                    text: 'It seems this shift was already closed. The screen will now refresh.',
                }).then(() => {
                    onShiftCompleted({ status: 'closed_force_reset' });
                });
                return;
            }

            Swal.fire('Error', error.response?.data?.message || 'Something went wrong.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalClose = () => {
        // User clicked "Finish" on summary
        onShiftCompleted(summary);
        onClose();
    };

    const handleDismiss = () => {
        // If user clicks X while looking at Summary (Shift already closed in DB),
        // we must treat it as a completed action to update the UI button.
        if (summary) {
            onShiftCompleted(summary);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all">

                {/* Header */}
                <div className={`p-6 border-b text-white flex justify-between items-start ${mode === 'start' ? 'bg-blue-600' : 'bg-gray-800'}`}>
                    <div>
                        <h2 className="text-xl font-bold">
                            {summary ? 'Shift Report' : (mode === 'start' ? 'Start Shift' : 'Close Shift')}
                        </h2>
                        <p className="text-blue-100 text-sm opacity-80 mt-1 pr-4">
                            {summary
                                ? 'Review your session details below'
                                : (mode === 'start' ? 'Enter starting cash to begin sales' : 'Count cash drawer to finish shift')}
                        </p>
                    </div>

                    {/* CLOSE (X) BUTTON */}
                    <button
                        onClick={handleDismiss}
                        className="text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                        title="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {summary ? (
                        // --- SUMMARY VIEW (After Closing) ---
                        <div className="space-y-5 animate-fade-in">
                            <div className="bg-gray-50 p-5 rounded-xl space-y-3 border border-gray-200">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Starting Cash</span>
                                    <span className="font-bold text-gray-800">₱{Number(summary.starting_cash).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Cash Sales</span>
                                    <span className="font-bold text-green-600">+₱{Number(summary.cash_sales).toFixed(2)}</span>
                                </div>
                                <div className="border-t border-dashed border-gray-300 my-1"></div>
                                <div className="flex justify-between text-base">
                                    <span className="font-bold text-gray-700">Expected Cash</span>
                                    <span className="font-bold text-gray-900">₱{Number(summary.expected_cash).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-base">
                                    <span className="font-bold text-gray-700">Actual Count</span>
                                    <span className="font-bold text-blue-600">₱{Number(summary.actual_cash).toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Overage/Shortage Alert */}
                            <div className={`p-4 rounded-xl text-center border-2 ${
                                Math.abs(Number(summary.difference)) < 0.01
                                    ? 'bg-green-50 text-green-700 border-green-100'
                                    : Number(summary.difference) > 0
                                        ? 'bg-blue-50 text-blue-700 border-blue-100'
                                        : 'bg-red-50 text-red-700 border-red-100'
                            }`}>
                                <div className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">
                                    {Math.abs(Number(summary.difference)) < 0.01 ? 'Status' : (Number(summary.difference) > 0 ? 'Overage' : 'Shortage')}
                                </div>
                                <div className="text-2xl font-extrabold">
                                    {Math.abs(Number(summary.difference)) < 0.01
                                        ? 'Perfectly Balanced'
                                        : `₱${Math.abs(Number(summary.difference)).toFixed(2)}`
                                    }
                                </div>
                            </div>

                            {/* --- PRINT BUTTON --- */}
                            <button
                                onClick={() => printZRead(summary, settings)}
                                className="w-full py-3 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all flex justify-center items-center gap-2 shadow-sm mb-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                                </svg>
                                Print Z-Read Report
                            </button>

                            <button
                                onClick={handleFinalClose}
                                className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg active:scale-[0.98]"
                            >
                                Finish & Start New Shift
                            </button>
                        </div>
                    ) : (
                        // --- INPUT FORM ---
                        <form onSubmit={handleSubmit}>
                            <div className="mb-8">
                                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                                    {mode === 'start' ? 'Cash Float (Starting Money)' : 'Total Cash in Drawer'}
                                </label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-4 text-gray-400 font-bold text-xl group-focus-within:text-blue-500 transition-colors">₱</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        autoFocus
                                        min="0"
                                        className="w-full pl-10 pr-4 py-4 text-3xl font-bold border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-blue-500 transition-all placeholder-gray-300 text-gray-800"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleDismiss} // Cancel acts like X
                                    className="flex-1 py-3.5 bg-white border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={loading || !amount}
                                    className={`flex-1 py-3.5 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] flex justify-center items-center gap-2
                                        ${loading || !amount
                                            ? 'bg-gray-300 cursor-not-allowed'
                                            : (mode === 'start' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700')
                                        }`}
                                >
                                    {loading ? 'Processing...' : (mode === 'start' ? 'Open Register' : 'Close Register')}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}