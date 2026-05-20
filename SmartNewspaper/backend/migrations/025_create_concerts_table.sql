-- Migration 025: Konser, tiyatro, stand-up etkinlikleri tablosu

CREATE TABLE IF NOT EXISTS concerts (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title        VARCHAR(500) NOT NULL,
  artist       VARCHAR(300),
  description  TEXT,
  event_date   TIMESTAMPTZ  NOT NULL,
  location     VARCHAR(500),
  venue        VARCHAR(300),
  category     VARCHAR(50)  NOT NULL DEFAULT 'konser'
               CHECK (category IN ('konser', 'tiyatro', 'stand-up')),
  image_url    TEXT,
  ticket_url   TEXT,
  price        VARCHAR(100),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  concerts IS 'Konser, tiyatro, stand-up ve diğer canlı performans etkinlikleri';
COMMENT ON COLUMN concerts.category IS 'konser | tiyatro | stand-up';
COMMENT ON COLUMN concerts.image_url IS 'Etkinlik kapak fotoğrafı URL''si';
COMMENT ON COLUMN concerts.ticket_url IS 'Bilet satış linki (Biletix, Ticketmaster vb.)';
