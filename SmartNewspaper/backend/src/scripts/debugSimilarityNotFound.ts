/**
 * Frontend "ilgili haber bulunamadı" sorununu teşhis et.
 * Frontend threshold=0.82 ile çağırıyor → V1 same_event'lerin çoğu (avg 0.875) bunun altında kalır.
 */
import 'dotenv/config';
import { query } from '../db';
import pool from '../db';

(async () => {
  // 1) Son 7 günde kaç makale var, kaçı v2-embedded
  const a = await query<any>(`
    SELECT
      COUNT(*) FILTER (WHERE published_at >= NOW() - INTERVAL '7 days') AS p7d,
      COUNT(*) FILTER (WHERE published_at >= NOW() - INTERVAL '7 days' AND embedding_v2 IS NOT NULL) AS p7d_v2,
      COUNT(*) FILTER (WHERE published_at >= NOW() - INTERVAL '24 hours') AS p1d,
      COUNT(*) FILTER (WHERE published_at >= NOW() - INTERVAL '24 hours' AND embedding_v2 IS NOT NULL) AS p1d_v2
    FROM articles
  `);
  console.log('Article coverage:');
  console.log(`  7 günde:  ${a.rows[0].p7d}  (embed_v2 dolu: ${a.rows[0].p7d_v2})`);
  console.log(`  24 saatte: ${a.rows[0].p1d} (embed_v2 dolu: ${a.rows[0].p1d_v2})`);

  // 2) threshold 0.82 ile gelen aramada hit oranı
  const t = await query<any>(`
    SELECT
      COUNT(*) AS total_pairs,
      COUNT(*) FILTER (WHERE similarity_score >= 0.82) AS above_82,
      COUNT(*) FILTER (WHERE similarity_score >= 0.78) AS above_78,
      COUNT(*) FILTER (WHERE similarity_score >= 0.70) AS above_70
    FROM similar_articles
    WHERE kind = 'same_event'
  `);
  console.log('\nsame_event score dağılımı:');
  console.log(`  toplam: ${t.rows[0].total_pairs}`);
  console.log(`  >=0.82 (frontend default): ${t.rows[0].above_82}`);
  console.log(`  >=0.78 (backend default): ${t.rows[0].above_78}`);
  console.log(`  >=0.70: ${t.rows[0].above_70}`);

  // 3) Son 24 saatteki makaleler arasında 0.82 threshold ile match alabilen yüzde
  const h = await query<any>(`
    WITH recent AS (
      SELECT id FROM articles WHERE published_at >= NOW() - INTERVAL '24 hours'
    ),
    with_match AS (
      SELECT DISTINCT s.article_id_1 AS id
      FROM similar_articles s
      JOIN recent r ON r.id = s.article_id_1
      WHERE s.kind IN ('same_event','duplicate') AND s.similarity_score >= 0.82
    )
    SELECT
      (SELECT COUNT(*) FROM recent) AS recent_total,
      (SELECT COUNT(*) FROM with_match) AS recent_with_match
  `);
  console.log('\nSon 24 saat makaleler (frontend threshold=0.82 ile):');
  const total = Number(h.rows[0].recent_total);
  const matched = Number(h.rows[0].recent_with_match);
  const pct = total > 0 ? (matched / total * 100).toFixed(1) : '0';
  console.log(`  ${matched} / ${total} makale = %${pct} en az 1 match'e sahip`);
  console.log(`  ⇒ kalan %${(100 - Number(pct)).toFixed(1)}'i frontend'de "bulunamadı" diyecek`);

  // 4) Daha düşük threshold'la kaç fazladan match var
  const lower = await query<any>(`
    WITH recent AS (
      SELECT id FROM articles WHERE published_at >= NOW() - INTERVAL '24 hours'
    ),
    matches_065 AS (
      SELECT DISTINCT s.article_id_1 AS id
      FROM similar_articles s
      JOIN recent r ON r.id = s.article_id_1
      WHERE s.kind IN ('same_event','duplicate','related') AND s.similarity_score >= 0.65
    )
    SELECT COUNT(*) AS n FROM matches_065
  `);
  console.log(`  threshold=0.65 + kind=all olsaydı: ${lower.rows[0].n} match'li`);

  await pool.end();
})();
