<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Shift extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'start_time',
        'end_time',
        'starting_cash',
        'cash_sales',
        'expected_cash',
        'actual_cash',
        'difference',
        'status'
    ];

    // --- THIS IS REQUIRED TO SHOW NAMES ---
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
