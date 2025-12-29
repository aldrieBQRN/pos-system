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
        Schema::table('sales', function (Blueprint $table) {
            // 'cash' or 'gcash'
            $table->string('payment_method')->default('cash')->after('total_amount'); 
            // Stores the Reference Number (nullable because Cash doesn't have one)
            $table->string('payment_reference')->nullable()->after('payment_method');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn(['payment_method', 'payment_reference']);
        });
    }
};
