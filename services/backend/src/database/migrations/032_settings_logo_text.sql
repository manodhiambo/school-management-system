-- Migration 032: Widen school_logo_url to TEXT to support base64-encoded image uploads
ALTER TABLE settings ALTER COLUMN school_logo_url TYPE TEXT;
