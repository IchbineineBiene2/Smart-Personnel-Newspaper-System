-- Migration 003: Haberler ve haber resimleri tabloları
-- Tüm haberler kalıcı olarak bu tabloda tutulur (eski in-memory cache'in yerini alır).

CREATE TABLE IF NOT EXISTS articles (
  id           VARCHAR(32)   PRIMARY KEY,            -- MD5(url) — duplicate tespiti için
  title        TEXT          NOT NULL,
  description  TEXT,
  content      TEXT,                                  -- Tam metin (scraping'den)
  url          TEXT          NOT NULL UNIQUE,
  image_url    TEXT,
  published_at TIMESTAMPTZ   NOT NULL,
  language     VARCHAR(5)    NOT NULL DEFAULT 'tr',
  category     VARCHAR(50),
  source_name  VARCHAR(200)  NOT NULL,
  source_url   TEXT,
  source_type  VARCHAR(20)   NOT NULL DEFAULT 'rss'
               CHECK (source_type IN ('rss', 'newsapi', 'guardian')),
  is_scraped   BOOLEAN       NOT NULL DEFAULT FALSE,  -- Tam metin scraping yapıldı mı?
  scraped_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  articles IS 'Tüm haber makaleleri — RSS, NewsAPI ve Guardian kaynaklarından toplanan';
COMMENT ON COLUMN articles.id IS 'URL''nin MD5 hash''i, tekrar eden haberleri önler';
COMMENT ON COLUMN articles.is_scraped IS 'TRUE ise content sütunu dolu, scraping tamamlanmış demektir';

-- Bir haberin birden fazla resmi olabilir (galeri desteği)
CREATE TABLE IF NOT EXISTS article_images (
  id         SERIAL       PRIMARY KEY,
  article_id VARCHAR(32)  NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  url        TEXT         NOT NULL,
  rank       INTEGER      NOT NULL DEFAULT 0,   -- Yüksek rank = daha öncelikli resim
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  article_images IS 'Bir makaleye ait ek resimler (og:image, article img, vs.)';
COMMENT ON COLUMN article_images.rank IS 'Resim öncelik skoru: og:image=200, article img=100..., JSON-LD=40';
