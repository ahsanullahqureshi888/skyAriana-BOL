<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipping_stickers', function (Blueprint $table): void {
            if (!Schema::hasColumn('shipping_stickers', 'transport_mode')) {
                $table->string('transport_mode')->nullable()->after('lot_no');
            }
        });
    }

    public function down(): void
    {
        Schema::table('shipping_stickers', function (Blueprint $table): void {
            if (Schema::hasColumn('shipping_stickers', 'transport_mode')) {
                $table->dropColumn('transport_mode');
            }
        });
    }
};
