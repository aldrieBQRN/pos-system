<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Create the 'sales' table FIRST (The Parent)
        Schema::create('sales', function (Blueprint $table) {
            $table->id(); // This creates 'id' (BigInt Unsigned)
            $table->string('invoice_number')->unique();
            
            // We use nullable() temporarily so it doesn't crash if user ID 2 is missing
            $table->foreignId('cashier_id')->nullable()->constrained('users'); 
            
            $table->integer('total_amount');
            $table->timestamp('transaction_date');
            $table->timestamps();
        });

        // 2. Create the 'sale_items' table SECOND (The Child)
        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            
            // Now this works because 'sales' definitely exists
            $table->foreignId('sale_id')->constrained('sales')->onDelete('cascade');
            
            $table->foreignId('product_id')->constrained('products');
            $table->integer('quantity');
            $table->integer('unit_price');
            $table->integer('subtotal');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        // Drop in reverse order (Child first, then Parent)
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');
    }
};