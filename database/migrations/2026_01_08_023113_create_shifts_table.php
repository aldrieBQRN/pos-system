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
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->timestamp('start_time');
            $table->timestamp('end_time')->nullable();
            $table->decimal('starting_cash', 10, 2)->default(0);
            $table->decimal('cash_sales', 10, 2)->default(0); // Total cash collected
            $table->decimal('expected_cash', 10, 2)->default(0); // Start + Sales
            $table->decimal('actual_cash', 10, 2)->nullable(); // What cashier counted
            $table->decimal('difference', 10, 2)->nullable(); // Over/Short
            $table->string('status')->default('open'); // 'open', 'closed'
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shifts');
    }
};
