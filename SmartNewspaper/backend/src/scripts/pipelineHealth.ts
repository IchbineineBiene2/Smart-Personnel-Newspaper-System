import 'dotenv/config';
import { query } from '../db';
import pool from '../db';

(async () => {
  const a = await query<{ total: string; with_v2: string; last5m: string; last5m_with_v2: string }>(`
    SELECT
      COUNT(*)                                                         AS total,
      COUNT(*) FILTER (WHERE embedding_v2 IS NOT NULL)                 AS with_v2,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '5 minutes') AS last5m,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '5 minutes' AND embedding_v2 IS NOT NULL) AS last5m_with_v2
    FROM articles
  `);
  const s = await query<{ total: string; last5m: string }>(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '5 minutes') AS last5m
    FROM similar_articles
  `);
  console.log('articles:', a.rows[0]);
  console.log('similar_articles:', s.rows[0]);
  await pool.end();
})();
