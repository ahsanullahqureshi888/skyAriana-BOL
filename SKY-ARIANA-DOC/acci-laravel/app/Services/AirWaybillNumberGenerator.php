<?php

namespace App\Services;

use App\Models\AirWaybill;

class AirWaybillNumberGenerator
{
    private const DEFAULT_PREFIX = '235';

    private const FIRST_SERIAL = 35822254;

    public function next(string $prefix = self::DEFAULT_PREFIX): string
    {
        $normalizedPrefix = preg_replace('/\D/', '', $prefix) ?: self::DEFAULT_PREFIX;
        $normalizedPrefix = str_pad(substr($normalizedPrefix, 0, 3), 3, '0', STR_PAD_LEFT);

        $lastSerial = AirWaybill::query()
            ->where('airline_prefix', $normalizedPrefix)
            ->max('serial_number');

        $serial = self::FIRST_SERIAL;

        if (is_numeric($lastSerial)) {
            $serial = max(self::FIRST_SERIAL, ((int) $lastSerial) + 1);
        }

        return $normalizedPrefix.'-'.str_pad((string) $serial, 8, '0', STR_PAD_LEFT);
    }

    /**
     * @return array{prefix: string, serial: string}
     */
    public function split(string $awbNumber): array
    {
        if (preg_match('/^(\d{3})-(\d{8})$/', $awbNumber, $matches) === 1) {
            return ['prefix' => $matches[1], 'serial' => $matches[2]];
        }

        return ['prefix' => self::DEFAULT_PREFIX, 'serial' => (string) self::FIRST_SERIAL];
    }
}
