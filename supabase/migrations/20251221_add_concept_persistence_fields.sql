-- Migration: Add support for Concept Notes and fix casing mismatches
-- 1. Bổ sung cột ghi chú giải thích (Justification Notes) cho Vocab Row
ALTER TABLE vocab_rows 
ADD COLUMN IF NOT EXISTS concept_notes JSONB DEFAULT '{}';

-- 2. Bổ sung cột màu sắc cho Concept (để vạch màu indicator bền vững)
ALTER TABLE concepts
ADD COLUMN IF NOT EXISTS color TEXT;

-- 3. (Phụ trợ) Đảm bảo các cột link concept ở dạng chuẩn snake_case
-- Đoạn này chạy để chắc chắn đồng bộ với logic code
ALTER TABLE vocab_rows 
ADD COLUMN IF NOT EXISTS concept_level_id UUID REFERENCES concept_levels(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS concept_level_ids UUID[] DEFAULT '{}';

-- 4. Tạo index để tìm kiếm nhanh hơn (tùy chọn nhưng nên có)
CREATE INDEX IF NOT EXISTS idx_vocab_rows_concept_notes ON vocab_rows USING GIN (concept_notes);
