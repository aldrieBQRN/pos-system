<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HeldOrder extends Model
{
    use HasFactory;

    protected $fillable = ['reference_note', 'cart_data', 'total_amount'];

    protected $casts = [
        'cart_data' => 'array', // Automatically convert JSON to Array
    ];
}