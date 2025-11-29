/*
  # Add Discount Fields to Invoices

  1. Changes
    - Add `discount` column to `invoices` table (numeric, default 0)
    - Add `discount_reason` column to `invoices` table (text, nullable)

  2. Purpose
    - Allow restaurants to apply discounts to customer bills
    - Track reason for discount (e.g., "Regular customer", "Promotional offer")
*/

-- Add discount columns to invoices table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'discount'
  ) THEN
    ALTER TABLE invoices ADD COLUMN discount numeric(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'discount_reason'
  ) THEN
    ALTER TABLE invoices ADD COLUMN discount_reason text;
  END IF;
END $$;
