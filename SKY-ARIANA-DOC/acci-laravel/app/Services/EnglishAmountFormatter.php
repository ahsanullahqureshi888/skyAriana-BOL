<?php

namespace App\Services;

use InvalidArgumentException;

class EnglishAmountFormatter
{
    private const ONES = [
        0 => 'zero', 1 => 'one', 2 => 'two', 3 => 'three', 4 => 'four',
        5 => 'five', 6 => 'six', 7 => 'seven', 8 => 'eight', 9 => 'nine',
        10 => 'ten', 11 => 'eleven', 12 => 'twelve', 13 => 'thirteen',
        14 => 'fourteen', 15 => 'fifteen', 16 => 'sixteen', 17 => 'seventeen',
        18 => 'eighteen', 19 => 'nineteen',
    ];

    private const TENS = [
        2 => 'twenty', 3 => 'thirty', 4 => 'forty', 5 => 'fifty',
        6 => 'sixty', 7 => 'seventy', 8 => 'eighty', 9 => 'ninety',
    ];

    private const SCALES = [
        1_000_000_000_000 => 'trillion',
        1_000_000_000 => 'billion',
        1_000_000 => 'million',
        1_000 => 'thousand',
    ];

    public function format(float|int|string $amount): string
    {
        if (! is_numeric($amount)) {
            throw new InvalidArgumentException('The amount must be numeric.');
        }

        $normalized = round((float) $amount, 2);
        $whole = (int) floor($normalized);
        $cents = (int) round(($normalized - $whole) * 100);

        $words = $this->integerToWords($whole).' US '.($whole === 1 ? 'Dollar' : 'Dollars');

        if ($cents > 0) {
            $words .= ' and '.$this->integerToWords($cents).' '.($cents === 1 ? 'Cent' : 'Cents');
        }

        $titleCased = preg_replace_callback(
            '/\b[a-z]/',
            fn (array $match): string => strtoupper($match[0]),
            $words,
        );

        return $titleCased.' Only';
    }

    private function integerToWords(int $number): string
    {
        if ($number < 0) {
            return 'minus '.$this->integerToWords(abs($number));
        }

        if ($number < 20) {
            return self::ONES[$number];
        }

        if ($number < 100) {
            $tens = intdiv($number, 10);
            $remainder = $number % 10;

            return self::TENS[$tens].($remainder ? '-'.self::ONES[$remainder] : '');
        }

        if ($number < 1_000) {
            $hundreds = intdiv($number, 100);
            $remainder = $number % 100;

            return self::ONES[$hundreds].' hundred'.($remainder ? ' '.$this->integerToWords($remainder) : '');
        }

        foreach (self::SCALES as $value => $label) {
            if ($number >= $value) {
                $leading = intdiv($number, $value);
                $remainder = $number % $value;

                return $this->integerToWords($leading).' '.$label.($remainder ? ' '.$this->integerToWords($remainder) : '');
            }
        }

        return self::ONES[0];
    }
}
