-- Migration 023: Kullanici ad soyad alani
ALTER TABLE users
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

UPDATE users
SET full_name = username
WHERE role = 'user'
  AND (full_name IS NULL OR BTRIM(full_name) = '');

CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(full_name);
