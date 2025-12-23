-- Migration: Add is_starred and full_transcript to dictation_notes
-- Fixes sync error 400 (Bad Request) and enables "Master Transcript" persistence

ALTER TABLE dictation_notes 
ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;

ALTER TABLE dictation_notes 
ADD COLUMN IF NOT EXISTS full_transcript JSONB DEFAULT '[]';
