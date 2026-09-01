<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipping_stickers', function (Blueprint $table): void {
            $table->id();
            $table->string('sticker_no')->unique();
            $table->date('sticker_date');

            // Exporter
            $table->string('exporter_name');
            $table->text('exporter_address');
            $table->string('exporter_phone')->nullable();
            $table->string('exporter_licence_no')->nullable();

            // Importer
            $table->string('importer_name');
            $table->text('importer_address');
            $table->string('importer_gst')->nullable();
            $table->string('importer_fssai')->nullable();
            $table->string('importer_phone')->nullable();
            $table->string('importer_email')->nullable();
            $table->string('importer_pan')->nullable();

            // Product
            $table->string('commodity_name');
            $table->string('net_wt');
            $table->string('date_of_packing');
            $table->string('date_of_expiry');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipping_stickers');
    }
};
