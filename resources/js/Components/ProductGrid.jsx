import React from 'react';
import useCartStore from '@/Stores/useCartStore'; // Import the store

export default function ProductGrid({ products }) {
    const addToCart = useCartStore((state) => state.addToCart); // Get the action

    if (products.length === 0) return <div className="text-gray-500">No products found.</div>;

    return (
        <div className="grid grid-cols-3 gap-4">
            {products.map((product) => (
                <div 
                    key={product.id} 
                    // Add click handler here
                    onClick={() => addToCart(product)} 
                    className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer border border-gray-200 flex flex-col justify-between h-32 active:scale-95 duration-100"
                >
                    {/* ... (rest of your existing UI code) ... */}
                    <div>
                        <h3 className="font-semibold text-gray-800 text-lg truncate">{product.name}</h3>
                        <p className="text-sm text-gray-500">{product.category}</p>
                    </div>
                    <div className="flex justify-between items-end mt-2">
                        <span className="font-bold text-blue-600 text-lg">
                            ${(product.price / 100).toFixed(2)}
                        </span>
                        <div className="text-xs text-gray-400">Qty: {product.stock_quantity}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}