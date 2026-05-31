import { Router, Request, Response } from "express";
import { query } from "../db";
import { findAndSaveSimilarArticlesV2 } from "../processors/similarityProcessorV2";

const router = Router();

type Kind = 'duplicate' | 'same_event' | 'related';

/**
 * GET /api/similarity/:articleId
 *  ?kind=same_event|related|all   (varsayılan: same_event — duplicate'ı da içerir)
 *  ?threshold=0.65                (manuel override; aksi halde kind'a göre)
 *  ?limit=12                      (varsayılan: 12)
 *
 * v2 mantığı: önce similar_articles tablosundaki precomputed pair'leri kullan.
 * Hiç sonuç yoksa eski trigram fallback'ine düş — ama bu olayların büyük çoğunluğu
 * v2'de zaten dolu olmalı.
 */
router.get("/:articleId", async (req: Request, res: Response) => {
  const { articleId } = req.params;
  const kindParam = (req.query.kind as string) || 'same_event';
  const limitParam = Math.max(1, Math.min(50, Number(req.query.limit ?? 12)));

  // kind filter SQL'i
  let kindFilterSql = '';
  const params: unknown[] = [articleId];
  if (kindParam === 'same_event') {
    kindFilterSql = `AND sa.kind IN ('duplicate', 'same_event')`;
  } else if (kindParam === 'related') {
    kindFilterSql = `AND sa.kind = 'related'`;
  } else if (kindParam === 'duplicate') {
    kindFilterSql = `AND sa.kind = 'duplicate'`;
  } else if (kindParam === 'all') {
    kindFilterSql = '';
  } else {
    return res.status(400).json({ error: `Geçersiz kind: ${kindParam}` });
  }

  // Manuel threshold override (eski client'lar 0.82 gönderebilir, biz daha düşük floor istiyoruz)
  const requestedThreshold = Number(req.query.threshold);
  const thresholdFilter = Number.isFinite(requestedThreshold)
    ? `AND sa.similarity_score >= $${params.length + 1}`
    : '';
  if (thresholdFilter) params.push(requestedThreshold);

  params.push(limitParam);

  try {
    const _query = `
      WITH current_article AS (
        SELECT source_name
        FROM articles
        WHERE id = $1
      ),
      ranked_matches AS (
        SELECT
          sa.similarity_score,
          sa.kind,
          sa.entity_overlap,
          a.id,
          a.title,
          a.description,
          a.source_name,
          a.source_url,
          a.url,
          a.published_at,
          a.image_url,
          a.category,
          a.language,
          ROW_NUMBER() OVER (
            PARTITION BY lower(a.source_name)
            ORDER BY sa.similarity_score DESC, a.published_at DESC
          ) AS source_rank
        FROM similar_articles sa
        JOIN articles a ON (a.id = sa.article_id_1 OR a.id = sa.article_id_2) AND a.id != $1
        CROSS JOIN current_article ca
        WHERE (sa.article_id_1 = $1 OR sa.article_id_2 = $1)
          ${kindFilterSql}
          ${thresholdFilter}
          AND lower(a.source_name) != lower(ca.source_name)
      )
      SELECT
        similarity_score,
        kind,
        entity_overlap,
        id, title, description, source_name, source_url, url, published_at, image_url, category, language
      FROM ranked_matches
      WHERE source_rank = 1
      ORDER BY similarity_score DESC, published_at DESC
      LIMIT $${params.length}
    `;
    const { rows } = await query(_query, params);
    if (rows.length > 0) {
      return res.json(rows);
    }

    // ----------- FALLBACK: trigram tabanlı eski yöntem -----------
    // v2 pair'leri bu makale için hiç oluşmamışsa son çare olarak çalışır.
    const fallbackQuery = `
      WITH stop_words(word) AS (
        VALUES ('haber'), ('haberi'), ('son'), ('yeni'), ('icin'), ('için'), ('olan'),
               ('sonra'), ('önce'), ('once'), ('gibi'), ('daha'), ('ile'), ('bir'),
               ('the'), ('and'), ('for'), ('with'), ('from'), ('that'), ('this')
      ),
      current_article AS (
        SELECT id, title, description, category, language, source_name, published_at
        FROM articles WHERE id = $1
      ),
      current_title_terms AS (
        SELECT DISTINCT term
        FROM current_article ca,
        LATERAL regexp_split_to_table(lower(coalesce(ca.title, '')), '[^[:alnum:]ğüşıöç]+') AS terms(term)
        WHERE length(term) >= 5 AND NOT EXISTS (SELECT 1 FROM stop_words sw WHERE sw.word = term)
      ),
      candidate_scores AS (
        SELECT a.*,
          similarity(a.title, ca.title) AS title_similarity,
          similarity(coalesce(a.title,'') || ' ' || coalesce(a.description,''),
                     coalesce(ca.title,'') || ' ' || coalesce(ca.description,'')) AS text_similarity,
          COUNT(DISTINCT ctt.term)::int AS shared_title_term_count
        FROM articles a
        CROSS JOIN current_article ca
        LEFT JOIN current_title_terms ctt
          ON lower(coalesce(a.title, '')) LIKE '%' || ctt.term || '%'
        WHERE a.id != ca.id
          AND lower(a.source_name) != lower(ca.source_name)
          AND a.language = ca.language
          AND a.published_at >= ca.published_at - INTERVAL '24 hours'
          AND a.published_at <= ca.published_at + INTERVAL '24 hours'
        GROUP BY a.id, ca.title, ca.description
      ),
      ranked AS (
        SELECT *,
          GREATEST(title_similarity, text_similarity) AS similarity_score,
          ROW_NUMBER() OVER (
            PARTITION BY lower(source_name)
            ORDER BY GREATEST(title_similarity, text_similarity) DESC, shared_title_term_count DESC, published_at DESC
          ) AS source_rank
        FROM candidate_scores
      )
      SELECT similarity_score, 'related'::text AS kind, NULL::int AS entity_overlap,
             id, title, description, source_name, source_url, url, published_at, image_url, category, language
      FROM ranked
      WHERE source_rank = 1
        AND (title_similarity >= 0.58
          OR (title_similarity >= 0.45 AND shared_title_term_count >= 3)
          OR (text_similarity >= 0.52 AND shared_title_term_count >= 3)
          OR shared_title_term_count >= 5)
      ORDER BY similarity_score DESC, shared_title_term_count DESC, published_at DESC
      LIMIT $2
    `;
    const fallback = await query(fallbackQuery, [articleId, limitParam]);
    return res.json(fallback.rows);
  } catch (err) {
    console.error("[Similarity API] Error fetching similar articles:", err);
    res.status(500).json({ error: "Benzer haberler alınamadı" });
  }
});

/**
 * POST /api/similarity/compute
 *  ?fullSweep=true   tüm 3 günlük pencerede yeniden hesapla (manual rebuild)
 */
router.post("/compute", async (req: Request, res: Response) => {
  const fullSweep = req.query.fullSweep === 'true' || req.body?.fullSweep === true;
  try {
    const out = await findAndSaveSimilarArticlesV2({ fullSweep });
    res.json({ message: "Benzerlik hesaplama tamamlandı", ...out });
  } catch (err) {
    res.status(500).json({ error: "Hesaplama başarısız" });
  }
});

export default router;
