<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    protected $fillable = ['name'];

    /**
     * Relationship: A Category has many Products.
     * This fixes the "undefined method products()" error.
     */
    public function products()
    {
        return $this->hasMany(Product::class);
    }
}