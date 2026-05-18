/**
 * Embedding model quality bench: mE5-large vs base vs small.
 *
 * Uses hand-crafted Turkish news fixture pairs (same_event across sources +
 * unrelated pairs) to measure separation power of each model.
 *
 * Usage:
 *   PATH=/Users/mehmetkurt/.nvm/versions/node/v20.20.1/bin:$PATH \
 *   ./node_modules/.bin/ts-node --transpile-only src/scripts/benchEmbeddingModels.ts
 */
import { pipeline } from '@xenova/transformers';

function log(msg: string): void {
  process.stdout.write(msg + '\n');
}

const MODELS = [
  { id: 'Xenova/multilingual-e5-small', short: 'small(384d)' },
  { id: 'Xenova/multilingual-e5-base', short: 'base(768d)' },
  { id: 'Xenova/multilingual-e5-large', short: 'large(1024d)' },
];

type Pair = { a: string; b: string; label: 'same_event' | 'related' | 'unrelated'; topic: string };

// Realistic Turkish/multilingual fixtures: same event reported by different outlets,
// using different wording/structure (matches mE5 use case).
const PAIRS: Pair[] = [
  // ---- SAME_EVENT (different sources, same news) ----
  {
    topic: 'Deprem - Türkiye',
    label: 'same_event',
    a: 'Marmara açıklarında 5.8 büyüklüğünde deprem meydana geldi. AFAD verilerine göre depremin merkez üssü Silivri açıkları olarak belirlendi ve sarsıntı İstanbul başta olmak üzere çevre illerde de hissedildi.',
    b: 'AFAD: İstanbul yakınlarında orta şiddetli deprem. Silivri açıklarında kaydedilen 5.8\'lik sarsıntı pek çok ilçede hissedildi. Şu ana kadar can kaybı bildirilmedi, hasar tespit çalışmaları sürüyor.',
  },
  {
    topic: 'Şampiyonlar Ligi finali',
    label: 'same_event',
    a: 'Real Madrid Şampiyonlar Ligi finalinde Borussia Dortmund\'u 2-0 yenerek kupayı 15. kez kaldırdı. Maçın golleri Vinicius Jr ve Carvajal\'dan geldi.',
    b: 'Wembley\'deki dev finalde Real Madrid, Dortmund engelini Carvajal ve Vinicius\'un golleriyle aşarak 15. Şampiyonlar Ligi şampiyonluğunu kazandı.',
  },
  {
    topic: 'Merkez Bankası faiz kararı',
    label: 'same_event',
    a: 'Türkiye Cumhuriyet Merkez Bankası politika faizini 250 baz puan artırarak yüzde 50\'ye yükseltti. PPK toplantısı sonrası yapılan açıklamada enflasyonla mücadelede sıkı para politikasının süreceği vurgulandı.',
    b: 'Merkez Bankası şahin çıktı: PPK toplantısından bir gecelik faiz artışı kararı. Politika faizi yüzde 50\'ye çekilirken enflasyon hedefine ulaşılana kadar duruşun korunacağı belirtildi.',
  },
  {
    topic: 'iPhone tanıtımı',
    label: 'same_event',
    a: 'Apple yıllık etkinliğinde yeni iPhone 17 serisini tanıttı. Yapay zeka odaklı yeni Apple Intelligence özellikleri ve titanyum kasa tasarımı dikkat çekti. Fiyatlar Türkiye için henüz açıklanmadı.',
    b: 'Apple\'dan büyük lansman: iPhone 17 ailesi sahneye çıktı. Cupertino etkinliğinde gösterilen modellerde yeni A19 çipi, gelişmiş kamera sistemi ve Apple Intelligence yetenekleri öne çıkarıldı.',
  },
  {
    topic: 'WHO virüs uyarısı',
    label: 'same_event',
    a: 'Dünya Sağlık Örgütü, Güneydoğu Asya\'da yeni tip bir solunum virüsünün hızla yayıldığını açıkladı. WHO\'nun uyarısına göre vaka sayıları üç ülkede artış gösteriyor ve örgüt seyahat tedbirlerinin gözden geçirilmesini istedi.',
    b: 'WHO\'dan yeni virüs alarmı: Asya\'da hızla yayılan solunum yolu enfeksiyonu için ülkelere çağrı yaptı. Üç ülkedeki vaka kümeleri yakından izleniyor, sınır geçişlerinde önlem alınması öneriliyor.',
  },
  {
    topic: 'Ukrayna Rusya çatışması',
    label: 'same_event',
    a: 'Rusya\'nın Donetsk bölgesine düzenlediği saldırıda en az 12 sivil hayatını kaybetti. Ukrayna Cumhurbaşkanlığı saldırıda yaralananların sayısının artabileceğini açıkladı ve uluslararası topluma çağrıda bulundu.',
    b: 'Zelenski: Donetsk\'teki Rus saldırısında 12\'den fazla sivil öldü. Ukrayna lideri olayı savaş suçu olarak nitelendirdi, bölgedeki kurtarma çalışmalarının sürdüğünü ve kayıpların artabileceğini söyledi.',
  },

  // ---- RELATED (same broad topic, different specific event) ----
  {
    topic: 'Deprem - farklı bölge',
    label: 'related',
    a: 'Marmara açıklarında 5.8 büyüklüğünde deprem meydana geldi. AFAD verilerine göre depremin merkez üssü Silivri açıkları olarak belirlendi ve sarsıntı İstanbul başta olmak üzere çevre illerde de hissedildi.',
    b: 'Malatya\'da 4.2 büyüklüğünde bir deprem kaydedildi. AFAD merkez üssünü Pütürge olarak duyurdu, ilk değerlendirmelere göre hasar veya can kaybı bildirilmedi.',
  },
  {
    topic: 'Faiz - farklı ülke',
    label: 'related',
    a: 'Türkiye Cumhuriyet Merkez Bankası politika faizini 250 baz puan artırarak yüzde 50\'ye yükseltti. PPK toplantısı sonrası yapılan açıklamada enflasyonla mücadelede sıkı para politikasının süreceği vurgulandı.',
    b: 'ABD Merkez Bankası Fed faizleri sabit tuttu. Powell yaptığı açıklamada enflasyon verilerinde belirgin iyileşme görmedikçe indirim için acelesi olmadığını söyledi, piyasalar 2026 başına işaret ediyor.',
  },
  {
    topic: 'Telefon lansmanı - farklı marka',
    label: 'related',
    a: 'Apple yıllık etkinliğinde yeni iPhone 17 serisini tanıttı. Yapay zeka odaklı yeni Apple Intelligence özellikleri ve titanyum kasa tasarımı dikkat çekti.',
    b: 'Samsung yeni Galaxy S26 Ultra modelini Unpacked etkinliğinde duyurdu. 200 megapiksel kamera ve Galaxy AI özellikleri ile öne çıkan telefon, üst segmentte iddialı bir başlangıç yapıyor.',
  },

  // ---- UNRELATED ----
  {
    topic: 'Deprem vs yemek',
    label: 'unrelated',
    a: 'Marmara açıklarında 5.8 büyüklüğünde deprem meydana geldi. AFAD verilerine göre depremin merkez üssü Silivri açıkları olarak belirlendi ve sarsıntı İstanbul başta olmak üzere çevre illerde de hissedildi.',
    b: 'Ev yapımı tiramisu tarifi: mascarpone ve kahveyi nasıl dengelersiniz? Klasik İtalyan tatlısının evde profesyonel kıvamda hazırlanması için pratik püf noktaları ve önerilen markalar.',
  },
  {
    topic: 'Şampiyonlar Ligi vs hava durumu',
    label: 'unrelated',
    a: 'Real Madrid Şampiyonlar Ligi finalinde Borussia Dortmund\'u 2-0 yenerek kupayı 15. kez kaldırdı. Maçın golleri Vinicius Jr ve Carvajal\'dan geldi.',
    b: 'Ege Bölgesi\'nde önümüzdeki üç gün boyunca sıcaklıkların mevsim normallerinin üzerinde seyredeceği bildirildi. Meteoroloji Genel Müdürlüğü orman yangını riskine karşı uyardı.',
  },
  {
    topic: 'Faiz vs sanat sergisi',
    label: 'unrelated',
    a: 'Türkiye Cumhuriyet Merkez Bankası politika faizini 250 baz puan artırarak yüzde 50\'ye yükseltti. PPK toplantısı sonrası yapılan açıklamada enflasyonla mücadelede sıkı para politikasının süreceği vurgulandı.',
    b: 'İstanbul Modern\'in yeni sergisi "Bellek ve Mekân" sanatseverlerle buluştu. Yirmi yedi sanatçının yer aldığı sergi üç ay boyunca ziyarete açık olacak.',
  },
  {
    topic: 'Apple lansmanı vs futbol transferi',
    label: 'unrelated',
    a: 'Apple yıllık etkinliğinde yeni iPhone 17 serisini tanıttı. Yapay zeka odaklı yeni Apple Intelligence özellikleri ve titanyum kasa tasarımı dikkat çekti.',
    b: 'Galatasaray, Brezilyalı yıldız orta saha oyuncusu için anlaşmaya vardığını açıkladı. Transferin önümüzdeki haftalarda resmî olarak duyurulması bekleniyor.',
  },
  {
    topic: 'WHO vs film festivali',
    label: 'unrelated',
    a: 'Dünya Sağlık Örgütü, Güneydoğu Asya\'da yeni tip bir solunum virüsünün hızla yayıldığını açıkladı. WHO\'nun uyarısına göre vaka sayıları üç ülkede artış gösteriyor.',
    b: 'Cannes Film Festivali jürisi bu yılki Altın Palmiye ödülünü Japon yönetmenin yeni filmine verdi. Festivalin kapanış töreni dün gece gerçekleştirildi.',
  },
];

