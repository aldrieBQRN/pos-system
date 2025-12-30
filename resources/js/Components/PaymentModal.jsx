import React, { useState, useEffect } from 'react';

export default function PaymentModal({ total, onClose, onConfirm, isProcessing }) {
    const [method, setMethod] = useState('cash'); // 'cash' or 'gcash'
    const [cashGiven, setCashGiven] = useState('');
    const [reference, setReference] = useState('');
    const [change, setChange] = useState(0);

    // Calculate change whenever cashGiven is typed
    useEffect(() => {
        if (method === 'cash') {
            const given = parseFloat(cashGiven) || 0;
            setChange(given - total);
        }
    }, [cashGiven, total, method]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm({
            method,
            cashGiven: method === 'cash' ? parseFloat(cashGiven) : null,
            reference: method === 'gcash' ? reference : null
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Payment</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    
                    {/* Amount Display */}
                    <div className="text-center mb-8">
                        <div className="text-sm text-gray-500 uppercase tracking-wide font-semibold">Total Amount</div>
                        <div className="text-4xl font-extrabold text-blue-600">${total.toFixed(2)}</div>
                    </div>

                    {/* Payment Method Tabs */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button
                            type="button"
                            onClick={() => setMethod('cash')}
                            className={`flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-all duration-200
                                ${method === 'cash' 
                                    ? 'border-green-500 bg-green-50 text-green-700 shadow-md transform scale-105' 
                                    : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                        >
                            {/* CASH ICON */}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                            </svg>
                            <span className="font-bold">Cash</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setMethod('gcash')}
                            className={`flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-all duration-200
                                ${method === 'gcash' 
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md transform scale-105' 
                                    : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                        >
                            {/* GCASH / MOBILE ICON */}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                            </svg>
                            <span className="font-bold">GCash</span>
                        </button>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">
                        {method === 'cash' ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cash Given</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-gray-500">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            autoFocus
                                            required
                                            className="w-full pl-7 pr-4 py-3 text-lg border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 transition-shadow"
                                            value={cashGiven}
                                            onChange={(e) => setCashGiven(e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className={`p-4 rounded-lg flex justify-between items-center transition-colors ${change >= 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                    <span className="font-semibold">Change:</span>
                                    <span className="text-xl font-bold">${change >= 0 ? change.toFixed(2) : '0.00'}</span>
                                </div>
                            </>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                                <input
                                    type="text"
                                    autoFocus
                                    required
                                    className="w-full px-4 py-3 text-lg border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    placeholder="Enter last 4 digits..."
                                />
                                <p className="text-xs text-gray-500 mt-2">Verify payment on your phone before confirming.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-8 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isProcessing || (method === 'cash' && change < 0)}
                            className={`flex-1 py-3 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all
                                ${isProcessing 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
                        >
                            {isProcessing ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                    Complete Payment
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}