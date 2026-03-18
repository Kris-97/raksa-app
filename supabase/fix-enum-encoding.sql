-- =============================================================
-- Fix corrupted project_status enum encoding
-- =============================================================
-- ZERO Finnish characters in this file - all special chars via hex
-- Safe to copy-paste in any encoding environment
-- =============================================================

DO $$
DECLARE
  correct_value text := convert_from(decode('6bc3a4796e6e697373c3a4', 'hex'), 'UTF8');
  corrupted_value text := convert_from(decode('6be2949cc3b1796e6e697373e2949cc3b1', 'hex'), 'UTF8');
BEGIN
  -- Step 1: Change column to text temporarily
  ALTER TABLE public.projects ALTER COLUMN status TYPE text;

  -- Step 2: Fix any existing rows with corrupted value
  UPDATE public.projects SET status = correct_value WHERE status = corrupted_value;

  -- Step 3: Drop the corrupted enum
  DROP TYPE public.project_status;

  -- Step 4: Recreate enum with all values via hex where needed
  EXECUTE format(
    'CREATE TYPE public.project_status AS ENUM (%L, %L, %L, %L)',
    'suunnittelu', correct_value, 'valmis', 'keskeytetty'
  );

  -- Step 5: Convert column back to enum
  ALTER TABLE public.projects ALTER COLUMN status TYPE public.project_status USING status::public.project_status;

  RAISE NOTICE 'Enum fixed! Value is now: %', correct_value;
END $$;

-- Verify (run separately after the DO block)
SELECT enumlabel, encode(enumlabel::bytea, 'hex')
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'project_status';
