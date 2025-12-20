-- Migration: Add multi-concept support to vocab_rows
ALTER TABLE vocab_rows 
ADD COLUMN IF NOT EXISTS "conceptLevelIds" UUID[] DEFAULT '{}';

-- Optional: Create index for searching in array
CREATE INDEX IF NOT EXISTS idx_vocab_rows_concept_level_ids ON vocab_rows USING GIN ("conceptLevelIds");

-- Optional: Sync existing conceptLevelId to the new array
UPDATE vocab_rows
SET "conceptLevelIds" = ARRAY["conceptLevelId"]
WHERE "conceptLevelId" IS NOT NULL 
AND ("conceptLevelIds" IS NULL OR cardinality("conceptLevelIds") = 0);