function passage(text: string): string {
  return `passage: ${text.replace(/\s+/g, ' ').trim()}`;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function embedAll(modelId: string, texts: string[]): Promise<number[][]> {
  log(`  loading ${modelId} ...`);
  const t0 = Date.now();
  const ex: any = await pipeline('feature-extraction', modelId, { quantized: true });
  log(`  loaded in ${((Date.now() - t0) / 1000).toFixed(1)}s. embedding ${texts.length}...`);
  const tE = Date.now();
  const vectors: number[][] = [];
  const BATCH = 4;
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    const out = await ex(slice, { pooling: 'mean', normalize: true });
    const dim = out.dims[1];
    for (let j = 0; j < slice.length; j++) {
      vectors.push(Array.from(out.data.slice(j * dim, (j + 1) * dim)) as number[]);
    }
  }
  log(`  done in ${((Date.now() - tE) / 1000).toFixed(1)}s`);
  return vectors;
}

function stats(scores: number[]) {
  if (scores.length === 0) return { min: 0, median: 0, mean: 0, max: 0 };
  const sorted = [...scores].sort((x, y) => x - y);
  const mean = scores.reduce((s, x) => s + x, 0) / scores.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  return { min: sorted[0], median, mean, max: sorted[sorted.length - 1] };
}

