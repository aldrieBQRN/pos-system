<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    /**
     * Get list of products (with optional search)
     */
    public function index(Request $request)
    {
        $query = Product::with('category'); // <--- Correct: Loads the relationship

        // Search logic...
        if ($request->search) {
            $query->where('name', 'like', '%' . $request->search . '%')
                ->orWhere('sku', 'like', '%' . $request->search . '%');
        }

        // Category Filter logic
        if ($request->category && $request->category !== 'All') {
            $query->where('category_id', $request->category);
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate(10));
    }

    public function store(Request $request)
    {
        // 1. Validate
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id', // <--- FIX 1: Validate ID existence
            'price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            'sku' => 'required|string|unique:products,sku',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        try {
            // 2. Handle Image Upload
            $imagePath = null;
            if ($request->hasFile('image')) {
                $imagePath = $request->file('image')->store('products', 'public');
            }

            // 3. Create Product
            $product = Product::create([
                'name' => $validated['name'],
                'category_id' => $validated['category_id'], // <--- FIX 2: Use category_id, not category
                'sku' => $validated['sku'],
                'stock_quantity' => $validated['stock_quantity'],
                
                // Price Math (Multiply by 100 to save as cents)
                'price' => (int) ($validated['price'] * 100),
                
                'cost_price' => !empty($validated['cost_price']) ? (int) ($validated['cost_price'] * 100) : null,
                
                'image_path' => $imagePath ? '/storage/' . $imagePath : null,
                'is_active' => true,
            ]);

            return response()->json([
                'success' => true,
                'product' => $product,
                'message' => 'Product created successfully!'
            ], 201);

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        // 1. Validate
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id', // <--- FIX 3: Updated validation
            'price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            'sku' => 'required|string|unique:products,sku,' . $id, 
            'image' => 'nullable|image|max:2048',
        ]);

        try {
            $product = Product::findOrFail($id);

            // 2. Handle Image Upload
            $imagePath = $product->image_path; 
            if ($request->hasFile('image')) {
                $newPath = $request->file('image')->store('products', 'public');
                $imagePath = '/storage/' . $newPath;
            }

            // 3. Update Database
            $product->update([
                'name' => $validated['name'],
                'category_id' => $validated['category_id'], // <--- FIX 4: Use category_id
                'sku' => $validated['sku'],
                'stock_quantity' => $validated['stock_quantity'],
                'price' => (int) ($validated['price'] * 100),
                'cost_price' => !empty($validated['cost_price']) ? (int) ($validated['cost_price'] * 100) : null,
                'image_path' => $imagePath,
            ]);

            return response()->json(['success' => true, 'message' => 'Product updated!']);

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }
    
    public function destroy($id)
    {
        try {
            $product = Product::findOrFail($id);
            $product->delete();
            return response()->json(['success' => true, 'message' => 'Product deleted']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }
}