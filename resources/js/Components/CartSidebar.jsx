import React, { useState } from 'react';
import axios from 'axios';
import useCartStore from '@/Stores/useCartStore';
import { printReceipt } from '@/Utils/printReceipt';
import PaymentModal from './PaymentModal'; 

// 1. Accept 'settings' prop
export default function CartSidebar({ settings }) {
    const { cart, removeFromCart, getTotal, clearCart } = useCartStore();
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    const formatPrice = (cents) => `$${(cents / 100).toFixed(2)}`;

    const handleInitialCheckoutClick = () => {
        if (cart.length === 0) return;
        setShowPaymentModal(true);
    };

    const handleFinalizePayment = async (paymentDetails) => {
        setIsProcessing(true);

        try {
            const response = await axios.post('/api/checkout', {
                cart: cart.map(item => ({
                    id: item.id,
                    quantity: item.quantity
                })),
                payment_method: paymentDetails.method,
                payment_reference: paymentDetails.reference
            });

            if (response.data.success) {
                const receiptData = {
                    invoice_number: `INV-${response.data.sale_id}`,
                    cashier_id: "User", 
                    items: [...cart], 
                    total: getTotal(),
                    payment_method: paymentDetails.method,
                    cash_given: paymentDetails.cashGiven ? paymentDetails.cashGiven * 100 : null,
                    change: paymentDetails.method === 'cash' ? (paymentDetails.cashGiven * 100) - getTotal() : 0,
                    reference: paymentDetails.reference,

                    // 2. NEW: Pass Store Settings to the Receipt
                    store_name: settings?.store_name || "MY COFFEE SHOP",
                    store_address: settings?.store_address || "123 Main St, Batangas",
                    store_phone: settings?.store_phone || "(043) 123-4567"
                };

                clearCart();
                setShowPaymentModal(false); 
                printReceipt(receiptData);
            }
        } catch (error) {
            console.error(error);
            const message = error.response?.data?.error || "Transaction failed.";
            alert(`Error: ${message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <div className="flex flex-col h-full relative">
                <h2 className="text-xl font-bold mb-4 px-4 pt-4">Current Order</h2>

                {/* List Items */}
                <div className="flex-1 overflow-y-auto px-4">
                    {cart.length === 0 ? (
                        <div className="text-gray-400 text-center mt-20">Cart is empty</div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.id} className="flex justify-between items-center mb-4 border-b pb-2">
                                <div>
                                    <h4 className="font-semibold">{item.name}</h4>
                                    <div className="text-sm text-gray-500">
                                        {item.quantity} x {formatPrice(item.price)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">{formatPrice(item.price * item.quantity)}</span>
                                    <button 
                                        onClick={() => removeFromCart(item.id)}
                                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                                    >
                                        &minus;
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Actions */}
                <div className="border-t p-6 bg-gray-50">
                    <div className="flex justify-between text-xl font-bold mb-4">
                        <span>Total</span>
                        <span>{formatPrice(getTotal())}</span>
                    </div>
                    
                    <button 
                        onClick={handleInitialCheckoutClick}
                        disabled={cart.length === 0}
                        className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all
                            ${cart.length === 0 
                                ? 'bg-gray-300 cursor-not-allowed' 
                                : 'bg-green-600 hover:bg-green-700 active:scale-95'}`}
                    >
                        Checkout
                    </button>
                </div>
            </div>

            {/* Render Modal if Open */}
            {showPaymentModal && (
                <PaymentModal 
                    total={getTotal() / 100} 
                    onClose={() => setShowPaymentModal(false)}
                    onConfirm={handleFinalizePayment}
                    isProcessing={isProcessing}
                />
            )}
        </>
    );
}