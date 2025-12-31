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
        Schema::table('sales', function (Blueprint $table) {
            // Integers because we store money in cents
            $table->integer('cash_given')->nullable()->after('total_amount');
            $table->integer('change')->nullable()->after('cash_given');
        });
    }

    public function down()
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn(['cash_given', 'change']);
        });
    }
};
