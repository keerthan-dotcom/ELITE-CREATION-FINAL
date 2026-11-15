-- Add description_image_url to uniforms table
ALTER TABLE uniforms ADD COLUMN IF NOT EXISTS description_image_url TEXT;
