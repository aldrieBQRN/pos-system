<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::create('held_orders', function (Blueprint $table) {
            $table->id();
            $table->string('reference_note')->nullable(); // e.g. "Table 5" or "Red Shirt"
            $table->longText('cart_data'); // Stores the JSON cart
            $table->integer('total_amount'); // For display
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('held_orders');
    }
};
