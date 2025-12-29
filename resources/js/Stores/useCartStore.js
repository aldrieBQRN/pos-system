import { create } from 'zustand';

const useCartStore = create((set, get) => ({
    cart: [],

    // ACTION: Add item to cart
    addToCart: (product) => {
        const { cart } = get();
        // Check if item already exists
        const existingItem = cart.find((item) => item.id === product.id);

        if (existingItem) {
            // If exists, increment quantity (but check stock limits!)
            if (existingItem.quantity < product.stock_quantity) {
                set({
                    cart: cart.map((item) =>
                        item.id === product.id
                            ? { ...item, quantity: item.quantity + 1 }
                            : item
                    ),
                });
            } else {
                alert("Not enough stock!");
            }
        } else {
            // If new, add to cart with quantity 1
            set({ cart: [...cart, { ...product, quantity: 1 }] });
        }
    },

    // ACTION: Decrease quantity or remove if 0
    removeFromCart: (productId) => {
        const { cart } = get();
        const existingItem = cart.find((item) => item.id === productId);

        if (existingItem.quantity > 1) {
            set({
                cart: cart.map((item) =>
                    item.id === productId
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                ),
            });
        } else {
            set({
                cart: cart.filter((item) => item.id !== productId),
            });
        }
    },

    // ACTION: Clear cart
    clearCart: () => set({ cart: [] }),

    // COMPUTED: Calculate Total Price (in cents)
    getTotal: () => {
        const { cart } = get();
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    },
}));

export default useCartStore;