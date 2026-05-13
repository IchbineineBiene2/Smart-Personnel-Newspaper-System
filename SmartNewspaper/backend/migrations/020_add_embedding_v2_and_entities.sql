-- Migration 020: Yeni embedding modeline (multilingual-e5-large, 1024-dim) geçiş + entity tabanlı eşleştirme

-- 1) Yeni embedding kolonu (eski 384-dim 'embedding' kolonu geçiş süresince korunur)
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS embedding_v2 vector(1024);

-- 2) Yeni embedding modelinin girdisinin son hash'ini sakla — gereksiz yeniden hesaplamayı önle
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS embedding_v2_input_hash VARCHAR(32);

-- 3) Entity çıkarımı: kişi, kurum, yer, sayı/tarih anahtarları
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS entities JSONB;

COMMENT ON COLUMN articles.embedding_v2 IS 'multilingual-e5-large (1024-dim) — title + description + content[:1500] üzerinden hesaplanır';
COMMENT ON COLUMN articles.entities IS '{persons:[], orgs:[], places:[], numbers:[]} — iki katmanlı benzerlik için entity overlap kontrolü';

-- 4) similar_articles tablosuna kind kolonu (duplicate / same_event / related)
ALTER TABLE similar_articles
  ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'same_event';

ALTER TABLE similar_articles
  DROP CONSTRAINT IF EXISTS similar_articles_kind_check;
ALTER TABLE similar_articles
  ADD CONSTRAINT similar_articles_kind_check
  CHECK (kind IN ('duplicate', 'same_event', 'related'));

-- entity_overlap snapshot — debug ve dashboard için
ALTER TABLE similar_articles
  ADD COLUMN IF NOT EXISTS entity_overlap SMALLINT;

ALTER TABLE similar_articles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_similar_articles_kind
  ON similar_articles(kind);

CREATE INDEX IF NOT EXISTS idx_similar_articles_score_desc
  ON similar_articles(similarity_score DESC);

-- 5) HNSW index — cosine distance üzerinde KNN için. m=16, ef_construction=64 makul başlangıç.
-- NOT: Bu index'i ilk pilot backfill bitince oluşturacağız (boş tabloyla index oluşturmak verimsiz).
-- Manuel komut (backfill sonrası):
--   CREATE INDEX CONCURRENTLY idx_articles_embedding_v2_hnsw
--     ON articles USING hnsw (embedding_v2 vector_cosine_ops)
--     WITH (m = 16, ef_construction = 64);

-- 6) Backfill ilerleme tablosu — uzun süren işin durumunu DB'den izleyebilelim
CREATE TABLE IF NOT EXISTS embedding_backfill_progress (
  id              SERIAL PRIMARY KEY,
  run_label       VARCHAR(50) NOT NULL,
  total_articles  INTEGER NOT NULL,
  processed       INTEGER NOT NULL DEFAULT 0,
  failed          INTEGER NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'running'
                  CHECK (status IN ('running', 'paused', 'completed', 'failed')),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  error_message   TEXT,
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_backfill_progress_status
  ON embedding_backfill_progress(status);

COMMENT ON TABLE embedding_backfill_progress IS 'multilingual-e5-large embedding backfill ilerleme takibi';
