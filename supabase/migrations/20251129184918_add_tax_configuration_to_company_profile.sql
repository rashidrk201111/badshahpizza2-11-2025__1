/*
  # Add Tax Configuration to Company Profile

  1. Changes
    - Add `default_tax_rate` column to company_profile table (numeric, default 5.0 for 5%)
    - Add `tax_name` column to store tax label (e.g., "GST", "VAT", "Sales Tax")
    - Add `enable_tax` column to allow toggling tax on/off

  2. Purpose
    - Allow businesses to configure their tax rate from Company Profile
    - Make tax rate dynamic instead of hardcoded
    - Support different tax types and rates
*/

-- Add tax configuration columns to company_profile
ALTER TABLE company_profile 
ADD COLUMN IF NOT EXISTS default_tax_rate numeric DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS tax_name text DEFAULT 'GST',
ADD COLUMN IF NOT EXISTS enable_tax boolean DEFAULT true;

-- Add check constraint to ensure tax rate is between 0 and 100
ALTER TABLE company_profile 
ADD CONSTRAINT check_tax_rate_range 
CHECK (default_tax_rate >= 0 AND default_tax_rate <= 100);

COMMENT ON COLUMN company_profile.default_tax_rate IS 'Default tax rate percentage (e.g., 5.0 for 5%)';
COMMENT ON COLUMN company_profile.tax_name IS 'Tax type name (e.g., GST, VAT, Sales Tax)';
COMMENT ON COLUMN company_profile.enable_tax IS 'Enable/disable tax calculation';
