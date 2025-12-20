-- Fix missing columns in concepts table
-- Run this in your Supabase SQL Editor

-- 1. Add is_folder column
ALTER TABLE concepts 
ADD COLUMN IF NOT EXISTS is_folder BOOLEAN DEFAULT false;

-- 2. Add parent_id column for hierarchy
ALTER TABLE concepts 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES concepts(id) ON DELETE CASCADE;

-- 3. Add index for performance
CREATE INDEX IF NOT EXISTS idx_concepts_parent_id ON concepts(parent_id);
