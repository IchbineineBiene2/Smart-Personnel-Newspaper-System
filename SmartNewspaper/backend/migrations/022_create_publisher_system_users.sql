-- Migration 022: Haber kaynaklari icin sistem profilleri
-- Bu hesaplar kullanici aramasina ve arkadaslik akisina dahil edilmez; uygulamada takip edilirler.

INSERT INTO users (username, email, password_hash, role, status)
SELECT DISTINCT
  source_name AS username,
  CONCAT(
    LOWER(REGEXP_REPLACE(source_name, '[^a-zA-Z0-9]+', '-', 'g')),
    '-',
    SUBSTRING(MD5(source_name) FROM 1 FOR 10),
    '@publisher.local'
  ) AS email,
  'system-managed-publisher' AS password_hash,
  'publisher' AS role,
  'active' AS status
FROM articles
WHERE source_name IS NOT NULL
  AND BTRIM(source_name) <> ''
ON CONFLICT (username) DO NOTHING;
