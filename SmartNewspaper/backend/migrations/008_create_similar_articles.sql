CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS similar_articles (
  id SERIAL PRIMARY KEY,
  article_id_1 VARCHAR(32) NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  article_id_2 VARCHAR(32) NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  similarity_score NUMERIC(5,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_similar_articles UNIQUE(article_id_1, article_id_2)
);

CREATE INDEX IF NOT EXISTS idx_similar_articles_1 ON similar_articles(article_id_1);
CREATE INDEX IF NOT EXISTS idx_similar_articles_2 ON similar_articles(article_id_2);

COMMENT ON TABLE similar_articles IS 'Benzer makalelerin tutulduğu tablo. article_id_1 her zaman article_id_2 den lexicographically daha küçük olmalı.';
