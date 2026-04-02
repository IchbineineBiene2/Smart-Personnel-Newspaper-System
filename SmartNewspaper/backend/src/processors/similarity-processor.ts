import { query } from "../db";

export async function findAndSaveSimilarArticles() {
  const _query = `
    WITH valid_articles AS (
      SELECT id, embedding, published_at
      FROM articles
      WHERE embedding IS NOT NULL 
        AND published_at >= NOW() - INTERVAL '3 days'
    ),
    similarities AS (
      SELECT 
        LEAST(a1.id, a2.id) as article_id_1, 
        GREATEST(a1.id, a2.id) as article_id_2,
        (1 - (a1.embedding <=> a2.embedding)) as score
      FROM valid_articles a1
      JOIN valid_articles a2 ON a1.id < a2.id
      WHERE (1 - (a1.embedding <=> a2.embedding)) > 0.8
    )
    INSERT INTO similar_articles (article_id_1, article_id_2, similarity_score)
    SELECT article_id_1, article_id_2, score
    FROM similarities
    ON CONFLICT (article_id_1, article_id_2) 
    DO UPDATE SET similarity_score = EXCLUDED.similarity_score;
  `;

  try {
    const result = await query(_query);
    console.log(`[Similarity] ${result.rowCount} similar article pairs updated/inserted.`);
    return result.rowCount;
  } catch (error) {
    console.error("[Similarity] Error finding similar articles:", error);
    throw error;
  }
}
