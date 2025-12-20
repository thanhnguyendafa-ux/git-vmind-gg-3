-- Add created_at and modified_at to vocab_rows
ALTER TABLE vocab_rows 
ADD COLUMN IF NOT EXISTS created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000),
ADD COLUMN IF NOT EXISTS modified_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000);

-- Update existing rows to have a default timestamp if needed (optional since we set DEFAULT)
-- UPDATE vocab_rows SET created_at = (extract(epoch from now()) * 1000) WHERE created_at IS NULL;
-- UPDATE vocab_rows SET modified_at = (extract(epoch from now()) * 1000) WHERE modified_at IS NULL;
