-- Migration: Complete SQL fix for Concept Persistence (Compatibility Mode)
-- 1. Thêm cột chuẩn snake_case cho Concept Notes (Ghi chú giải thích)
ALTER TABLE vocab_rows 
ADD COLUMN IF NOT EXISTS concept_notes JSONB DEFAULT '{}';

-- 2. Thêm cột alias camelCase để giải quyết lỗi 400 do Code đang gửi trường "conceptNotes"
-- (Cần bọc trong dấu ngoặc kép để Postgres chấp nhận camelCase)
ALTER TABLE vocab_rows 
ADD COLUMN IF NOT EXISTS "conceptNotes" JSONB DEFAULT '{}';

-- 3. Thêm cột màu sắc cho Concept
ALTER TABLE concepts
ADD COLUMN IF NOT EXISTS color TEXT;

-- 4. Đảm bảo hỗ trợ nhiều concept cùng lúc (Multi-concept support)
ALTER TABLE vocab_rows 
ADD COLUMN IF NOT EXISTS concept_level_id UUID REFERENCES concept_levels(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS concept_level_ids UUID[] DEFAULT '{}';

-- 5. Tạo các Index để tăng tốc độ truy vấn
CREATE INDEX IF NOT EXISTS idx_vocab_rows_concept_notes_snake ON vocab_rows USING GIN (concept_notes);
CREATE INDEX IF NOT EXISTS idx_vocab_rows_concept_notes_camel ON vocab_rows USING GIN ("conceptNotes");
CREATE INDEX IF NOT EXISTS idx_vocab_rows_concept_level_array ON vocab_rows USING GIN (concept_level_ids);
