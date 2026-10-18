<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('acci_packing_lists', function (Blueprint $table): void {
            $table->id();
            $table->string('packing_list_no')->unique();
            $table->date('packing_list_date');
            $table->string('seller_name');
            $table->text('seller_address');
            $table->string('seller_phone')->nullable();
            $table->string('seller_email')->nullable();
            $table->string('buyer_name');
            $table->text('buyer_address');
            $table->string('buyer_phone')->nullable();
            $table->string('buyer_gst')->nullable();
            $table->string('buyer_fssai')->nullable();
            $table->string('buyer_iec')->nullable();
            $table->string('airway_bill_no')->nullable();
            $table->date('airway_bill_date')->nullable();
            $table->string('payment_terms')->nullable();
            $table->string('lc_number')->nullable();
            $table->string('collection_basis')->nullable();
            $table->text('transport_route')->nullable();
            $table->string('commodity');
            $table->integer('quantity_cartons');
            $table->string('carton_dimensions')->nullable();
            $table->string('volume_per_carton')->nullable();
            $table->decimal('net_weight', 10, 3)->nullable();
            $table->decimal('gross_weight', 10, 3)->nullable();
            $table->string('total_volume')->nullable();
            $table->string('country_of_origin')->default('Afghanistan');
            $table->string('authorized_person')->nullable();
            $table->string('stamp_image')->nullable();
            $table->string('signature_image')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('acci_packing_lists');
    }
};
