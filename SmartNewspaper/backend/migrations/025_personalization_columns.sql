-- Migration 025: Personalization columns
--
-- user_preferences için:
--   - preferred_categories: INT[] → VARCHAR(50)[] (frontend string enum kullanıyor)
--   - preferred_languages VARCHAR(10)[]  (mevcut tekil `language` korunur, ama feed çoklu dil için kullanır)
--   - preferred_sources VARCHAR(100)[]   (kaynak adı bazlı follow/mute)
--   - muted_sources VARCHAR(100)[]       (explicit mute — preferred ile karışmasın)
--   - interest_vector vector(768)        (mE5-base embedding, kullanıcı davranışından öğrenilir)
--   - interest_vector_updated_at, interest_vector_sample_count
--
-- users için:
--   - last_seen_at TIMESTAMPTZ (kullanıcının son aktivite zamanı — "X yeni haber" badge için)
--   - device_locale VARCHAR(10) (cihaz/uygulama dili)

-- 1) preferred_categories tipini stringa çevir (mevcut int değerler varsa kaybolur — şu an boş)
ALTER TABLE user_preferences
  ALTER COLUMN preferred_categories DROP DEFAULT;

ALTER TABLE user_preferences
  ALTER COLUMN preferred_categories TYPE VARCHAR(50)[] USING ARRAY[]::VARCHAR(50)[];

ALTER TABLE user_preferences
  ALTER COLUMN preferred_categories SET DEFAULT ARRAY[]::VARCHAR(50)[];

-- 2) Yeni array kolonları
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS preferred_languages VARCHAR(10)[] DEFAULT ARRAY[]::VARCHAR(10)[];

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS preferred_sources VARCHAR(100)[] DEFAULT ARRAY[]::VARCHAR(100)[];

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS muted_sources VARCHAR(100)[] DEFAULT ARRAY[]::VARCHAR(100)[];

-- 3) Interest vector — embedding bazlı kişiselleştirme için
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS interest_vector vector(768);

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS interest_vector_updated_at TIMESTAMPTZ;

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS interest_vector_sample_count INTEGER DEFAULT 0;

COMMENT ON COLUMN user_preferences.interest_vector IS 'User taste vector: avg of liked/viewed article embedding_v2; mE5-base 768-dim';
COMMENT ON COLUMN user_preferences.preferred_languages IS 'Çoklu dil; boşsa tüm diller dönsün. mevcut `language` tekil tercih korunur.';
COMMENT ON COLUMN user_preferences.preferred_sources IS 'Bu kaynaklar görüldüğünde ranking yukarı çekilsin; boşsa pasif.';
COMMENT ON COLUMN user_preferences.muted_sources IS 'Bu kaynaklar feed''den hard-filter olarak çıkarılsın.';

-- 4) users tablosuna last_seen + device_locale
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS device_locale VARCHAR(10);

CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen_at);

-- 5) Article view history — read tracking (Faz 2 için temel, ama tabloyu şimdi kuralım)
CREATE TABLE IF NOT EXISTS article_views (
  id           BIGSERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id   VARCHAR(64) NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  viewed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dwell_ms     INTEGER,
  scroll_pct   SMALLINT,
  source_ctx   VARCHAR(50),   -- 'feed' | 'similar' | 'search' | 'notification' | ...
  UNIQUE (user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_article_views_user_recent
  ON article_views(user_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_article_views_article
  ON article_views(article_id);
