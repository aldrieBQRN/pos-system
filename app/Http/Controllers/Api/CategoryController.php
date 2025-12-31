<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    // GET /api/categories
    public function index()
    {
        return Category::orderBy('name')->get();
    }

    // POST /api/categories
    public function store(Request $request)
    {
        $request->validate(['name' => 'required|string|unique:categories,name|max:50']);
        $category = Category::create(['name' => $request->name]);
        return response()->json($category, 201);
    }

    // PUT /api/categories/{id}
    public function update(Request $request, $id)
    {
        $request->validate(['name' => 'required|string|unique:categories,name,' . $id . '|max:50']);
        $category = Category::findOrFail($id);
        $category->update(['name' => $request->name]);
        return response()->json($category);
    }

    // DELETE /api/categories/{id}
    public function destroy($id)
    {
        $category = Category::findOrFail($id);
        
        // Optional: Check if products exist before deleting
        if ($category->products()->count() > 0) {
             return response()->json(['message' => 'Cannot delete: Category contains products.'], 400);
        }

        $category->delete();
        return response()->json(['message' => 'Category deleted']);
    }
}