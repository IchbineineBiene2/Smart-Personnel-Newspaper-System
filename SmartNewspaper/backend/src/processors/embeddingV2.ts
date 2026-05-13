/**
 * Embedding v2 — multilingual-e5-large (1024-dim).
 *
 * MiniLM-L12'den (384-dim, sadece title+description) farkları:
 *  - Daha güçlü çok-dilli retrieval modeli; Türkçe MTEB skorları belirgin yüksek
 *  - Girdiye `content`'in ilk 1500 karakteri dahil → aynı olayı farklı sözcüklerle
 *    anlatan kaynaklar artık vektör uzayında yakınlaşır
 *  - E5 protokolüne uygun "passage: " prefix'i kullanılır
 *
 * Girdi hash'i `embedding_v2_input_hash` kolonunda saklanır; aynı içerikte
 * yeniden embed maliyetini önler.
 */

import crypto from 'crypto';
import { pipeline } from '@xenova/transformers';
import { query } from '../db';
import { extractEntities } from './entityExtractor';

const MODEL_ID = 'Xenova/multilingual-e5-large';

let extractor: any = null;
let loading: Promise<any> | null = null;

async function getExtractor() {
  if (extractor) return extractor;
  if (!loading) {
    loading = pipeline('feature-extraction', MODEL_ID, { quantized: true }).then((p) => {
      extractor = p;
      return p;
    });
  }
  return loading;
}

function buildPassageInput(title: string | null, description: string | null, content: string | null): string {
  // E5 'passage:' prefix protokolü
  const t = (title || '').trim();
  const d = (description || '').trim();
  const c = (content || '').trim().slice(0, 1500);

  const parts: string[] = [];
  if (t) parts.push(t);
  if (d && d !== t) parts.push(d);
  if (c) parts.push(c);

  return `passage: ${parts.join('. ').replace(/\s+/g, ' ').trim()}`;
}

export function inputHash(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

export async function computeEmbedding(text: string): Promise<number[]> {
  const ex = await getExtractor();
  const output = await ex(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data) as number[];
}

/**
 * Birden fazla metni tek forward pass'te embed eder.
 * onnxruntime'in tek-girdi overhead'i yüksek; 8-16'lı batch'lerde 3-5x hızlanır.
 * Çıktı: her bir girdi için 1024-boyutlu vektör (sırayla).
 */
export async function computeEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const ex = await getExtractor();
  const output = await ex(texts, { pooling: 'mean', normalize: true });
  // output.data flat Float32Array, output.dims = [N, 1024]
  const dim: number = output.dims[output.dims.length - 1];
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i++) {
    out.push(Array.from(output.data.slice(i * dim, (i + 1) * dim)) as number[]);
  }
  return out;
}

export interface EmbedResult {
  vector: number[];
  inputHash: string;
  entities: ReturnType<typeof extractEntities>;
}

export async function embedArticle(args: {
  title: string | null;
  description: string | null;
  content: string | null;
}): Promise<EmbedResult> {
  const passage = buildPassageInput(args.title, args.description, args.content);
  const vector = await computeEmbedding(passage);

  // Entity extraction — embedding ile aynı girdi üzerinden, ama prefix'siz
  const entityText = [args.title || '', args.description || '', (args.content || '').slice(0, 2500)]
    .filter(Boolean)
    .join('. ');
  const entities = extractEntities(entityText);

  return {
    vector,
    inputHash: inputHash(passage),
    entities,
  };
}

/**
 * Embedding'i olmayan VEYA içeriği değişmiş (hash mismatch) makaleleri batch'le embed eder.
 * Scheduler'dan veya backfill script'inden çağrılır.
 *
 * @param limit  Bu çağrıda işlenecek max makale sayısı (varsayılan 200)
 * @param onlyMissing  Sadece embedding_v2 NULL olanlar — backfill mode
 * @param workerId  Paralel çalıştırmada bu worker'ın id'si (0..workerCount-1)
 * @param workerCount  Toplam paralel worker sayısı (1 = sharding kapalı)
 * @param microBatch  Tek forward pass'te embed edilecek makale sayısı (varsayılan 8)
 * @returns İşlenen kayıt sayısı
 */
