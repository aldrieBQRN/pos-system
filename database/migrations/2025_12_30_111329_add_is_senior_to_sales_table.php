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
            // Add the column only if it doesn't exist
            if (!Schema::hasColumn('sales', 'is_senior')) {
                $table->boolean('is_senior')->default(false)->after('payment_method');
            }
        });
    }

    public function down()
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn('is_senior');
        });
    }
};
