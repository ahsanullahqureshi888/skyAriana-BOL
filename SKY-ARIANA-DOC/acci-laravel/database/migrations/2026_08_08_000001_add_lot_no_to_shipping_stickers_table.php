<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipping_stickers', function (Blueprint $table): void {
            if (!Schema::hasColumn('shipping_stickers', 'lot_no')) {
                $table->string('lot_no')->nullable()->after('date_of_expiry');
            }
        });
    }

    public function down(): void
    {
        Schema::table('shipping_stickers', function (Blueprint $table): void {
            if (Schema::hasColumn('shipping_stickers', 'lot_no')) {
                $table->dropColumn('lot_no');
            }
        });
    }
};
