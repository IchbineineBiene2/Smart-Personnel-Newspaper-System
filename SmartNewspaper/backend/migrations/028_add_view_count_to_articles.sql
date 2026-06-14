-- Migration 028: articles tablosuna anonim tıklama sayacı ekle
ALTER TABLE articles ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0;
