-- Migration 001: Migration takip tablosu
-- Bu tablo hangi migration'ların uygulandığını kaydeder.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version      VARCHAR(50)  PRIMARY KEY,
  description  TEXT,
  applied_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
