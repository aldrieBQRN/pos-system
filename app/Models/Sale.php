<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    use HasFactory;

    protected $fillable = [
        'transaction_date', 
        'invoice_number', 
        'cashier_id', 
        'total_amount',
        'payment_method',      // <--- Ensure these are here
        'payment_reference'    // <--- Ensure these are here
    ];

    /**
     * Relationship: Who sold this?
     */
    public function cashier()
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    /**
     * Relationship: What items were sold?
     */
    public function items()
    {
        return $this->hasMany(SaleItem::class);
    }
}