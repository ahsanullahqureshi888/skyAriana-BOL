<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipping_stickers', function (Blueprint $table): void {
            $table->index('exporter_name');
            $table->index('importer_name');
            $table->index('commodity_name');
            $table->index('sticker_date');
        });

        Schema::table('acci_invoices', function (Blueprint $table): void {
            $table->index('invoice_no');
            $table->index('buyer_name');
            $table->index('seller_name');
            $table->index('commodity');
            $table->index('invoice_date');
        });

        Schema::table('acci_packing_lists', function (Blueprint $table): void {
            $table->index('packing_list_no');
            $table->index('buyer_name');
            $table->index('seller_name');
            $table->index('commodity');
            $table->index('packing_list_date');
        });

        Schema::table('air_waybills', function (Blueprint $table): void {
            $table->index('awb_number');
            $table->index('shipper_name');
            $table->index('consignee_name');
            $table->index('airport_departure');
            $table->index('airport_destination');
        });

        Schema::table('safta_certificates', function (Blueprint $table): void {
            $table->index('reference_no');
            $table->index('certificate_no');
            $table->index('acci_control_no');
            $table->index('exporter_name');
            $table->index('consignee_name');
        });

        Schema::table('saved_companies', function (Blueprint $table): void {
            $table->index('company_name');
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::table('shipping_stickers', function (Blueprint $table): void {
            $table->dropIndex(['exporter_name']);
            $table->dropIndex(['importer_name']);
            $table->dropIndex(['commodity_name']);
            $table->dropIndex(['sticker_date']);
        });

        Schema::table('acci_invoices', function (Blueprint $table): void {
            $table->dropIndex(['invoice_no']);
            $table->dropIndex(['buyer_name']);
            $table->dropIndex(['seller_name']);
            $table->dropIndex(['commodity']);
            $table->dropIndex(['invoice_date']);
        });

        Schema::table('acci_packing_lists', function (Blueprint $table): void {
            $table->dropIndex(['packing_list_no']);
            $table->dropIndex(['buyer_name']);
            $table->dropIndex(['seller_name']);
            $table->dropIndex(['commodity']);
            $table->dropIndex(['packing_list_date']);
        });

        Schema::table('air_waybills', function (Blueprint $table): void {
            $table->dropIndex(['awb_number']);
            $table->dropIndex(['shipper_name']);
            $table->dropIndex(['consignee_name']);
            $table->dropIndex(['airport_departure']);
            $table->dropIndex(['airport_destination']);
        });

        Schema::table('safta_certificates', function (Blueprint $table): void {
            $table->dropIndex(['reference_no']);
            $table->dropIndex(['certificate_no']);
            $table->dropIndex(['acci_control_no']);
            $table->dropIndex(['exporter_name']);
            $table->dropIndex(['consignee_name']);
        });

        Schema::table('saved_companies', function (Blueprint $table): void {
            $table->dropIndex(['company_name']);
            $table->dropIndex(['type']);
        });
    }
};
