-- Migration 017: Article likes and threaded comments
CREATE TABLE IF NOT EXISTS article_likes (
  id SERIAL PRIMARY KEY,
  article_id VARCHAR(32) NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (article_id, user_id)
);

CREATE TABLE IF NOT EXISTS article_comments (
  id SERIAL PRIMARY KEY,
  article_id VARCHAR(32) NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id INT REFERENCES article_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (char_length(trim(content)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_article_likes_article_id ON article_likes(article_id);
CREATE INDEX IF NOT EXISTS idx_article_likes_user_id ON article_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_article_id ON article_comments(article_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_parent_id ON article_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_created_at ON article_comments(created_at DESC);
