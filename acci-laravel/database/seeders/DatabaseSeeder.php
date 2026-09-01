<?php

namespace Database\Seeders;

use App\Models\AcciInvoice;
use App\Models\AirWaybill;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $sampleInvoice = AcciInvoice::factory()->make([
            'invoice_no' => 'ACCI-120892',
        ]);
        AcciInvoice::query()->firstOrCreate(
            ['invoice_no' => $sampleInvoice->invoice_no],
            $sampleInvoice->getAttributes(),
        );

        $sampleAirWaybill = AirWaybill::factory()->make([
            'awb_number' => '235-35822253',
            'airline_prefix' => '235',
            'serial_number' => '35822253',
        ]);
        AirWaybill::query()->firstOrCreate(
            ['awb_number' => $sampleAirWaybill->awb_number],
            $sampleAirWaybill->getAttributes(),
        );
        $this->call([
            SavedCompanySeeder::class,
            ShippingStickerSeeder::class,
        ]);
    }
}
