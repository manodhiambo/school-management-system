-- Migration 036: Change profile_photo_url columns from VARCHAR(500) to TEXT
-- Reason: Base64-encoded images can exceed 500 chars; VARCHAR(500) causes 500 errors on upload

ALTER TABLE students ALTER COLUMN profile_photo_url TYPE TEXT;
ALTER TABLE teachers ALTER COLUMN profile_photo_url TYPE TEXT;
ALTER TABLE parents  ALTER COLUMN profile_photo_url TYPE TEXT;
