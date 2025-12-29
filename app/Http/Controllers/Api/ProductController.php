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
        $query = Product::query();

        // 1. Filter by Active status (don't show deleted/hidden items in POS)
        $query->where('is_active', true);

        // 2. Search functionality (matches Name or SKU)
        if ($request->has('search')) {
            $searchTerm = $request->search;
            $query->where(function($q) use ($searchTerm) {
                $q->where('name', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('sku', 'LIKE', "%{$searchTerm}%");
            });
        }

        // 3. Category Filter
        if ($request->has('category') && $request->category !== 'All') {
            $query->where('category', $request->category);
        }

        // 4. Return results (Pagination is good for performance)
        // We assume 50 items per "page" on the POS screen
        $products = $query->orderBy('name')->paginate(50);

        return response()->json($products);
    }

    public function store(Request $request)
    {
        // 1. Validate
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:50',
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
                'category' => $validated['category'],
                'sku' => $validated['sku'],
                'stock_quantity' => $validated['stock_quantity'],
                
                // Price Math (Multiply by 100 to save as cents)
                'price' => (int) ($validated['price'] * 100),
                
                // FIX: Safely check if 'cost_price' was sent. If not, set to null.
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
            // This helps us see the REAL error in the browser console if it fails again
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $product = Product::findOrFail($id);
            
            // Optional: Check if product has sales history before deleting?
            // For now, we'll just delete it.
            $product->delete();

            return response()->json(['success' => true, 'message' => 'Product deleted']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }


    public function update(Request $request, $id)
    {
        // 1. Validation (Notice the SKU rule!)
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:50',
            'price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            // "unique:table,column,except_id"
            'sku' => 'required|string|unique:products,sku,' . $id, 
            'image' => 'nullable|image|max:2048', // Image is optional on update
        ]);

        try {
            $product = Product::findOrFail($id);

            // 2. Handle Image Upload (Only if a new file exists)
            $imagePath = $product->image_path; // Default to old image
            if ($request->hasFile('image')) {
                // Optional: Delete old image from storage here if you want to be clean
                $newPath = $request->file('image')->store('products', 'public');
                $imagePath = '/storage/' . $newPath;
            }

            // 3. Update Database
            $product->update([
                'name' => $validated['name'],
                'category' => $validated['category'],
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
    
}