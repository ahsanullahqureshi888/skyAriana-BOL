<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saved_companies', function (Blueprint $table): void {
            $table->id();
            $table->string('type', 20)->default('both'); // 'seller', 'buyer', 'both'
            $table->string('company_name')->index();
            $table->text('address')->nullable();
            $table->string('phone', 100)->nullable();
            $table->string('email', 255)->nullable();
            $table->string('gst_no', 100)->nullable();
            $table->string('fssai_no', 100)->nullable();
            $table->string('iec_code', 100)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_companies');
    }
};
