import crypto from 'crypto';
import { Article } from '../models/Article';
import { getExistingIds } from '../db/articleRepository';

// In-memory hash seti — DB'den başlangıçta yüklenir, sonra canlı güncellenir
const seenHashes = new Set<string>();

export function generateArticleId(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex');
}

export function isDuplicate(article: Article): boolean {
  return seenHashes.has(article.id);
}

export function markAsSeen(article: Article): void {
  seenHashes.add(article.id);
}

export function filterDuplicates(articles: Article[]): Article[] {
  const unique: Article[] = [];
  for (const article of articles) {
    if (!isDuplicate(article)) {
      unique.push(article);
      markAsSeen(article);
    }
  }
  return unique;
}

/** Başlık benzerliği kontrolü (aynı haber farklı kaynaktan geldiğinde) */
export function isSimilarTitle(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9ğüşıöç\s]/g, '').trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  return longer.includes(shorter) && shorter.length / longer.length > 0.8;
}

/** In-memory seti temizle (DB verileri korunur) */
export function clearCache(): void {
  seenHashes.clear();
}

/** Sunucu başlarken DB'deki mevcut ID'leri in-memory sete yükler */
export async function loadSeenIdsFromDb(): Promise<void> {
  try {
    const ids = await getExistingIds();
    ids.forEach((id) => seenHashes.add(id));
    console.log(`[DuplicateDetector] DB'den ${ids.size} mevcut haber ID'si yüklendi.`);
  } catch (err) {
    console.warn('[DuplicateDetector] DB ID yüklenemedi (DB henüz hazır olmayabilir):', (err as Error).message);
  }
}
