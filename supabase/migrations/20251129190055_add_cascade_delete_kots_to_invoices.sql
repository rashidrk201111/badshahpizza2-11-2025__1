/*
  # Add Cascade Delete from KOTs to Invoices

  1. Changes
    - Updates the foreign key constraint on invoices.kot_id
    - Changes from SET NULL to CASCADE
    - When a KOT is deleted, all associated invoices will be automatically deleted

  2. Security
    - No RLS changes needed
    - Maintains existing security policies
*/

-- First, find and drop the existing foreign key constraint
DO $$
DECLARE
  constraint_name_var TEXT;
BEGIN
  -- Get the constraint name
  SELECT tc.constraint_name INTO constraint_name_var
  FROM information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'invoices'
    AND kcu.column_name = 'kot_id'
    AND ccu.table_name = 'kots';

  -- Drop the existing constraint if it exists
  IF constraint_name_var IS NOT NULL THEN
    EXECUTE 'ALTER TABLE invoices DROP CONSTRAINT IF EXISTS ' || constraint_name_var;
  END IF;
END $$;

-- Add the new foreign key constraint with CASCADE delete
ALTER TABLE invoices 
ADD CONSTRAINT invoices_kot_id_fkey 
FOREIGN KEY (kot_id) 
REFERENCES kots(id) 
ON DELETE CASCADE;