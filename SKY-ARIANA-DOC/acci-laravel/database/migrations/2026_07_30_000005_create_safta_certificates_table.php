<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('safta_certificates', function (Blueprint $table) {
            $table->id();
            $table->string('certificate_no')->unique();
            $table->string('reference_no')->nullable();
            $table->string('issued_in_country')->default('AFGHANISTAN');
            $table->string('acci_control_no')->default('133011');

            // Box 1: Exporter
            $table->string('exporter_name');
            $table->text('exporter_address');

            // Box 2: Consignee
            $table->string('consignee_name');
            $table->text('consignee_address');

            // Box 3: Transport
            $table->string('transport_route');

            // Boxes 5 - 11: Cargo Table
            $table->string('hs_code')->nullable();
            $table->string('marks_and_numbers')->nullable();
            $table->text('commodity_description');
            $table->string('origin_criterion')->default('A');
            $table->string('gross_weight');
            $table->string('invoice_no_and_date');
            $table->text('fob_value_details');

            // Box 12: Declaration
            $table->string('producing_country')->default('AFGHANISTAN');
            $table->string('importing_country')->default('INDIA');
            $table->date('declaration_date');

            // Box 13: Certificate
            $table->date('certification_date');

            // Stamps & Signatures
            $table->string('stamp_image')->nullable();
            $table->string('signature_image')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('safta_certificates');
    }
};
