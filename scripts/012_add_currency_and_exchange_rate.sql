-- Migration 012: Multi-Currency Logistics Support & Exchange Rate Normalization
-- Fixes AFN Driver Freight being incorrectly treated as USD in Profit & Loss calculations.

-- 1. Add currency flags and USD normalized columns to ledger table
ALTER TABLE ledger
ADD COLUMN IF NOT EXISTS driver_freight_currency VARCHAR(10) DEFAULT 'AFN',
ADD COLUMN IF NOT EXISTS shipping_cost_currency VARCHAR(10) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS afn_to_usd_rate NUMERIC(10, 4) DEFAULT 70.0,
ADD COLUMN IF NOT EXISTS driver_rent_usd NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(12, 2);

-- 2. Add currency flags to bill_of_lading table if applicable
ALTER TABLE bill_of_lading
ADD COLUMN IF NOT EXISTS driver_rent_currency VARCHAR(10) DEFAULT 'AFN',
ADD COLUMN IF NOT EXISTS shipping_cost_currency VARCHAR(10) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS afn_to_usd_rate NUMERIC(10, 4) DEFAULT 70.0,
ADD COLUMN IF NOT EXISTS driver_rent_usd NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS shipping_cost_usd NUMERIC(12, 2);

-- 3. Data Migration / Cleanup: Recalculate historical faulty records
-- Any driver rent with amount > 5000 is AFN and converted at 70.0 AFN per USD.
UPDATE ledger
SET
  driver_freight_currency = 'AFN',
  afn_to_usd_rate = 70.0,
  driver_rent_usd = ROUND(CAST(REGEXP_REPLACE(driver_rent, '[^0-9.]', '', 'g') AS NUMERIC) / 70.0, 2)
WHERE
  driver_rent IS NOT NULL
  AND driver_rent ~ '[0-9]'
  AND CAST(NULLIF(REGEXP_REPLACE(driver_rent, '[^0-9.]', '', 'g'), '') AS NUMERIC) >= 5000;
