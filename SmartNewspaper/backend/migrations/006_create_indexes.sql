-- Migration 006: Performans indeksleri
-- Sık kullanılan sorgular için optimize edilmiş indeksler.

-- articles tablosu indeksleri
CREATE INDEX IF NOT EXISTS idx_articles_language
  ON articles (language);

CREATE INDEX IF NOT EXISTS idx_articles_category
  ON articles (category)
  WHERE category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_articles_published_at
  ON articles (published_at DESC);

CREATE INDEX IF NOT EXISTS idx_articles_source_type
  ON articles (source_type);

CREATE INDEX IF NOT EXISTS idx_articles_language_category
  ON articles (language, category);

CREATE INDEX IF NOT EXISTS idx_articles_language_published
  ON articles (language, published_at DESC);

-- Kaynak adına göre arama (LIKE sorguları için)
CREATE INDEX IF NOT EXISTS idx_articles_source_name
  ON articles (source_name varchar_pattern_ops);

-- Tam metin arama (Türkçe başlık + açıklama)
CREATE INDEX IF NOT EXISTS idx_articles_fulltext_tr
  ON articles USING GIN (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
  );

-- article_images tablosu indeksleri
CREATE INDEX IF NOT EXISTS idx_article_images_article_id
  ON article_images (article_id);

CREATE INDEX IF NOT EXISTS idx_article_images_rank
  ON article_images (article_id, rank DESC);

-- events tablosu indeksleri
CREATE INDEX IF NOT EXISTS idx_events_event_date
  ON events (event_date);

CREATE INDEX IF NOT EXISTS idx_events_category
  ON events (category);

CREATE INDEX IF NOT EXISTS idx_events_is_important
  ON events (is_important)
  WHERE is_important = TRUE;

-- idx_events_upcoming: partial index NOW() kullanamaz (IMMUTABLE değil)
-- Bunun yerine event_date DESC genel indeksi yeterli (idx_events_event_date)


-- announcements tablosu indeksleri
CREATE INDEX IF NOT EXISTS idx_announcements_priority
  ON announcements (priority);

CREATE INDEX IF NOT EXISTS idx_announcements_expires_at
  ON announcements (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_announcements_published_at
  ON announcements (published_at DESC);

-- collection_runs tablosu indeksleri
CREATE INDEX IF NOT EXISTS idx_collection_runs_started_at
  ON collection_runs (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_collection_runs_status
  ON collection_runs (status);

-- news_sources tablosu indeksleri
CREATE INDEX IF NOT EXISTS idx_news_sources_type
  ON news_sources (type);

CREATE INDEX IF NOT EXISTS idx_news_sources_language
  ON news_sources (language);

CREATE INDEX IF NOT EXISTS idx_news_sources_active
  ON news_sources (is_active)
  WHERE is_active = TRUE;
