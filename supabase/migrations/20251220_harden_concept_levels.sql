-- Add user_id to concept_levels to decouple RLS from parent concept table
ALTER TABLE concept_levels 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill user_id from parent concepts table
UPDATE concept_levels
SET user_id = concepts.user_id
FROM concepts
WHERE concept_levels.concept_id = concepts.id
AND concept_levels.user_id IS NULL;

-- Update RLS policies for concept_levels to be direct
DROP POLICY IF EXISTS "Users can manage levels for their concepts" ON concept_levels;
DROP POLICY IF EXISTS "Users can manage their own concept levels" ON concept_levels;

CREATE POLICY "Users can manage their own concept levels" ON concept_levels
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE concept_levels ENABLE ROW LEVEL SECURITY;
