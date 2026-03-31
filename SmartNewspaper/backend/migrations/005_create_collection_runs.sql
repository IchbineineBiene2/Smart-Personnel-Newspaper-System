-- Migration 005: Koleksiyon çalışma geçmişi
-- Her haber toplama işlemi kayıt altına alınır; monitoring ve hata ayıklama için.

CREATE TABLE IF NOT EXISTS collection_runs (
  id                  SERIAL       PRIMARY KEY,
  started_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  articles_collected  INTEGER      NOT NULL DEFAULT 0,  -- Kaynaklardan gelen toplam
  articles_new        INTEGER      NOT NULL DEFAULT 0,  -- DB'ye yazılan yeni haber sayısı
  articles_duplicate  INTEGER      NOT NULL DEFAULT 0,  -- Tekrar eden ve atlanan sayısı
  source_types        TEXT[]       DEFAULT '{}',        -- ['rss', 'newsapi', 'guardian']
  status              VARCHAR(20)  NOT NULL DEFAULT 'running'
                      CHECK (status IN ('running', 'success', 'failed')),
  error_message       TEXT,
  duration_ms         INTEGER                           -- Toplama süresini ms cinsinden tutar
);

COMMENT ON TABLE  collection_runs IS 'Her haber toplama döngüsünün audit kaydı';
COMMENT ON COLUMN collection_runs.articles_new IS 'Bu çalışmada DB''ye yeni eklenen haber sayısı';
COMMENT ON COLUMN collection_runs.articles_duplicate IS 'Zaten var olduğu için atlanan haber sayısı';
COMMENT ON COLUMN collection_runs.duration_ms IS 'Koleksiyonun başından sonuna toplam süre (milisaniye)';
