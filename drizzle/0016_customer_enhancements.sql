-- Add structured customer fields for enhanced delivery notes and multiple house pictures
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS house_pictures text,
  ADD COLUMN IF NOT EXISTS landmark text,
  ADD COLUMN IF NOT EXISTS access_info text;
