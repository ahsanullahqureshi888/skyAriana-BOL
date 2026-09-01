<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('acci_invoices', function (Blueprint $table): void {
            $table->id();
            $table->string('invoice_no', 40)->unique();
            $table->date('invoice_date')->index();

            $table->string('seller_name');
            $table->text('seller_address');
            $table->string('seller_phone', 80)->nullable();
            $table->string('seller_email')->nullable();

            $table->string('buyer_name')->index();
            $table->text('buyer_address');

            $table->string('airway_bill_no', 80)->nullable();
            $table->date('airway_bill_date')->nullable();

            $table->text('payment_terms')->nullable();
            $table->string('advance_payment', 120)->nullable();
            $table->string('lc_number', 100)->nullable();
            $table->string('collection_basis', 160)->nullable();
            $table->text('transport_route')->nullable();

            $table->string('commodity')->index();
            $table->unsignedInteger('quantity_cartons');
            $table->decimal('quantity_weight', 15, 3);
            $table->decimal('unit_price', 15, 4);
            $table->decimal('total_price', 15, 2);
            $table->text('amount_in_words');
            $table->string('country_of_origin', 120)->default('Afghanistan');

            $table->string('reg_no', 100)->nullable();
            $table->string('fee_no', 100)->nullable();
            $table->decimal('received_amount', 15, 2)->nullable();
            $table->date('received_date')->nullable();
            $table->string('authorized_person')->nullable();

            $table->string('stamp_image')->nullable();
            $table->string('signature_image')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('acci_invoices');
    }
};
