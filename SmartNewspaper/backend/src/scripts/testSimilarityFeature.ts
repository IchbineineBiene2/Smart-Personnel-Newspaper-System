/**
 * Kapsamlı "aynı haber farklı kaynaklar" özelliği testi.
 *
 * 1. similar_articles veri sağlığı (dağılım, çapraz kaynak, entity overlap, self-loop)
 * 2. /api/similarity/:id endpoint sözleşmesi (kind, threshold, limit)
 * 3. Kalite örneklemesi (yüksek skorlu çiftlerin başlık karşılaştırması)
 * 4. Graph traversal — A → B → C zinciri kurulabiliyor mu
 *
 * Yalnızca özet metrikler + sınırlı (1-2 satır) örneklemeler basar.
 */
import 'dotenv/config';
import { query } from '../db';
import pool from '../db';

const API = 'http://localhost:3000';

function log(s: string) {
  process.stdout.write(s + '\n');
}

function section(title: string) {
  log('\n' + '='.repeat(60));
  log(title);
  log('='.repeat(60));
}

async function dataHealth() {
  section('1. similar_articles veri sağlığı');

  const byKind = await query<{ kind: string; cnt: string; avg_score: string; min_score: string; max_score: string }>(`
    SELECT kind,
           COUNT(*)::text AS cnt,
           ROUND(AVG(similarity_score)::numeric, 3)::text AS avg_score,
           ROUND(MIN(similarity_score)::numeric, 3)::text AS min_score,
           ROUND(MAX(similarity_score)::numeric, 3)::text AS max_score
    FROM similar_articles
    GROUP BY kind
    ORDER BY kind
  `);
  log('kind        | count    | min   | avg   | max');
  log('------------|----------|-------|-------|-------');
  for (const r of byKind.rows) {
    log(`${r.kind.padEnd(11)} | ${r.cnt.padStart(8)} | ${r.min_score} | ${r.avg_score} | ${r.max_score}`);
  }

  // self-loop check
  const selfLoop = await query<{ cnt: string }>(`
    SELECT COUNT(*)::text AS cnt FROM similar_articles WHERE article_id_1 = article_id_2
  `);
  log(`\nself-loop satırlar (a==b): ${selfLoop.rows[0].cnt}  ${selfLoop.rows[0].cnt === '0' ? '✓' : '✗ FAIL'}`);

  // cross-source ratio per kind
  const crossSrc = await query<{ kind: string; total: string; cross: string }>(`
    SELECT s.kind,
           COUNT(*)::text AS total,
           SUM(CASE WHEN a.source_name <> b.source_name THEN 1 ELSE 0 END)::text AS cross
    FROM similar_articles s
    JOIN articles a ON a.id = s.article_id_1
    JOIN articles b ON b.id = s.article_id_2
    GROUP BY s.kind
    ORDER BY s.kind
  `);
  log('\nÇapraz-kaynak oranı (a.source_name <> b.source_name):');
  log('kind        | total    | cross    | %cross');
  log('------------|----------|----------|-------');
  for (const r of crossSrc.rows) {
    const pct = (Number(r.cross) / Number(r.total) * 100).toFixed(1);
    log(`${r.kind.padEnd(11)} | ${r.total.padStart(8)} | ${r.cross.padStart(8)} | ${pct}%`);
  }
  log('(yüksek %cross = feature sağlam: aynı haberin FARKLI kaynaklarda yakalanması)');

  // entity_overlap dolu mu (v2 katmanı çalışıyor mu)
  const eo = await query<{ kind: string; with_eo: string; total: string; avg_eo: string }>(`
    SELECT kind,
           COUNT(*)::text AS total,
           COUNT(entity_overlap)::text AS with_eo,
           COALESCE(ROUND(AVG(entity_overlap)::numeric, 1)::text, 'null') AS avg_eo
    FROM similar_articles
    GROUP BY kind
  `);
  log('\nentity_overlap doluluk (v2 katmanı sinyali):');
  for (const r of eo.rows) {
    log(`  ${r.kind.padEnd(11)} | ${r.with_eo}/${r.total} dolu | avg=${r.avg_eo}`);
  }
}

async function pickProbeArticle(): Promise<string | null> {
  // En çok bağlantısı olan, çapraz kaynaklı, yakın tarihli bir makale seç
  const r = await query<{ id: string; cnt: string }>(`
    SELECT s.article_id_1 AS id, COUNT(*)::text AS cnt
    FROM similar_articles s
    JOIN articles a ON a.id = s.article_id_1
    JOIN articles b ON b.id = s.article_id_2
    WHERE s.kind IN ('same_event', 'duplicate')
      AND a.source_name <> b.source_name
      AND a.published_at >= NOW() - INTERVAL '3 days'
    GROUP BY s.article_id_1
    HAVING COUNT(*) >= 3
    ORDER BY COUNT(*) DESC
    LIMIT 1
  `);
  return r.rows[0]?.id ?? null;
}

