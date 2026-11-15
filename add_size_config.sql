-- Add size_config column to uniforms table to store dynamic size configuration
-- The JSONB structure will be:
-- {
--   "type": "single" | "dual",
--   "dimensions": [
--     { "name": "Size", "values": ["S", "M", "L"] },
--     { "name": "Waist", "values": ["28", "30", "32"] }
--   ]
-- }

ALTER TABLE uniforms ADD COLUMN IF NOT EXISTS size_config JSONB DEFAULT NULL;
