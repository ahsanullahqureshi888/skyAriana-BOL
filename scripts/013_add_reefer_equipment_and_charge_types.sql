-- ====================================================================
-- Migration: 013_add_reefer_equipment_and_charge_types.sql
-- Description: Add equipment_type (40RF, 20RF), reefer accessorials
-- (plugging charges, escort service, temperature), and master charge_types table.
-- ====================================================================

-- 1. Extend Bills of Lading table with equipment and reefer accessorials
ALTER TABLE IF EXISTS bills_of_lading
ADD COLUMN IF NOT EXISTS equipment_type VARCHAR(20) DEFAULT '40HC',
ADD COLUMN IF NOT EXISTS temperature_setting VARCHAR(30),
ADD COLUMN IF NOT EXISTS plugging_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS escort_service_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS genset_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trf_tax_included BOOLEAN DEFAULT TRUE;

-- 2. Create Master Charge Types Table
CREATE TABLE IF NOT EXISTS master_charge_types (
  charge_code VARCHAR(30) PRIMARY KEY,
  name_en VARCHAR(100) NOT NULL,
  name_fa_ps VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'accessorial', 'customs', 'transport', 'security', 'port', 'admin'
  equipment_restriction VARCHAR(20), -- e.g. 'REEFER', 'ALL', 'BONDED'
  default_currency VARCHAR(10) DEFAULT 'USD',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Seed Standard & Reefer Charge Types
INSERT INTO master_charge_types (charge_code, name_en, name_fa_ps, category, equipment_restriction, default_currency)
VALUES
  ('ESCORT_FEE', 'Escort Service / Bonded Escort', 'مامور بدرقه / اسکورت امنیتی گمرک', 'security', 'BONDED', 'USD'),
  ('PLUG_FEE', 'Plugging Charges (Reefer Power & Monitoring)', 'هزینه اتصال برق و مانیتورینگ کانتینر یخچالی', 'accessorial', 'REEFER', 'USD'),
  ('CMSN', 'Admin Commission Fee', 'کمیسیون و حق‌العمل کاری مدیریتی', 'admin', 'ALL', 'USD'),
  ('TRF', 'Terminal Receiving Fee / Tax', 'عوارض و مالیات پایانه (TRF)', 'port', 'ALL', 'USD'),
  ('EXP_THC', 'Export Terminal Handling Charge', 'هزینه پایانه و جابجایی صادراتی (THC)', 'port', 'ALL', 'USD'),
  ('VGM_FEE', 'Verified Gross Mass (VGM) Submission', 'تاییدیه و ثبت رسمی وزن ناخالص کانتینر (VGM)', 'port', 'ALL', 'USD'),
  ('BOND_FEE', 'Transit Bond Issuance', 'صدور ضمانت‌نامه ترانزیت ورودی / T1', 'customs', 'ALL', 'USD'),
  ('CUSTOMS_EXIT', 'Afghan Export Customs Clearance', 'ترخیص گمرکی صادرات افغانستان', 'customs', 'ALL', 'USD'),
  ('TRUCKING_IRAN', 'Iran Inland Trucking Freight', 'کرایه لاری ترانزیت جاده‌ای ایران', 'transport', 'ALL', 'USD'),
  ('TRUCKING_TURKEY', 'Turkey Inland Trucking Freight', 'کرایه لاری حمل داخلی ترکیه', 'transport', 'ALL', 'USD'),
  ('OCEAN_FRT', 'Ocean Freight Transit', 'کرایه حمل کانتینری دریایی', 'transport', 'ALL', 'USD'),
  ('RISK_BUFFER', 'Border Wait Contingency Buffer', 'بافر ریسک و هزینه توقف مرزی', 'accessorial', 'ALL', 'USD')
ON CONFLICT (charge_code) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_fa_ps = EXCLUDED.name_fa_ps,
  category = EXCLUDED.category,
  equipment_restriction = EXCLUDED.equipment_restriction;

-- 4. Create Index on equipment_type
CREATE INDEX IF NOT EXISTS idx_bol_equipment_type ON bills_of_lading (equipment_type);
