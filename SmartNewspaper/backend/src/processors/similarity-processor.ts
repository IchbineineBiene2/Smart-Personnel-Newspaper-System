import { query } from "../db";

export async function findAndSaveSimilarArticles() {
  const _query = `
    WITH new_articles AS (
      SELECT id, title, description, content, published_at
      FROM articles
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    ),
    similarities AS (
      SELECT 
        LEAST(a1.id, a2.id) as article_id_1, 
        GREATEST(a1.id, a2.id) as article_id_2,
        similarity(
          COALESCE(a1.title, '') || ' ' || COALESCE(a1.description, ''), 
          COALESCE(a2.title, '') || ' ' || COALESCE(a2.description, '')
        ) as score
      FROM new_articles a1
      JOIN articles a2 ON a1.id != a2.id
      WHERE similarity(
        COALESCE(a1.title, '') || ' ' || COALESCE(a1.description, ''), 
        COALESCE(a2.title, '') || ' ' || COALESCE(a2.description, '')
      ) > 0.4
    ),
    unique_similarities AS (
      SELECT DISTINCT ON (article_id_1, article_id_2)
        article_id_1, article_id_2, score
      FROM similarities
      ORDER BY article_id_1, article_id_2, score DESC
    )
    INSERT INTO similar_articles (article_id_1, article_id_2, similarity_score)
    SELECT article_id_1, article_id_2, score
    FROM unique_similarities
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
