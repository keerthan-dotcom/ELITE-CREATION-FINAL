-- Identify and delete duplicate schools, keeping the one with the earliest creation date
-- (or latest, doesn't matter much for initial seed data, but earliest implies original)

WITH duplicates AS (
  SELECT
    id,
    name,
    ROW_NUMBER() OVER (
      PARTITION BY name
      ORDER BY created_at ASC
    ) as row_num
  FROM public.schools
)
DELETE FROM public.schools
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- Re-run the update for school codes just in case
UPDATE public.schools SET school_code = UPPER(SUBSTRING(name, 1, 3)) WHERE school_code IS NULL;
