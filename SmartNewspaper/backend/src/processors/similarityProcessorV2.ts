/**
 * Similarity processor v2 — iki katmanlı eşleştirme (embedding + entity guard).
 *
 * Eşik kalibrasyonu (2026-05): multilingual-e5-base anizotropik bir modeldir —
 * alakasız haber çiftleri bile 0.74-0.90 kosinüs alır. Eski 0.78 same_event
 * eşiği bu gürültü tabanının İÇİNDEYDİ: 188k makale 7.7M same_event üretti
 * (medyan 203 bağlantı/makale), sınırdaki çiftlerin tamamı alakasız çıktı ve
 * same_event'in %92'si sıfır ortak entity'ye sahipti. Eşikler E5'in gerçek
 * "aynı olay" bandına çekildi; entity_overlap artık duplicate dışındaki her
 * katmanda ZORUNLU kapıdır (yalnızca tie-breaker değil).
 *
 * v2 mantığı (kaynak ≠ kaynak, ±3 gün pencere içinde):
 *   - score ≥ 0.95                              → kind='duplicate' (birebir/sendikasyon)
 *   - score ≥ 0.90 ∧ entity_overlap ≥ 1         → kind='same_event'
 *   - 0.84 ≤ score < 0.90 ∧ entity_overlap ≥ 2  → kind='same_event'
 *   - 0.84 ≤ score < 0.90 ∧ entity_overlap = 1  → kind='related'
 *   - aksi halde yazılmaz
 *
 * HNSW index olduğunda KNN top-K + filter ile O(N log N), index yokken seq scan ile O(N²).
 */

import { query } from '../db';

const WINDOW_DAYS = 3;
const CANDIDATE_FLOOR = 0.84;          // Bunun altı E5 gürültü tabanı — hiç değerlendirilmez
const DUPLICATE_THRESHOLD = 0.95;      // birebir / sendikasyon kopyası
const STRONG_THRESHOLD = 0.90;         // + entity_overlap ≥ 1 zorunlu
const MEDIUM_THRESHOLD = 0.84;         // + entity_overlap ≥ 2 zorunlu (same_event) / ≥ 1 (related)
const MIN_OVERLAP_STRONG = 1;
const MIN_OVERLAP_MEDIUM = 2;
const MIN_OVERLAP_RELATED = 1;

export interface SimilarityRunResult {
  candidates: number;
  inserted: number;
  duplicates: number;
  sameEvent: number;
  related: number;
  durationMs: number;
}

/**
 * Belirtilen pencerede yeni/güncel pair'leri hesaplar.
 *
 * @param sinceMinutes  Sadece bu sürede yayınlanmış veya embed edilmiş yeni makaleler için
 *                      pair üret (varsayılan: 75 — hourly cron için biraz overlap ile güvenli).
 */
