<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_number',
        'cashier_id',
        'total_amount',
        'cash_given',
        'change',
        'payment_method',
        'payment_reference',
        'is_senior',
        'status',
    ];

    protected $casts = [
        'is_senior' => 'boolean', // Ensures it comes back as true/false, not 1/0
        'created_at' => 'datetime',
    ];

    // Relationships
    public function items()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function cashier()
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }
}