export async function computeAndSaveEmbeddingsV2(opts: {
  limit?: number;
  onlyMissing?: boolean;
  workerId?: number;
  workerCount?: number;
  microBatch?: number;
  /** Sadece son N günde yayınlanmış makaleleri işle (Mac öncelik tier'ı için) */
  sinceDays?: number | null;
  /** Sadece N günden eski makaleleri işle (server arka plan tier'ı için) */
  olderThanDays?: number | null;
} = {}): Promise<{ processed: number; failed: number }> {
  const limit = opts.limit ?? 200;
  const onlyMissing = opts.onlyMissing ?? true;
  const workerId = opts.workerId ?? 0;
  const workerCount = Math.max(1, opts.workerCount ?? 1);
  const microBatch = Math.max(1, opts.microBatch ?? 8);
  const sinceDays = opts.sinceDays ?? null;
  const olderThanDays = opts.olderThanDays ?? null;

  const baseWhere = onlyMissing
    ? 'embedding_v2 IS NULL'
    : `(embedding_v2 IS NULL OR embedding_v2_input_hash IS NULL)`;

  // Deterministik sharding: id zaten URL'in MD5'i (hex 32 char).
  // İlk 2 hex char'ı (0..255) alıp workerCount'a mod alıyoruz — 256 farklı değer üzerinden mod
  // <=256 worker için iyi dengeli dağılım sağlar.
  // ('x' || hex)::bit(8) hex'i 4-bit sola kaydırarak parse ediyor; bu yüzden bit(8) yerine
  // tam 2 char ile kullanıyoruz: 'xab'::bit(8) → 0xAB.
  const shardClause = workerCount > 1
    ? `AND (('x' || substr(id, 1, 2))::bit(8)::int % ${workerCount}) = ${workerId}`
    : '';

  // Zaman tier'ı — Mac yeni haberleri, server eskiler için. Aynı anda iki flag verilmez.
  let timeClause = '';
  if (sinceDays !== null && olderThanDays !== null) {
    throw new Error('sinceDays ile olderThanDays birlikte kullanılamaz');
  }
  if (sinceDays !== null && sinceDays > 0) {
    timeClause = `AND published_at >= NOW() - INTERVAL '${sinceDays} days'`;
  }
  if (olderThanDays !== null && olderThanDays > 0) {
    timeClause = `AND published_at < NOW() - INTERVAL '${olderThanDays} days'`;
  }

  const res = await query<{
    id: string;
    title: string | null;
    description: string | null;
    content: string | null;
  }>(
    `SELECT id, title, description, content
     FROM articles
     WHERE ${baseWhere} ${shardClause} ${timeClause}
     ORDER BY published_at DESC NULLS LAST
     LIMIT $1`,
    [limit],
  );

  if (res.rowCount === 0) return { processed: 0, failed: 0 };

  console.log(`[EmbeddingV2 w${workerId}/${workerCount}] ${res.rowCount} makale, microBatch=${microBatch}, model=${MODEL_ID}`);

  let processed = 0;
  let failed = 0;

  // Micro-batch: aynı anda N makale embed et, sonra DB'ye yaz
  for (let i = 0; i < res.rows.length; i += microBatch) {
    const slice = res.rows.slice(i, i + microBatch);
    try {
      const passages = slice.map((r) => buildPassageInput(r.title, r.description, r.content));
      const vectors = await computeEmbeddingsBatch(passages);

      // Entity extraction CPU-light, sıralı yap
      const entitySets = slice.map((r) => {
        const t = [r.title || '', r.description || '', (r.content || '').slice(0, 2500)]
          .filter(Boolean).join('. ');
        return extractEntities(t);
      });

      // DB update'leri paralel başlatıp Promise.all ile bekle — küçük gain ama bedava
      await Promise.all(
        slice.map((r, j) => query(
          `UPDATE articles
              SET embedding_v2 = $1::vector,
                  embedding_v2_input_hash = $2,
                  entities = $3::jsonb
            WHERE id = $4`,
          [JSON.stringify(vectors[j]), inputHash(passages[j]), JSON.stringify(entitySets[j]), r.id],
        )),
      );
      processed += slice.length;
    } catch (err) {
      // Eğer batch fail olduysa, tek tek dene — bir satır bozuksa diğerleri kaybedilmesin
      console.warn(`[EmbeddingV2 w${workerId}] Batch başarısız, tek tek deniyorum:`, (err as Error).message);
      for (const row of slice) {
        try {
          const { vector, inputHash: hash, entities } = await embedArticle({
            title: row.title, description: row.description, content: row.content,
          });
          await query(
            `UPDATE articles SET embedding_v2 = $1::vector, embedding_v2_input_hash = $2, entities = $3::jsonb WHERE id = $4`,
            [JSON.stringify(vector), hash, JSON.stringify(entities), row.id],
          );
          processed++;
        } catch (rowErr) {
          failed++;
          console.error(`[EmbeddingV2 w${workerId}] ${row.id} başarısız:`, (rowErr as Error).message);
        }
      }
    }
  }

  console.log(`[EmbeddingV2 w${workerId}] Batch tamamlandı: ${processed} başarılı, ${failed} başarısız`);
  return { processed, failed };
}
