<?php

namespace Tests\Unit;

use App\Services\EnglishAmountFormatter;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class EnglishAmountFormatterTest extends TestCase
{
    #[DataProvider('amounts')]
    public function test_it_formats_us_dollar_amounts(float $amount, string $expected): void
    {
        $this->assertSame($expected, (new EnglishAmountFormatter)->format($amount));
    }

    public static function amounts(): array
    {
        return [
            'sample invoice' => [76090.56, 'Seventy-Six Thousand Ninety US Dollars And Fifty-Six Cents Only'],
            'whole dollar' => [1, 'One US Dollar Only'],
            'single cent' => [20.01, 'Twenty US Dollars And One Cent Only'],
            'zero' => [0, 'Zero US Dollars Only'],
        ];
    }
}
