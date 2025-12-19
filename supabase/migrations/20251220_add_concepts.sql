-- Create concepts table
CREATE TABLE IF NOT EXISTS concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000),
    modified_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000),
    UNIQUE(user_id, code)
);

-- Create concept_levels table
CREATE TABLE IF NOT EXISTS concept_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)
);

-- Add conceptLevelId to vocab_rows
ALTER TABLE vocab_rows 
ADD COLUMN IF NOT EXISTS "conceptLevelId" UUID REFERENCES concept_levels(id) ON DELETE SET NULL;

-- Create RLS policies
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own concepts" ON concepts
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage levels for their concepts" ON concept_levels
    USING (EXISTS (SELECT 1 FROM concepts WHERE concepts.id = concept_levels.concept_id AND concepts.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM concepts WHERE concepts.id = concept_levels.concept_id AND concepts.user_id = auth.uid()));