async function apiContract() {
  section('2. /api/similarity API sözleşmesi');

  const probeId = await pickProbeArticle();
  if (!probeId) {
    log('Test için elverişli (çoklu çapraz-kaynak bağlantısı olan) makale bulunamadı.');
    log('Pipeline daha yeni başladı, biraz daha bekleyin.');
    return;
  }
  log(`Probe article id: ${probeId}\n`);

  const cases = [
    { name: 'default (kind=same_event, threshold default)', url: `${API}/api/similarity/${probeId}` },
    { name: 'kind=all', url: `${API}/api/similarity/${probeId}?kind=all` },
    { name: 'kind=related, threshold=0.65', url: `${API}/api/similarity/${probeId}?kind=related&threshold=0.65` },
    { name: 'kind=duplicate', url: `${API}/api/similarity/${probeId}?kind=duplicate` },
    { name: 'limit=3', url: `${API}/api/similarity/${probeId}?limit=3` },
    { name: 'non-existent id', url: `${API}/api/similarity/00000000000000000000000000000000` },
  ];

  for (const c of cases) {
    try {
      const t0 = Date.now();
      const resp = await fetch(c.url);
      const dt = Date.now() - t0;
      const text = await resp.text();
      const body = text ? JSON.parse(text) : null;
      const items = Array.isArray(body) ? body : (body?.results ?? body?.articles ?? body?.data ?? []);
      const n = Array.isArray(items) ? items.length : (body ? 1 : 0);
      const sample = Array.isArray(items) && items.length ? items[0] : null;
      log(`[${resp.status}] ${dt}ms ${c.name}`);
      if (sample) {
        const keys = Object.keys(sample).join(',');
        log(`  ${n} sonuç | first item keys: ${keys}`);
        if ('similarity_score' in sample || 'score' in sample) {
          log(`  first score=${sample.similarity_score ?? sample.score} kind=${sample.kind ?? '?'} source=${sample.source_name ?? sample.source ?? '?'}`);
        }
      } else {
        log(`  ${n} sonuç (${resp.status === 200 ? 'boş' : 'hata'})`);
      }
    } catch (e: any) {
      log(`[ERR] ${c.name}: ${e.message}`);
    }
  }
}

async function qualityProbe() {
  section('3. Kalite örneklemesi — yüksek skorlu çiftler');

  // En yüksek skorlu 5 same_event çifti — çapraz kaynak
  const top = await query<{
    sid: string; score: string; eo: number | null;
    a_src: string; a_title: string;
    b_src: string; b_title: string;
  }>(`
    SELECT s.id::text AS sid,
           ROUND(s.similarity_score::numeric, 3)::text AS score,
           s.entity_overlap AS eo,
           a.source_name AS a_src,
           LEFT(a.title, 110) AS a_title,
           b.source_name AS b_src,
           LEFT(b.title, 110) AS b_title
    FROM similar_articles s
    JOIN articles a ON a.id = s.article_id_1
    JOIN articles b ON b.id = s.article_id_2
    WHERE s.kind = 'same_event'
      AND a.source_name <> b.source_name
    ORDER BY s.similarity_score DESC
    LIMIT 5
  `);
  if (top.rowCount === 0) {
    log('Henüz same_event çapraz-kaynak çifti yok.');
    return;
  }
  for (const r of top.rows) {
    log(`\n[score=${r.score} eo=${r.eo ?? '-'}]`);
    log(`  A (${r.a_src}): ${r.a_title}`);
    log(`  B (${r.b_src}): ${r.b_title}`);
  }
}

async function traversalProbe() {
  section('4. Graph traversal — A → B → C zinciri');

  // bağlantı sayısı çok olan bir A bul, B'lerinden birini çek, B'nin de bağlantılarını gör
  const r = await query<{ a_id: string; b_id: string; a_title: string; b_title: string }>(`
    SELECT s.article_id_1 AS a_id, s.article_id_2 AS b_id,
           LEFT(a.title, 80) AS a_title, LEFT(b.title, 80) AS b_title
    FROM similar_articles s
    JOIN articles a ON a.id = s.article_id_1
    JOIN articles b ON b.id = s.article_id_2
    WHERE s.kind = 'same_event' AND a.source_name <> b.source_name
    ORDER BY s.similarity_score DESC
    LIMIT 1
  `);
  if (r.rowCount === 0) {
    log('Traversal için elverişli çift yok.');
    return;
  }
  const a = r.rows[0];
  log(`A: ${a.a_title}`);
  log(`B: ${a.b_title}\n`);
  const fromB = await query<{ cnt: string }>(`
    SELECT COUNT(*)::text AS cnt
    FROM similar_articles s
    JOIN articles other ON other.id = CASE WHEN s.article_id_1 = $1 THEN s.article_id_2 ELSE s.article_id_1 END
    JOIN articles base ON base.id = $1
    WHERE (s.article_id_1 = $1 OR s.article_id_2 = $1)
      AND s.kind IN ('same_event', 'duplicate')
      AND other.source_name <> base.source_name
      AND other.id <> $2
  `, [a.b_id, a.a_id]);
  log(`B'nin A dışındaki çapraz-kaynak bağlantı sayısı: ${fromB.rows[0].cnt}`);
  log('(>0 ise gerçek zincir kurulabiliyor — kullanıcı haberden habere geçebilir)');
}

async function main() {
  try {
    await dataHealth();
  } catch (e) { log('dataHealth FAIL: ' + (e as Error).message); }
  try {
    await apiContract();
  } catch (e) { log('apiContract FAIL: ' + (e as Error).message); }
  try {
    await qualityProbe();
  } catch (e) { log('qualityProbe FAIL: ' + (e as Error).message); }
  try {
    await traversalProbe();
  } catch (e) { log('traversalProbe FAIL: ' + (e as Error).message); }
  await pool.end();
}

main();
