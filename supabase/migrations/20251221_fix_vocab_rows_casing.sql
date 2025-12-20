-- Migration: Standardize vocab_rows column casing to snake_case
-- Renaming "conceptLevelId" and "conceptLevelIds" to "concept_level_id" and "concept_level_ids"

-- 1. Handle conceptLevelId -> concept_level_id
DO $$
BEGIN
    -- Check if the camelCase column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vocab_rows' AND column_name = 'conceptLevelId') THEN
        ALTER TABLE vocab_rows RENAME COLUMN "conceptLevelId" TO concept_level_id;
    END IF;
END $$;

-- 2. Handle conceptLevelIds -> concept_level_ids
DO $$
BEGIN
    -- Check if the camelCase column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vocab_rows' AND column_name = 'conceptLevelIds') THEN
        ALTER TABLE vocab_rows RENAME COLUMN "conceptLevelIds" TO concept_level_ids;
    END IF;
END $$;

-- 3. Ensure columns exist if they weren't renamed (e.g. if previous migration failed completely or partially)
ALTER TABLE vocab_rows 
ADD COLUMN IF NOT EXISTS concept_level_id UUID REFERENCES concept_levels(id) ON DELETE SET NULL;

ALTER TABLE vocab_rows 
ADD COLUMN IF NOT EXISTS concept_level_ids UUID[] DEFAULT '{}';

-- 4. Re-create index on new name if needed
DROP INDEX IF EXISTS idx_vocab_rows_concept_level_ids;
CREATE INDEX IF NOT EXISTS idx_vocab_rows_concept_level_array ON vocab_rows USING GIN (concept_level_ids);
