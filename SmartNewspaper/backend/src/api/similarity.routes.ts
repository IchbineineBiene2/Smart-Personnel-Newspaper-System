import { Router, Request, Response } from "express";
import { query } from "../db";
import { findAndSaveSimilarArticles } from "../processors/similarity-processor";

const router = Router();

// GET /api/similarity/:articleId
router.get("/:articleId", async (req: Request, res: Response) => {
  const { articleId } = req.params;
  const { threshold = 0.3 } = req.query;

  try {
    const _query = `
      SELECT 
        sa.similarity_score,
        a.id,
        a.title,
        a.source_name,
        a.url,
        a.published_at,
        a.image_url,
        a.category,
        a.language
      FROM similar_articles sa
      JOIN articles a ON (a.id = sa.article_id_1 OR a.id = sa.article_id_2) AND a.id != $1
      WHERE (sa.article_id_1 = $1 OR sa.article_id_2 = $1)
        AND sa.similarity_score >= $2
      ORDER BY sa.similarity_score DESC
    `;
    const { rows } = await query(_query, [articleId, threshold]);
    res.json(rows);
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
