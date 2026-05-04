-- Migration 004: Etkinlikler ve duyurular tabloları
-- Hardcoded eventsData.ts'nin yerini alır; artık DB'den yönetilir.

CREATE TABLE IF NOT EXISTS events (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title        VARCHAR(500) NOT NULL,
  summary      TEXT,
  description  TEXT,
  event_date   TIMESTAMPTZ  NOT NULL,
  location     VARCHAR(500),
  category     VARCHAR(50)  NOT NULL DEFAULT 'genel'
               CHECK (category IN ('akademik', 'sosyal', 'son-tarih', 'sinav', 'genel')),
  is_important BOOLEAN      NOT NULL DEFAULT FALSE,
  image_url    TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  events IS 'Kampüs ve kurumsal etkinlikler (sınav, seminer, sosyal etkinlik vb.)';
COMMENT ON COLUMN events.category IS 'akademik | sosyal | son-tarih | sinav | genel';
COMMENT ON COLUMN events.is_important IS 'TRUE ise uygulamada öne çıkarılır';

CREATE TABLE IF NOT EXISTS announcements (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title        VARCHAR(500) NOT NULL,
  content      TEXT         NOT NULL,
  published_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,                          -- NULL ise süresiz
  priority     VARCHAR(20)  NOT NULL DEFAULT 'normal'
               CHECK (priority IN ('critical', 'normal')),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  announcements IS 'Sistem ve kurumsal duyurular';
COMMENT ON COLUMN announcements.expires_at IS 'Bu tarihten sonra duyuru gizlenir; NULL ise süresiz görünür';
COMMENT ON COLUMN announcements.priority IS 'critical = kırmızı banner, normal = standart gösterim';
