<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('acci_invoices', 'acci_no')) {
            return;
        }

        Schema::table('acci_invoices', function (Blueprint $table): void {
            $table->string('acci_no', 100)->nullable()->after('invoice_no');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('acci_invoices', 'acci_no')) {
            return;
        }

        Schema::table('acci_invoices', function (Blueprint $table): void {
            $table->dropColumn('acci_no');
        });
    }
};
