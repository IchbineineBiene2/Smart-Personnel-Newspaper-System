-- Migration 019: Store article snapshots for reliable archive exports
ALTER TABLE archive_editions
  ADD COLUMN IF NOT EXISTS articles_snapshot JSONB DEFAULT '[]';
