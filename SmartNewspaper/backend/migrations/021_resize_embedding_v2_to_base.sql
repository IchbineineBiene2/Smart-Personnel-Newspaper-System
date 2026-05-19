-- Migration 021: embedding_v2'yi multilingual-e5-base (768-dim)'a indir.
--
-- Sebep: e5-large (1024-dim, ~2.2GB ONNX) sunucuda OOM ile crash oluyordu.
-- Fixture bench: base'in ayrım kalitesi large ile aynı; RAM 4-5x azalıyor.
--
-- Tüm DDL'ler metadata-only (DROP/ADD column hızlı, TRUNCATE O(1)) —
-- prod diski WAL fsync'inde yavaş olduğu için satır-başı UPDATE'ten kaçınıldı.
-- embedding_v2 NULL olduğu için kod hash'e bakmadan zaten yeniden hesaplayacak
-- (bkz. embeddingV2.ts:135 — `embedding_v2 IS NULL OR ... input_hash IS NULL`).

ALTER TABLE articles DROP COLUMN IF EXISTS embedding_v2;
ALTER TABLE articles ADD COLUMN embedding_v2 vector(768);

COMMENT ON COLUMN articles.embedding_v2 IS 'multilingual-e5-base (768-dim) — title + description + content[:1500] üzerinden hesaplanır';

-- Eski model ile hesaplanmış benzerlikleri temizle (truncate fsync'siz, anlık)
TRUNCATE TABLE similar_articles;
