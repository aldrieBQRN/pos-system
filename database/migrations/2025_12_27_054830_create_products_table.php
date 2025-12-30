<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();

            // Basic Info
            $table->string('name');
            $table->text('description')->nullable();
            
            // Barcode / SKU (Indexed for fast scanning)
            $table->string('sku')->unique(); 
            
            // Financials (Stored in cents: 1000 = $10.00)
            $table->integer('price'); 
            $table->integer('cost_price')->nullable(); // Good for calculating profit later
            
            // Inventory
            $table->integer('stock_quantity')->default(0);
            $table->integer('low_stock_threshold')->default(10); // Alert when stock hits this number
            
            // Organization
            // If you don't have a categories table yet, you can use a string here for now.
            // If you do, use: $table->foreignId('category_id')->constrained();
            $table->foreignId('category_id')->constrained()->onDelete('cascade');

            // Meta
            $table->string('image_path')->nullable(); // URL to product image
            $table->boolean('is_active')->default(true); // Soft delete feature for POS UI
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
