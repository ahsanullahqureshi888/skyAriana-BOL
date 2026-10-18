<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('company_stamps')) {
            return;
        }

        Schema::create('company_stamps', function (Blueprint $table): void {
            $table->id();
            $table->string('company_name')->unique();
            $table->string('stamp_image_path');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('company_stamps')) {
            return;
        }

        Schema::dropIfExists('company_stamps');
    }
};