async function main() {
  const counts: Record<string, number> = { same_event: 0, related: 0, unrelated: 0 };
  for (const p of PAIRS) counts[p.label]++;
  log(`[Bench] Fixture pairs: same_event=${counts.same_event}, related=${counts.related}, unrelated=${counts.unrelated}\n`);

  // Build flat text list (each side of each pair as a separate passage)
  const texts: string[] = [];
  for (const p of PAIRS) {
    texts.push(passage(p.a));
    texts.push(passage(p.b));
  }

  const results: { model: string; sameStats: any; relStats: any; unrelStats: any; sameScores: number[]; relScores: number[]; unrelScores: number[]; detail: { topic: string; label: string; score: number }[] }[] = [];

  for (const m of MODELS) {
    log(`\n[Bench] === ${m.short} ===`);
    let vectors: number[][];
    try {
      vectors = await embedAll(m.id, texts);
    } catch (e: any) {
      log(`  FAILED: ${e.message}`);
      continue;
    }

    const sameScores: number[] = [];
    const relScores: number[] = [];
    const unrelScores: number[] = [];
    const detail: { topic: string; label: string; score: number }[] = [];
    for (let i = 0; i < PAIRS.length; i++) {
      const p = PAIRS[i];
      const s = cosine(vectors[i * 2], vectors[i * 2 + 1]);
      if (p.label === 'same_event') sameScores.push(s);
      else if (p.label === 'related') relScores.push(s);
      else unrelScores.push(s);
      detail.push({ topic: p.topic, label: p.label, score: s });
    }

    const sameStats = stats(sameScores);
    const relStats = stats(relScores);
    const unrelStats = stats(unrelScores);
    results.push({ model: m.short, sameStats, relStats, unrelStats, sameScores, relScores, unrelScores, detail });

    log(`  same_event  cosine: min=${sameStats.min.toFixed(3)} median=${sameStats.median.toFixed(3)} mean=${sameStats.mean.toFixed(3)} max=${sameStats.max.toFixed(3)}`);
    log(`  related     cosine: min=${relStats.min.toFixed(3)} median=${relStats.median.toFixed(3)} mean=${relStats.mean.toFixed(3)} max=${relStats.max.toFixed(3)}`);
    log(`  unrelated   cosine: min=${unrelStats.min.toFixed(3)} median=${unrelStats.median.toFixed(3)} mean=${unrelStats.mean.toFixed(3)} max=${unrelStats.max.toFixed(3)}`);
    log(`  gap (same.med - unrel.med) = ${(sameStats.median - unrelStats.median).toFixed(3)}`);
    log(`  gap (related.med - unrel.med) = ${(relStats.median - unrelStats.median).toFixed(3)}`);
  }

  log('\n\n[Bench] SUMMARY');
  log('model        | same med | same min | rel med | unrel med | unrel max | gap(same-unrel) | misclassified*');
  log('-------------|----------|----------|---------|-----------|-----------|-----------------|---------------');
  for (const r of results) {
    const unrelMax = r.unrelStats.max;
    const misclassified = r.sameScores.filter((s) => s < unrelMax).length;
    const medGap = r.sameStats.median - r.unrelStats.median;
    log(`${r.model.padEnd(12)} | ${r.sameStats.median.toFixed(3).padStart(8)} | ${r.sameStats.min.toFixed(3).padStart(8)} | ${r.relStats.median.toFixed(3).padStart(7)} | ${r.unrelStats.median.toFixed(3).padStart(9)} | ${r.unrelStats.max.toFixed(3).padStart(9)} | ${medGap.toFixed(3).padStart(15)} | ${misclassified}/${r.sameScores.length}`);
  }
  log('* misclassified = same_event pair scored below max unrelated (would not be retrieved)');

  log('\n\n[Bench] DETAIL — every pair, every model:');
  log('topic                                  | label       | ' + results.map((r) => r.model.padStart(11)).join(' | '));
  log('-'.repeat(40 + 14 + results.length * 14));
  for (let i = 0; i < PAIRS.length; i++) {
    const p = PAIRS[i];
    const row = `${p.topic.padEnd(38)} | ${p.label.padEnd(11)} | ` + results.map((r) => r.detail[i].score.toFixed(3).padStart(11)).join(' | ');
    log(row);
  }
}

main().catch((e) => {
  log('[Bench] Fatal: ' + (e && e.stack ? e.stack : String(e)));
  process.exit(1);
});
