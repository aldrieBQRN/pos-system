<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Product extends Model
{
    use HasFactory;

    // Security: Only allow these fields to be mass-assigned
    protected $fillable = [
        'name',
        'description', 
        'sku',
        'price',
        'cost_price',
        'stock_quantity',
        'low_stock_threshold',
        'category_id', // <--- UPDATED: This now points to the ID, not a text string
        'image_path', 
        'is_active',
    ];

    // Casts convert data types automatically when you fetch them
    protected $casts = [
        'is_active' => 'boolean',
        'stock_quantity' => 'integer',
        'price' => 'integer',
    ];

    /**
     * Relationship: A Product belongs to a Category
     * This allows you to do: $product->category->name
     */
    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * SENIOR TIP: Accessor for "Display Price"
     * Usage: $product->display_price
     * Returns: "15.50" (if price is 1550)
     */
    protected function displayPrice(): Attribute
    {
        return Attribute::make(
            get: fn () => number_format($this->price / 100, 2)
        );
    }
}