import React, { useState } from 'react';
import axios from 'axios';
import useCartStore from '@/Stores/useCartStore';
import { printReceipt } from '@/Utils/printReceipt';
import PaymentModal from './PaymentModal'; 
import Swal from 'sweetalert2';

export default function CartSidebar({ settings, showPaymentModal, setShowPaymentModal, onClose }) {
    const { cart, addToCart, removeFromCart, clearCart, toggleSenior, isSenior, getComputations } = useCartStore();
    const [isProcessing, setIsProcessing] = useState(false);
    
    const formatPrice = (cents) => `$${(cents / 100).toFixed(2)}`;
    const { subtotal, discount, total } = getComputations();

    // --- 1. CLEAR CART ---
    const handleClearCart = async () => {
        if (cart.length === 0) return;
        
        const result = await Swal.fire({
            title: 'Clear Cart?',
            text: "Remove all items?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, clear it!'
        });

        if (result.isConfirmed) {
            clearCart();
        }
    };

    // --- 2. HOLD ORDER ---
    const handleHoldOrder = async () => {
        if (cart.length === 0) return;

        const { value: note } = await Swal.fire({
            title: 'Hold Order',
            input: 'text',
            inputLabel: 'Reference Note (Optional)',
            inputPlaceholder: 'e.g. Table 5 or Customer Name',
            showCancelButton: true,
            confirmButtonText: 'Hold Order',
            confirmButtonColor: '#f59e0b' // Amber/Yellow color
        });

        // Check if user clicked cancel (note will be undefined)
        if (note !== undefined) {
            try {
                await axios.post('/api/held-orders', {
                    cart: cart,
                    total: total,
                    note: note || `Order #${Math.floor(Math.random() * 1000)}`
                });
                
                clearCart();
                Swal.fire({ 
                    icon: 'success', 
                    title: 'Order Held', 
                    toast: true, 
                    position: 'top-end', 
                    showConfirmButton: false, 
                    timer: 1500 
                });
                
                // If on mobile, close the cart sidebar
                if (onClose) onClose(); 

            } catch (error) {
                Swal.fire('Error', 'Failed to hold order', 'error');
            }
        }
    };

    // --- 3. CHECKOUT ---
    const handleFinalizePayment = async (paymentDetails) => {
        setIsProcessing(true);
        try {
            // Calculate change for database record
            const totalInUnits = total / 100;
            const cashGiven = paymentDetails.cashGiven ? parseFloat(paymentDetails.cashGiven) : 0;
            const change = paymentDetails.method === 'cash' ? (cashGiven - totalInUnits) : 0;

            const response = await axios.post('/api/checkout', {
                cart: cart.map(item => ({ id: item.id, quantity: item.quantity })),
                payment_method: paymentDetails.method,
                reference: paymentDetails.reference, 
                is_senior: isSenior,
                cash_given: cashGiven,
                change: change
            });

            if (response.data.success) {
                const receiptData = {
                    invoice_number: `INV-${response.data.sale_id}`,
                    cashier_id: "Admin", // Ideally fetch from Auth prop
                    items: [...cart],
                    subtotal: subtotal,
                    discount: discount,
                    total: total,
                    is_senior: isSenior,
                    payment_method: paymentDetails.method,
                    cash_given: cashGiven * 100, // Back to cents for printer utility
                    change: change * 100,        // Back to cents for printer utility
                    store_name: settings?.store_name || "My Store",
                    store_address: settings?.store_address || "",
                    store_phone: settings?.store_phone || ""
                };

                clearCart();
                setShowPaymentModal(false);
                if (onClose) onClose(); // Close mobile cart sidebar
                printReceipt(receiptData);
            }
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || "Transaction failed", 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <div className="flex flex-col h-full relative bg-white">
                
                {/* HEADER */}
                <div className="px-4 pt-4 mb-2 flex justify-between items-center border-b pb-3 bg-white">
                    <div className="flex items-center gap-2">
                        {/* Mobile Back Button (Only shows if onClose is passed) */}
                        {onClose && (
                            <button onClick={onClose} className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                </svg>
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Current Order</h2>
                            <span className="text-xs text-gray-400">{cart.length} items</span>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        {cart.length > 0 && (
                            <>
                                {/* HOLD BUTTON */}
                                <button 
                                    onClick={handleHoldOrder}
                                    className="p-2 text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors border border-transparent hover:border-yellow-200"
                                    title="Hold Order"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9v6m-4.5 0V9M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </button>

                                {/* CLEAR BUTTON */}
                                <button 
                                    onClick={handleClearCart}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                    title="Clear Cart"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                </button>
                            </>
                        )}
                        
                        {/* SENIOR TOGGLE */}
                        <button 
                            onClick={toggleSenior}
                            className={`p-2 rounded-lg transition-colors border
                                ${isSenior 
                                    ? 'bg-yellow-100 text-yellow-700 border-yellow-300' 
                                    : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}`}
                            title="Toggle PWD/Senior Discount"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                        </button>
                    </div>
                </div>

                {/* CART ITEMS LIST */}
                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-300">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mb-2"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                            <p>Cart is empty</p>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex flex-col gap-2">
                                {/* Name & Total Price */}
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-gray-800 text-sm leading-tight line-clamp-2 w-2/3">{item.name}</h4>
                                    <span className="font-bold text-gray-900">{formatPrice(item.price * item.quantity)}</span>
                                </div>

                                {/* Unit Price & Quantity Controls */}
                                <div className="flex justify-between items-center mt-1">
                                    <div className="text-xs text-gray-400">
                                        {formatPrice(item.price)} each
                                    </div>
                                    
                                    <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 h-8">
                                        <button 
                                            onClick={() => removeFromCart(item.id)} 
                                            className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-red-500 rounded-l-lg transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" /></svg>
                                        </button>
                                        
                                        <div className="w-8 text-center font-bold text-sm text-gray-800 select-none">
                                            {item.quantity}
                                        </div>
                                        
                                        <button 
                                            onClick={() => addToCart(item)} 
                                            className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-green-600 rounded-r-lg transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* FOOTER TOTALS */}
                <div className="border-t p-5 bg-gray-50">
                    {isSenior && (
                        <div className="space-y-1 mb-3">
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>Subtotal</span>
                                <span>{formatPrice(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-green-600 font-medium">
                                <span>Less: Senior/PWD (20% + VAT)</span>
                                <span>-{formatPrice(discount)}</span>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex justify-between items-end mb-4">
                        <span className="text-gray-600 font-medium">Total Amount</span>
                        <span className="text-3xl font-extrabold text-gray-900">{formatPrice(total)}</span>
                    </div>
                    
                    <button 
                        onClick={() => setShowPaymentModal(true)}
                        disabled={cart.length === 0}
                        className="w-full py-3.5 rounded-xl bg-green-600 text-white font-bold text-lg shadow-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-transform active:scale-95 flex justify-center gap-2 items-center"
                    >
                        <span>Checkout</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                    </button>
                </div>
            </div>
            
            {showPaymentModal && (
                <PaymentModal 
                    total={total / 100} 
                    onClose={() => setShowPaymentModal(false)}
                    onConfirm={handleFinalizePayment}
                    isProcessing={isProcessing}
                />
            )}
        </>
    );
}