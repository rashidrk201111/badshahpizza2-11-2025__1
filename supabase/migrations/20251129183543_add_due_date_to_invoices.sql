/*
  # Add due_date column to invoices table

  1. Changes
    - Add `due_date` column to invoices table (DATE type, defaults to current date)
    - Create index on due_date for performance

  2. Notes
    - Existing invoices will have due_date set to their creation date
    - This column is used by Payment Receivables to track payment deadlines
*/

-- Add due_date column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE invoices ADD COLUMN due_date date DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- Update existing invoices to set due_date to their created_at date
UPDATE invoices 
SET due_date = created_at::date 
WHERE due_date IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);