export async function findAndSaveSimilarArticlesV2(opts: {
  sinceMinutes?: number;
  fullSweep?: boolean;
} = {}): Promise<SimilarityRunResult> {
  const sinceMinutes = opts.sinceMinutes ?? 75;
  const fullSweep = opts.fullSweep ?? false;
  const start = Date.now();

  // fullSweep: pencere içindeki TÜM makaleleri kontrol et (haftalık bir kez yeterli)
  // değilse: sadece son N dakikada işlenen makaleler için ara — incremental
  const newArticlesFilter = fullSweep
    ? `published_at >= NOW() - INTERVAL '${WINDOW_DAYS} days'`
    : `(updated_at >= NOW() - INTERVAL '${sinceMinutes} minutes'
         OR published_at >= NOW() - INTERVAL '${sinceMinutes} minutes')
       AND published_at >= NOW() - INTERVAL '${WINDOW_DAYS} days'`;

  const sql = `
    WITH new_articles AS (
      SELECT id, embedding_v2, entities, published_at, source_name
      FROM articles
      WHERE embedding_v2 IS NOT NULL
        AND ${newArticlesFilter}
    ),
    candidate_articles AS (
      SELECT id, embedding_v2, entities, published_at, source_name
      FROM articles
      WHERE embedding_v2 IS NOT NULL
        AND published_at >= NOW() - INTERVAL '${WINDOW_DAYS} days'
    ),
    pairs AS (
      SELECT
        LEAST(n.id, c.id) AS article_id_1,
        GREATEST(n.id, c.id) AS article_id_2,
        (1 - (n.embedding_v2 <=> c.embedding_v2))::numeric AS score,
        -- entity_overlap: persons + orgs + places + numbers ortak eleman sayısı (basit JSONB kesişim)
        (
          SELECT COUNT(*)::int FROM (
            SELECT lower(e1) AS v FROM jsonb_array_elements_text(
              coalesce(n.entities->'persons','[]'::jsonb)
              || coalesce(n.entities->'orgs','[]'::jsonb)
              || coalesce(n.entities->'places','[]'::jsonb)
              || coalesce(n.entities->'numbers','[]'::jsonb)
            ) AS e1
            INTERSECT
            SELECT lower(e2) FROM jsonb_array_elements_text(
              coalesce(c.entities->'persons','[]'::jsonb)
              || coalesce(c.entities->'orgs','[]'::jsonb)
              || coalesce(c.entities->'places','[]'::jsonb)
              || coalesce(c.entities->'numbers','[]'::jsonb)
            ) AS e2
          ) AS inter
        ) AS entity_overlap
      FROM new_articles n
      JOIN candidate_articles c ON n.id < c.id
        AND lower(n.source_name) != lower(c.source_name)
        AND abs(EXTRACT(EPOCH FROM (n.published_at - c.published_at))) < 86400 * ${WINDOW_DAYS}
      WHERE (1 - (n.embedding_v2 <=> c.embedding_v2)) >= ${CANDIDATE_FLOOR}
    ),
    classified AS (
      SELECT
        article_id_1, article_id_2, score, entity_overlap,
        CASE
          WHEN score >= ${DUPLICATE_THRESHOLD} THEN 'duplicate'
          WHEN score >= ${STRONG_THRESHOLD} AND entity_overlap >= ${MIN_OVERLAP_STRONG} THEN 'same_event'
          WHEN score >= ${MEDIUM_THRESHOLD} AND entity_overlap >= ${MIN_OVERLAP_MEDIUM} THEN 'same_event'
          WHEN score >= ${MEDIUM_THRESHOLD} AND entity_overlap >= ${MIN_OVERLAP_RELATED} THEN 'related'
          ELSE NULL
        END AS kind
      FROM pairs
    ),
    upserted AS (
      INSERT INTO similar_articles (article_id_1, article_id_2, similarity_score, kind, entity_overlap, updated_at)
      SELECT article_id_1, article_id_2, score, kind, entity_overlap, NOW()
      FROM classified
      WHERE kind IS NOT NULL
      ON CONFLICT (article_id_1, article_id_2)
      DO UPDATE SET
        similarity_score = EXCLUDED.similarity_score,
        kind = EXCLUDED.kind,
        entity_overlap = EXCLUDED.entity_overlap,
        updated_at = NOW()
      RETURNING kind
    )
    SELECT
      (SELECT COUNT(*) FROM classified) AS candidates,
      (SELECT COUNT(*) FROM upserted) AS inserted,
      (SELECT COUNT(*) FROM upserted WHERE kind = 'duplicate') AS duplicates,
      (SELECT COUNT(*) FROM upserted WHERE kind = 'same_event') AS same_event,
      (SELECT COUNT(*) FROM upserted WHERE kind = 'related') AS related
  `;

  try {
    const result = await query<{
      candidates: string;
      inserted: string;
      duplicates: string;
      same_event: string;
      related: string;
    }>(sql);
    const row = result.rows[0];
    const out: SimilarityRunResult = {
      candidates: Number(row.candidates),
      inserted: Number(row.inserted),
      duplicates: Number(row.duplicates),
      sameEvent: Number(row.same_event),
      related: Number(row.related),
      durationMs: Date.now() - start,
    };
    console.log(
      `[SimilarityV2] candidates=${out.candidates} inserted=${out.inserted} ` +
      `(dup=${out.duplicates}, same=${out.sameEvent}, rel=${out.related}) ` +
      `in ${out.durationMs}ms (fullSweep=${fullSweep})`
    );
    return out;
  } catch (err) {
    console.error('[SimilarityV2] Hata:', err);
    throw err;
  }
}
