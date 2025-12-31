import React from 'react';
import useCartStore from '@/Stores/useCartStore';

export default function ProductGrid({ products }) {
    const addToCart = useCartStore((state) => state.addToCart);

    if (!products || products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <p>No products found.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
            {products.map((product) => {
                // Check if Out of Stock
                const isOutOfStock = product.stock_quantity <= 0;

                return (
                    <div 
                        key={product.id}
                        // Disable click if OOS
                        onClick={() => !isOutOfStock && addToCart(product)}
                        className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col h-full transition-all
                            ${isOutOfStock 
                                ? 'opacity-50 cursor-not-allowed grayscale' // Grayed out style
                                : 'cursor-pointer hover:shadow-md hover:border-blue-200 active:scale-95'
                            }`}
                    >
                        {/* Image Area */}
                        <div className="h-24 bg-gray-50 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative border border-gray-100">
                            {product.image_path ? (
                                <img src={product.image_path} alt={product.name} className="w-full h-full object-cover"/>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-300">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                </svg>
                            )}
                            
                            {/* Stock Badge */}
                            <div className={`absolute top-1 right-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-sm
                                ${isOutOfStock ? 'bg-gray-800 text-white' : (product.stock_quantity > 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}`}>
                                {isOutOfStock ? 'SOLD OUT' : `Qty: ${product.stock_quantity}`}
                            </div>
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-gray-800 text-sm leading-tight mb-1 line-clamp-2">
                                    {product.name}
                                </h3>
                                <p className="text-xs text-gray-400">
                                    {product.category?.name || 'Uncategorized'}
                                </p>
                            </div>
                            
                            <div className="mt-3 flex justify-between items-center">
                                <span className="font-extrabold text-blue-600">
                                    ${(product.price / 100).toFixed(2)}
                                </span>
                                {/* Hide Add Button if OOS */}
                                {!isOutOfStock && (
                                    <div className="w-6 h-6 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-lg font-bold shadow-sm hover:bg-blue-100 transition-colors">
                                        +
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}