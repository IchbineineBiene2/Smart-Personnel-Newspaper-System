-- Migration 021: embedding_v2'yi multilingual-e5-base (768-dim)'a indir.
--
-- Sebep: e5-large (1024-dim, ~2.2GB ONNX) sunucuda OOM ile crash oluyordu.
-- Fixture bench (small/base/large) base'in ayrım kalitesinin large ile aynı
-- olduğunu gösterdi; RAM 4-5x azalıyor.
--
-- Dikkat: pgvector tip değişimini doğrudan desteklemez. Kolonu DROP + ADD
-- ediyoruz; mevcut tüm embedding'ler kaybolur ve yeniden hesaplanmaları
-- gerekir. similar_articles içeriği eski model çıktısı olduğu için truncate
-- ediliyor — backfill ve incremental sweep ile yeniden doldurulacak.

ALTER TABLE articles DROP COLUMN IF EXISTS embedding_v2;
ALTER TABLE articles ADD COLUMN embedding_v2 vector(768);

-- Tüm girdi hash'leri geçersiz (model değişti → output değişti)
UPDATE articles SET embedding_v2_input_hash = NULL WHERE embedding_v2_input_hash IS NOT NULL;

COMMENT ON COLUMN articles.embedding_v2 IS 'multilingual-e5-base (768-dim) — title + description + content[:1500] üzerinden hesaplanır';

-- Eski model ile hesaplanmış benzerlikleri temizle
TRUNCATE TABLE similar_articles;

-- Backfill ilerleme tablosunda eski koşuları arşivle
UPDATE embedding_backfill_progress
   SET status = 'failed',
       error_message = COALESCE(error_message, '') || ' [arşiv: model değişti (large→base)]',
       updated_at = NOW()
 WHERE status IN ('running', 'paused');
