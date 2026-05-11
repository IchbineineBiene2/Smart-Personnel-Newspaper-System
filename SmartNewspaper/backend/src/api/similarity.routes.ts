import { Router, Request, Response } from "express";
import { query } from "../db";
import { findAndSaveSimilarArticles } from "../processors/similarity-processor";

const router = Router();

// GET /api/similarity/:articleId
router.get("/:articleId", async (req: Request, res: Response) => {
  const { articleId } = req.params;
  const requestedThreshold = Number(req.query.threshold ?? 0.82);
  const exactThreshold = Number.isFinite(requestedThreshold)
    ? Math.max(requestedThreshold, 0.82)
    : 0.82;

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
          a.id,
          a.title,
          a.description,
          a.source_name,
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
          AND sa.similarity_score >= $2
          AND lower(a.source_name) != lower(ca.source_name)
      )
      SELECT
        similarity_score,
        id,
        title,
        description,
        source_name,
        url,
        published_at,
        image_url,
        category,
        language
      FROM ranked_matches
      WHERE source_rank = 1
      ORDER BY similarity_score DESC, published_at DESC
    `;
    const { rows } = await query(_query, [articleId, exactThreshold]);
    if (rows.length > 0) {
      return res.json(rows);
    }

    const fallbackQuery = `
      WITH stop_words(word) AS (
        VALUES
          ('haber'), ('haberi'), ('son'), ('yeni'), ('icin'), ('için'), ('olan'),
          ('sonra'), ('önce'), ('once'), ('gibi'), ('daha'), ('ile'), ('bir'),
          ('the'), ('and'), ('for'), ('with'), ('from'), ('that'), ('this')
      ),
      current_article AS (
        SELECT id, title, description, category, language, source_name, published_at
        FROM articles
        WHERE id = $1
      ),
      current_title_terms AS (
        SELECT DISTINCT term
        FROM current_article ca,
        LATERAL regexp_split_to_table(
          lower(coalesce(ca.title, '')),
          '[^[:alnum:]ğüşıöç]+'
        ) AS terms(term)
        WHERE length(term) >= 5
          AND NOT EXISTS (SELECT 1 FROM stop_words sw WHERE sw.word = term)
      ),
      candidate_scores AS (
        SELECT
          a.*,
          ca.title AS current_title,
          ca.description AS current_description,
          similarity(a.title, ca.title) AS title_similarity,
          similarity(
            coalesce(a.title, '') || ' ' || coalesce(a.description, ''),
            coalesce(ca.title, '') || ' ' || coalesce(ca.description, '')
          ) AS text_similarity,
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
        SELECT
          *,
          GREATEST(title_similarity, text_similarity) AS similarity_score,
          ROW_NUMBER() OVER (
            PARTITION BY lower(source_name)
            ORDER BY GREATEST(title_similarity, text_similarity) DESC, shared_title_term_count DESC, published_at DESC
          ) AS source_rank
        FROM candidate_scores
      )
      SELECT
        similarity_score,
        id,
        title,
        description,
        source_name,
        url,
        published_at,
        image_url,
        category,
        language
      FROM ranked
      WHERE source_rank = 1
        AND (
          title_similarity >= 0.58
          OR (title_similarity >= 0.45 AND shared_title_term_count >= 3)
          OR (text_similarity >= 0.52 AND shared_title_term_count >= 3)
          OR shared_title_term_count >= 5
        )
      ORDER BY similarity_score DESC, shared_title_term_count DESC, published_at DESC
      LIMIT 12
    `;
    const fallback = await query(fallbackQuery, [articleId]);
    return res.json(fallback.rows);
  } catch (err) {
    console.error("[Similarity API] Error fetching similar articles:", err);
    res.status(500).json({ error: "Benzer haberler alınamadı" });
  }
});

// POST /api/similarity/compute
router.post("/compute", async (req: Request, res: Response) => {
  try {
    const updatedCount = await findAndSaveSimilarArticles();
    res.json({ message: "Benzerlik hesaplama tamamlandı", updatedCount });
  } catch (err) {
    res.status(500).json({ error: "Hesaplama başarısız" });
  }
});

export default router;
