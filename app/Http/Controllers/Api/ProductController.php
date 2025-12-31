<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Product::with('category');

        // 1. Search Filter
        if ($request->search) {
            $query->where(function($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('sku', 'like', "%{$request->search}%");
            });
        }

        // 2. Category Filter
        if ($request->category) {
            $query->where('category_id', $request->category);
        }

        // 3. Low Stock Filter
        if ($request->low_stock === 'true') {
            $query->where('stock_quantity', '<=', 10);
        }

        $query->orderBy('created_at', 'desc');

        // 4. FIX: Check if we want ALL data for export
        if ($request->has('all')) {
            return $query->get(); // Returns everything as a simple array
        }

        return $query->paginate(10); // Standard pagination
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            'sku' => 'required|string|unique:products,sku',
            'image' => 'nullable|image|max:2048',
        ]);

        $data = $request->all();

        // Convert Price to Cents (Best Practice for Money)
        $data['price'] = $request->price * 100;
        if ($request->cost_price) {
            $data['cost_price'] = $request->cost_price * 100;
        }

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('products', 'public');
            $data['image_path'] = '/storage/' . $path;
        }

        $product = Product::create($data);

        return response()->json($product, 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'category_id' => 'sometimes|exists:categories,id',
            'price' => 'sometimes|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'sometimes|integer|min:0',
            'sku' => 'sometimes|string|unique:products,sku,' . $id,
            'image' => 'nullable|image|max:2048',
        ]);

        $data = $request->except(['image']);

        // Convert Price to Cents if present
        if ($request->has('price')) {
            $data['price'] = $request->price * 100;
        }
        if ($request->has('cost_price')) {
            $data['cost_price'] = $request->cost_price * 100;
        }

        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($product->image_path) {
                $oldPath = str_replace('/storage/', '', $product->image_path);
                Storage::disk('public')->delete($oldPath);
            }

            $path = $request->file('image')->store('products', 'public');
            $data['image_path'] = '/storage/' . $path;
        }

        $product->update($data);

        return response()->json($product);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $product = Product::findOrFail($id);

        // Optional: Check if product is in a sale before deleting
        // if ($product->saleItems()->exists()) {
        //     return response()->json(['message' => 'Cannot delete product with sales history.'], 400);
        // }

        if ($product->image_path) {
            $oldPath = str_replace('/storage/', '', $product->image_path);
            Storage::disk('public')->delete($oldPath);
        }

        $product->delete();

        return response()->json(['message' => 'Product deleted successfully']);
    }

    /**
     * NEW: Adjust Stock (Quick Add)
     */
    public function adjustStock(Request $request, $id)
    {
        $request->validate([
            'quantity' => 'required|integer|min:1' // Only allow positive increments here
        ]);

        $product = Product::findOrFail($id);
        
        // Add to existing stock
        $product->increment('stock_quantity', $request->quantity);

        return response()->json([
            'message' => 'Stock updated successfully',
            'new_stock' => $product->stock_quantity
        ]);
    }
}