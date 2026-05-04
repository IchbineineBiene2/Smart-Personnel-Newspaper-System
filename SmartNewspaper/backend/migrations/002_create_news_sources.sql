-- Migration 002: Haber kaynakları tablosu
-- RSS feed'leri, NewsAPI ve Guardian gibi tüm kayıtlı haber kaynaklarını tutar.

CREATE TABLE IF NOT EXISTS news_sources (
  id              SERIAL        PRIMARY KEY,
  name            VARCHAR(200)  NOT NULL,
  url             TEXT          NOT NULL UNIQUE,
  type            VARCHAR(20)   NOT NULL CHECK (type IN ('rss', 'newsapi', 'guardian')),
  language        VARCHAR(5)    NOT NULL DEFAULT 'tr',
  category        VARCHAR(50),
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  last_fetched_at TIMESTAMPTZ,
  article_count   INTEGER       NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  news_sources IS 'Sisteme kayıtlı haber kaynakları (RSS, NewsAPI, Guardian)';
COMMENT ON COLUMN news_sources.type IS 'Kaynak türü: rss | newsapi | guardian';
COMMENT ON COLUMN news_sources.article_count IS 'Bu kaynaktan toplam toplanan haber sayısı';
