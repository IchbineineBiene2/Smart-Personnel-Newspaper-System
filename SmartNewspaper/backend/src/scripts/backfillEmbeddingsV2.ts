/**
 * Backfill: multilingual-e5-large embeddingV2 for existing articles.
 *
 * Çalıştırma:
 *   PILOT     (1000 makale):  npm run backfill:embeddings-v2 -- --pilot
 *   FULL      (tüm eksikler): npm run backfill:embeddings-v2
 *   RESUME    (devam et):     npm run backfill:embeddings-v2 -- --resume <label>
 *
 * embedding_backfill_progress tablosundan ilerlemeyi izler.
 * Ctrl+C'ye dayanıklı: her batch sonrası progress flush edilir.
 */

import 'dotenv/config';
import { query, testConnection } from '../db';
import { computeAndSaveEmbeddingsV2 } from '../processors/embeddingV2';

interface Args {
  pilot: boolean;
  pilotSize: number;
  batchSize: number;
  microBatch: number;
  resumeLabel: string | null;
  maxBatches: number | null;
  workerId: number;
  workerCount: number;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const has = (flag: string) => argv.includes(flag);
  const value = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    if (i < 0 || i + 1 >= argv.length) return null;
    return argv[i + 1];
  };
  return {
    pilot: has('--pilot'),
    pilotSize: Number(value('--pilot-size') ?? 1000),
    batchSize: Number(value('--batch') ?? 64),
    microBatch: Number(value('--micro-batch') ?? 8),
    resumeLabel: value('--resume'),
    maxBatches: value('--max-batches') ? Number(value('--max-batches')) : null,
    workerId: Number(value('--worker-id') ?? 0),
    workerCount: Number(value('--worker-count') ?? 1),
  };
}

async function getMissingCount(workerId: number, workerCount: number): Promise<number> {
  const shardClause = workerCount > 1
    ? `AND (('x' || substr(id, 1, 2))::bit(8)::int % ${workerCount}) = ${workerId}`
    : '';
  const r = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM articles WHERE embedding_v2 IS NULL ${shardClause}`,
  );
  return Number(r.rows[0].count);
}

async function createProgressRow(label: string, total: number): Promise<number> {
  const r = await query<{ id: number }>(
    `INSERT INTO embedding_backfill_progress (run_label, total_articles, status)
     VALUES ($1, $2, 'running')
     RETURNING id`,
    [label, total],
  );
  return r.rows[0].id;
}

async function updateProgress(id: number, processed: number, failed: number, status?: string, error?: string) {
  await query(
    `UPDATE embedding_backfill_progress
        SET processed = $1,
            failed = $2,
            status = COALESCE($3, status),
            error_message = COALESCE($4, error_message),
            completed_at = CASE WHEN $3 IN ('completed','failed') THEN NOW() ELSE completed_at END,
            updated_at = NOW()
      WHERE id = $5`,
    [processed, failed, status ?? null, error ?? null, id],
  );
}

async function main() {
  const args = parseArgs();
  await testConnection();

  const missing = await getMissingCount(args.workerId, args.workerCount);
  const tag = args.workerCount > 1 ? `w${args.workerId}/${args.workerCount}` : 'single';
  console.log(`[Backfill ${tag}] Bu shard'da eksik makale: ${missing}`);

  if (missing === 0) {
    console.log(`[Backfill ${tag}] Yapılacak iş yok — bu shard zaten embed edilmiş.`);
    process.exit(0);
  }

  const targetTotal = args.pilot ? Math.min(args.pilotSize, missing) : missing;
  const label = args.resumeLabel ||
    `${args.pilot ? 'pilot' : 'full'}-${tag}-${new Date().toISOString()}`;
  const progressId = await createProgressRow(label, targetTotal);

  console.log(`[Backfill ${tag}] Başlatıldı: label=${label}, hedef=${targetTotal}, batch=${args.batchSize}, microBatch=${args.microBatch}`);

  let processedTotal = 0;
  let failedTotal = 0;
  let batchCount = 0;
  const startTime = Date.now();

  // SIGINT temizliği — paused durumuna geç
  let shouldStop = false;
  process.on('SIGINT', () => {
    console.log('\n[Backfill] SIGINT alındı, mevcut batch bitince duracağım...');
    shouldStop = true;
  });

  try {
    while (processedTotal < targetTotal) {
      if (shouldStop) {
        await updateProgress(progressId, processedTotal, failedTotal, 'paused');
        console.log('[Backfill] Pause edildi. Devam etmek için: --resume', label);
        break;
      }
      if (args.maxBatches !== null && batchCount >= args.maxBatches) {
        console.log(`[Backfill] max-batches sınırına ulaşıldı (${args.maxBatches}).`);
        await updateProgress(progressId, processedTotal, failedTotal, 'paused');
        break;
      }

      const remaining = targetTotal - processedTotal;
      const thisBatch = Math.min(args.batchSize, remaining);
      const t0 = Date.now();
      const { processed, failed } = await computeAndSaveEmbeddingsV2({
        limit: thisBatch,
        onlyMissing: true,
        workerId: args.workerId,
        workerCount: args.workerCount,
        microBatch: args.microBatch,
      });
      if (processed === 0 && failed === 0) {
        console.log('[Backfill] Bu pencerede daha fazla eksik yok, çıkıyorum.');
        break;
      }

      processedTotal += processed;
      failedTotal += failed;
      batchCount++;

      const dt = Date.now() - t0;
      const rate = processed / (dt / 1000);
      const eta = rate > 0 ? Math.round((targetTotal - processedTotal) / rate) : -1;
      console.log(
        `[Backfill ${tag}] batch ${batchCount}: +${processed} (failed=${failed}) in ${dt}ms ` +
        `| toplam ${processedTotal}/${targetTotal} | rate=${rate.toFixed(2)}/s | ETA=${eta}s`,
      );

      await updateProgress(progressId, processedTotal, failedTotal);
    }

    const totalDt = Date.now() - startTime;
    if (!shouldStop && processedTotal >= targetTotal) {
      await updateProgress(progressId, processedTotal, failedTotal, 'completed');
      console.log(`[Backfill] TAMAMLANDI: ${processedTotal} işlendi, ${failedTotal} başarısız, süre=${(totalDt / 1000).toFixed(1)}s`);
    }
  } catch (err) {
    console.error('[Backfill] Fatal hata:', err);
    await updateProgress(progressId, processedTotal, failedTotal, 'failed', (err as Error).message);
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
