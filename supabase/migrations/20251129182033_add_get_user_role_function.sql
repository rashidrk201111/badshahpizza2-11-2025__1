/*
  # Add function to get user role

  1. New Functions
    - `get_user_role` - Security definer function to get user role bypassing RLS
  
  2. Security
    - Function runs with security definer (bypasses RLS)
    - Returns user role or null if not found
*/

CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = user_id LIMIT 1;
$$;