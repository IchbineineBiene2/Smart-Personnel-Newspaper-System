-- Migration 024: Mesaj istekleri
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS request_status VARCHAR(20) NOT NULL DEFAULT 'accepted'
CHECK (request_status IN ('pending', 'accepted'));

CREATE INDEX IF NOT EXISTS idx_messages_request_status ON messages(request_status);
