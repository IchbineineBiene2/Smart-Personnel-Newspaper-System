-- Migration 013: Archive Baskıları
CREATE TABLE IF NOT EXISTS archive_editions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  edition_date DATE NOT NULL,
  edition_type VARCHAR(50) DEFAULT 'daily',
  title VARCHAR(255),
  description TEXT,
  selected_articles INT[] DEFAULT '{}',
  pdf_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_archive_editions_user_id ON archive_editions(user_id);
CREATE INDEX IF NOT EXISTS idx_archive_editions_edition_date ON archive_editions(edition_date DESC);
