-- Migration 027: Add source_logo_url to articles
-- This adds the ability to store publisher logos for each article directly in the articles table.

ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS source_logo_url TEXT;

COMMENT ON COLUMN articles.source_logo_url IS 'Haber kaynağının profil resmi/logosu (RSS kaynaklarında belirtilen)';
