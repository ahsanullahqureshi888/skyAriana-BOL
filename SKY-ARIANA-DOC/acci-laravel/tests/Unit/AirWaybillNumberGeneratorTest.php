<?php

namespace Tests\Unit;

use App\Models\AirWaybill;
use App\Services\AirWaybillNumberGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AirWaybillNumberGeneratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_generates_the_next_eight_digit_serial_for_the_airline_prefix(): void
    {
        AirWaybill::factory()->create([
            'awb_number' => '235-35822253',
            'airline_prefix' => '235',
            'serial_number' => '35822253',
        ]);

        $this->assertSame('235-35822254', app(AirWaybillNumberGenerator::class)->next('235'));
    }
}
