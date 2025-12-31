import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
    persist(
        (set, get) => ({
            cart: [],
            isSenior: false, // Track PWD/Senior status in the store

            addToCart: (product) => {
                const { cart } = get();
                const existingItem = cart.find(item => item.id === product.id);

                if (existingItem) {
                    if (existingItem.quantity + 1 > product.stock_quantity) {
                        alert(`Only ${product.stock_quantity} stocks remaining.`);
                        return;
                    }
                    set({
                        cart: cart.map(item =>
                            item.id === product.id
                                ? { ...item, quantity: item.quantity + 1 }
                                : item
                        ),
                    });
                } else {
                    if (product.stock_quantity < 1) {
                        alert("Item is out of stock!");
                        return;
                    }
                    set({ cart: [...cart, { ...product, quantity: 1 }] });
                }
            },

            removeFromCart: (productId) => {
                const { cart } = get();
                const existingItem = cart.find(item => item.id === productId);

                if (existingItem.quantity > 1) {
                    set({
                        cart: cart.map(item =>
                            item.id === productId
                                ? { ...item, quantity: item.quantity - 1 }
                                : item
                        ),
                    });
                } else {
                    set({ cart: cart.filter(item => item.id !== productId) });
                }
            },

            clearCart: () => set({ cart: [], isSenior: false }),

            // NEW: Used by 'Recall Order' to restore a saved cart
            setCart: (newCart) => set({ cart: newCart }),

            toggleSenior: () => set((state) => ({ isSenior: !state.isSenior })),

            getComputations: () => {
                const { cart, isSenior } = get();
                // Calculate Subtotal (Sum of Price * Quantity)
                const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
                
                let discount = 0;
                let total = subtotal;

                // Logic: 20% Discount on VAT Exempt Price
                // Formula: (Price / 1.12) * 20%
                if (isSenior) {
                    const vatExemptSales = subtotal / 1.12; 
                    discount = vatExemptSales * 0.20; // 20% of the exempt price
                    total = subtotal - discount; // Final total is Subtotal - Discount
                }

                return {
                    subtotal: subtotal,
                    discount: Math.round(discount), // Round to nearest cent
                    total: Math.round(total)
                };
            }
        }),
        {
            name: 'pos-cart-storage', // Key for localStorage
        }
    )
);

export default useCartStore;