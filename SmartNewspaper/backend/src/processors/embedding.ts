import { pipeline } from '@xenova/transformers';
import { query } from '../db';
import { Article } from '../models/Article';

let extractor: any = null;

export async function getEmbedding(text: string): Promise<number[]> {
  if (!extractor) {
    // Paraphrase multilingual handles Turkish, English, German beautifully.
    extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', {
      quantized: true // 4-bit quant to be extremely fast and light (under 50MB)
    });
  }
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data) as number[];
}

export async function computeAndSaveEmbeddings() {
  console.log('[Embedding] Scanning for articles without embeddings...');
  const res = await query('SELECT id, title, description FROM articles WHERE embedding IS NULL LIMIT 200;');
  if (res.rowCount === 0) return;
  
  console.log(`[Embedding] Generating embeddings for ${res.rowCount} articles.`);
  for (const row of res.rows) {
    const textToEmbed = `${row.title} ${row.description || ''}`.trim();
    if (!textToEmbed) continue;
    try {
      const vector = await getEmbedding(textToEmbed);
      await query(
        `UPDATE articles SET embedding = $1::vector WHERE id = $2`,
        [JSON.stringify(vector), row.id]
      );
    } catch(err) {
      console.error(`[Embedding] Failed for article ${row.id}:`, err);
    }
  }
  console.log(`[Embedding] Finished generating embeddings for batch.`);
}
