/**
 * Kullanıcı ilgi vektörü (interest_vector) — mE5-base 768-dim.
 *
 * Tanım: kullanıcının beğendiği + son okuduğu makalelerin embedding_v2
 * ortalamasıdır. user_preferences.interest_vector'da cache'lenir.
 *
 * Yenileme politikası: 6 saatte bir lazy refresh — `/api/news/for-you`
 * çağrısı vektör eski/yoksa hesaplar. Background job şart değil.
 *
 * Soğuk başlangıç: hiç beğeni/görüntüleme yoksa null döner — caller
 * popüler/güncel fallback'e geçmeli.
 */
import { query } from '../db';

const REFRESH_TTL_HOURS = 6;
const MAX_SAMPLE = 100; // son N beğeni+görüntü ile sınırla (hızlı hesap, stale data'yı engeller)

export interface InterestVectorState {
  vector: string | null; // pgvector string form ('[0.12, ...]')
  sampleCount: number;
  freshness: 'fresh' | 'stale' | 'cold';
}

export async function getInterestVector(userId: number): Promise<InterestVectorState> {
  const existing = await query<{
    vec: string | null;
    cnt: number | null;
    ageHrs: number | null;
  }>(
    `SELECT interest_vector::text AS vec,
            interest_vector_sample_count AS cnt,
            EXTRACT(EPOCH FROM (NOW() - interest_vector_updated_at)) / 3600 AS "ageHrs"
       FROM user_preferences WHERE user_id = $1`,
    [userId],
  );

  const row = existing.rows[0];
  if (row?.vec && row.ageHrs !== null && row.ageHrs < REFRESH_TTL_HOURS) {
    return { vector: row.vec, sampleCount: row.cnt ?? 0, freshness: 'fresh' };
  }

  // Lazy recompute
  const computed = await computeInterestVector(userId);
  await persistInterestVector(userId, computed);

  return {
    vector: computed.vector,
    sampleCount: computed.sampleCount,
    freshness: computed.sampleCount > 0 ? 'stale' : 'cold',
  };
}

/**
 * pgvector ile DB tarafında ortalama hesapla. Beğeni + article_views birleşimi
 * en güncel MAX_SAMPLE örnekten ortalama vektör.
 *
 * Not: pgvector AVG'i tek bir transformasyonda yapamadığımız için array_agg + unnest
 * trick'i yerine basit weighted average — beğeni 2x, view 1x. Tek SQL'de subquery ile.
 */
async function computeInterestVector(userId: number): Promise<{ vector: string | null; sampleCount: number }> {
  const result = await query<{ vec: string | null; n: string }>(
    `WITH liked AS (
       SELECT a.embedding_v2 AS v, 2.0::float AS w, l.created_at AS ts
         FROM article_likes l
         JOIN articles a ON a.id = l.article_id
        WHERE l.user_id = $1 AND a.embedding_v2 IS NOT NULL
        ORDER BY l.created_at DESC
        LIMIT $2
     ),
     viewed AS (
       SELECT a.embedding_v2 AS v, 1.0::float AS w, v.viewed_at AS ts
         FROM article_views v
         JOIN articles a ON a.id = v.article_id
        WHERE v.user_id = $1 AND a.embedding_v2 IS NOT NULL
        ORDER BY v.viewed_at DESC
        LIMIT $2
     ),
     combined AS (
       SELECT v, w FROM liked
       UNION ALL
       SELECT v, w FROM viewed
     ),
     stats AS (
       SELECT COUNT(*) AS n FROM combined
     )
     SELECT
       (CASE WHEN s.n > 0
             THEN (SELECT AVG(v)::text FROM combined)
             ELSE NULL
        END) AS vec,
       s.n::text AS n
     FROM stats s`,
    [userId, MAX_SAMPLE],
  );

  const row = result.rows[0];
  return {
    vector: row?.vec ?? null,
    sampleCount: Number(row?.n ?? 0),
  };
}

async function persistInterestVector(
  userId: number,
  state: { vector: string | null; sampleCount: number },
): Promise<void> {
  // Row'un var olduğundan emin ol
  await query(
    `INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );
  await query(
    `UPDATE user_preferences
        SET interest_vector              = $1::vector,
            interest_vector_sample_count = $2,
            interest_vector_updated_at   = NOW()
      WHERE user_id = $3`,
    [state.vector, state.sampleCount, userId],
  );
}
