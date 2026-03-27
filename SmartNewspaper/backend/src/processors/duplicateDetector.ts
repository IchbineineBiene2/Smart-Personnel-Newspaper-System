import crypto from 'crypto';
import { Article } from '../models/Article';

// Bellekte tutulan URL hash seti (production'da Redis/DB kullanılmalı)
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

// Başlık benzerliği kontrolü (aynı haber farklı kaynaktan geldiğinde)
export function isSimilarTitle(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9ğüşıöç\s]/g, '').trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  // Bir başlık diğerinin %80'inden fazlasını içeriyorsa benzer say
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  return longer.includes(shorter) && shorter.length / longer.length > 0.8;
}

export function clearCache(): void {
  seenHashes.clear();
}
