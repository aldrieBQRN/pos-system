import React, { useState, useEffect, useRef } from 'react';

export default function PaymentModal({ total, onClose, onConfirm, isProcessing }) {
    const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' or 'gcash'
    const [cashGiven, setCashGiven] = useState('');
    const [referenceNumber, setReferenceNumber] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, [paymentMethod]); // Re-focus when switching tabs

    // Calculations
    const totalCents = total * 100;
    const cashCents = parseFloat(cashGiven || 0) * 100;
    const change = cashCents - totalCents;

    // Validation Logic
    const canCheckout = paymentMethod === 'cash' 
        ? cashCents >= totalCents 
        : referenceNumber.length > 4; // Require at least 5 chars for Ref #

    const handleSubmit = (e) => {
        e.preventDefault();
        if (canCheckout && !isProcessing) {
            onConfirm({
                method: paymentMethod,
                cashGiven: paymentMethod === 'cash' ? parseFloat(cashGiven) : null,
                reference: paymentMethod === 'gcash' ? referenceNumber : null
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white w-96 rounded-2xl shadow-2xl overflow-hidden">
                
                {/* Header with Tabs */}
                <div className="bg-gray-50 border-b">
                    <div className="flex justify-between items-center px-6 py-4">
                        <h3 className="font-bold text-lg text-gray-700">Payment</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                    </div>
                    
                    {/* TABS */}
                    <div className="flex p-2 gap-2 bg-gray-100 mx-4 mb-4 rounded-lg">
                        <button 
                            type="button"
                            onClick={() => setPaymentMethod('cash')}
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                                paymentMethod === 'cash' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            💵 CASH
                        </button>
                        <button 
                            type="button"
                            onClick={() => setPaymentMethod('gcash')}
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                                paymentMethod === 'gcash' ? 'bg-blue-600 shadow text-white' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            📱 GCash
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 pt-2">
                    {/* Total Display */}
                    <div className="text-center mb-6">
                        <div className="text-sm text-gray-500 uppercase font-bold tracking-wider">Total Due</div>
                        <div className="text-4xl font-extrabold text-gray-800">${total.toFixed(2)}</div>
                    </div>

                    {/* --- CASH UI --- */}
                    {paymentMethod === 'cash' && (
                        <>
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-gray-600 mb-2">Cash Received</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3 text-gray-400 font-bold">$</span>
                                    <input 
                                        ref={inputRef}
                                        type="number" step="0.01" 
                                        className="w-full pl-8 pr-4 py-3 text-xl font-bold border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                        placeholder="0.00"
                                        value={cashGiven}
                                        onChange={(e) => setCashGiven(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className={`mb-8 p-4 rounded-xl text-center ${cashCents >= totalCents ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                <div className="text-sm font-bold uppercase text-gray-500">
                                    {cashCents >= totalCents ? 'Change Due' : 'Remaining Balance'}
                                </div>
                                <div className={`text-2xl font-bold ${cashCents >= totalCents ? 'text-green-700' : 'text-red-600'}`}>
                                    ${Math.abs(change / 100).toFixed(2)}
                                </div>
                            </div>
                        </>
                    )}

                    {/* --- GCASH UI --- */}
                    {paymentMethod === 'gcash' && (
                        <div className="mb-8">
                            <label className="block text-sm font-semibold text-blue-600 mb-2">GCash Reference No.</label>
                            <input 
                                ref={inputRef}
                                type="text" 
                                className="w-full px-4 py-3 text-lg font-mono border-2 border-blue-100 bg-blue-50 rounded-xl focus:border-blue-500 focus:outline-none text-center tracking-widest"
                                placeholder="Last 4 digits or Full Ref"
                                value={referenceNumber}
                                onChange={(e) => setReferenceNumber(e.target.value)}
                            />
                            <p className="text-xs text-center text-gray-400 mt-2">Verify receipt on phone before confirming.</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button 
                        type="submit"
                        disabled={!canCheckout || isProcessing}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all 
                            ${!canCheckout || isProcessing ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                        {isProcessing ? 'Processing...' : `Confirm ${paymentMethod.toUpperCase()} Payment`}
                    </button>
                </form>
            </div>
        </div>
    );
}