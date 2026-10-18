<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('air_waybills', function (Blueprint $table): void {
            $table->id();
            $table->string('awb_number', 20)->unique();
            $table->string('airline_prefix', 3)->index();
            $table->string('serial_number', 8)->index();

            $table->string('shipper_name')->index();
            $table->text('shipper_address');
            $table->string('shipper_phone', 80)->nullable();
            $table->string('shipper_account_no', 100)->nullable();

            $table->string('consignee_name')->index();
            $table->text('consignee_address');
            $table->string('consignee_phone', 80)->nullable();
            $table->string('consignee_account_no', 100)->nullable();
            $table->text('notify_party')->nullable();

            $table->text('issuing_agent')->nullable();
            $table->string('iata_code', 40)->nullable();
            $table->string('agent_account_no', 100)->nullable();

            $table->string('departure_airport')->index();
            $table->string('destination_airport')->index();
            $table->string('requested_routing')->nullable();
            $table->string('first_carrier', 80)->nullable();
            $table->string('flight_no', 120)->nullable();
            $table->date('flight_date')->nullable();

            $table->string('currency', 3)->default('USD');
            $table->string('declared_value_carriage', 60)->nullable();
            $table->string('declared_value_customs', 60)->nullable();
            $table->string('insurance_amount', 60)->nullable();
            $table->text('handling_information')->nullable();
            $table->string('reference_number', 120)->nullable()->index();
            $table->text('accounting_information')->nullable();
            $table->string('airport_destination')->nullable();
            $table->string('airport_departure')->nullable();

            $table->unsignedInteger('pieces');
            $table->decimal('gross_weight', 15, 3);
            $table->decimal('chargeable_weight', 15, 3);
            $table->string('weight_unit', 8)->default('KG');
            $table->string('rate_class', 30)->nullable();
            $table->string('commodity_item_no', 80)->nullable();
            $table->text('commodity_description');
            $table->text('dimensions')->nullable();
            $table->string('rate', 40)->nullable();

            $table->decimal('freight_charge', 15, 2)->default(0);
            $table->decimal('valuation_charge', 15, 2)->default(0);
            $table->decimal('tax', 15, 2)->default(0);
            $table->decimal('other_agent_charge', 15, 2)->default(0);
            $table->decimal('other_carrier_charge', 15, 2)->default(0);
            $table->decimal('total_prepaid', 15, 2)->default(0);
            $table->decimal('total_collect', 15, 2)->default(0);
            $table->decimal('charges_at_destination', 15, 2)->default(0);
            $table->decimal('currency_conversion', 15, 6)->default(0);

            $table->string('carrier_name')->nullable();
            $table->string('shipper_signature')->nullable();
            $table->string('carrier_signature')->nullable();
            $table->string('issued_place')->nullable();
            $table->date('issued_date')->nullable();
            $table->string('carrier_logo')->nullable();
            $table->string('carrier_stamp')->nullable();
            $table->string('status', 30)->default('draft')->index();
            $table->text('remarks')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('air_waybills');
    }
};
