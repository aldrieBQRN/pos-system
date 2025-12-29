<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SaleItem extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     * This fixes the "Add [field] to fillable property" error.
     */
    protected $fillable = [
        'sale_id',      // Link to the main receipt
        'product_id',   // Link to the product sold
        'quantity',     // How many?
        'unit_price',   // Price per item at moment of sale (in cents)
        'subtotal',     // quantity * unit_price (in cents)
    ];

    /**
     * Relationship: This item belongs to a specific Sale (Receipt).
     */
    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    /**
     * Relationship: This item is an instance of a Product.
     */
    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}