-- Migration 011: Kullanıcı Tercihleri
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferred_categories INT[] DEFAULT '{}',
  language VARCHAR(10) DEFAULT 'tr',
  theme VARCHAR(50) DEFAULT 'light',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_digest BOOLEAN DEFAULT TRUE,
  digest_frequency VARCHAR(50) DEFAULT 'daily',
  bookmarks INT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
