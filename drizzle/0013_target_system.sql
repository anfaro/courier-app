ALTER TABLE users ADD COLUMN IF NOT EXISTS target_system boolean DEFAULT true NOT NULL;
