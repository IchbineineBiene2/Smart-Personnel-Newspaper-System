import { Article } from '../models/Article';

export type ArticleAnalysis = {
  available: boolean;
  message?: string;
  summary: string;
  keyPoints: string[];
  context: string;
  perspectives: string[];
  risks: string[];
  questions: string[];
  confidence: 'low' | 'medium' | 'high';
};

const ANALYZABLE_CATEGORIES = new Set([
  'business',
  'economy',
  'ekonomi',
  'general',
  'politics',
  'siyaset',
  'science',
  'technology',
  'health',
  'world',
]);

const STOP_WORDS = new Set([
  'ama', 'ancak', 'bile', 'bir', 'bunu', 'daha', 'diye', 'gibi', 'icin', 'için',
  'ile', 'olan', 'olarak', 'sonra', 'tarafından', 've', 'veya', 'yeni', 'the',
  'and', 'for', 'from', 'that', 'this', 'with',
]);

function cleanText(value: string): string {
  return value
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(text: string): string[] {
  return cleanText(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 35 && sentence.length <= 260);
}

function keywordScore(sentence: string, keywords: string[]): number {
  const lower = sentence.toLocaleLowerCase('tr-TR');
  return keywords.reduce((score, keyword) => score + (lower.includes(keyword) ? 1 : 0), 0);
}

function extractKeywords(text: string): string[] {
  const counts = new Map<string, number>();
  cleanText(text)
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9çğıöşü\s]/gi, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))
    .forEach((word) => counts.set(word, (counts.get(word) ?? 0) + 1));

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word]) => word);
}

function pickSentences(text: string, count: number): string[] {
  const sentences = splitSentences(text);
  const keywords = extractKeywords(text);
  const selected = sentences
    .map((sentence, index) => ({
      sentence,
      index,
      score: keywordScore(sentence, keywords) + (index < 3 ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, count)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence);

  return selected.length ? selected : sentences.slice(0, count);
}

function categoryLabel(category?: string): string {
  const normalized = String(category ?? '').toLocaleLowerCase('tr-TR');
  if (['business', 'economy', 'ekonomi'].includes(normalized)) return 'ekonomik etkiler';
  if (['politics', 'siyaset', 'world'].includes(normalized)) return 'siyasi ve toplumsal etkiler';
  if (['technology', 'science'].includes(normalized)) return 'teknolojik ve yapısal etkiler';
  if (normalized === 'health') return 'sağlık ve kamu yararı etkileri';
  return 'genel kamuoyu etkisi';
}

export function generateArticleAnalysis(article: Article): ArticleAnalysis {
  const sourceText = cleanText([article.title, article.description, article.content].filter(Boolean).join('. '));
  const category = String(article.category ?? 'general').toLocaleLowerCase('tr-TR');
  const enoughText = sourceText.length >= 220;
  const supportedCategory = ANALYZABLE_CATEGORIES.has(category) || !article.category;

  if (!enoughText || !supportedCategory) {
    return {
      available: false,
      message: 'Bu haber için güvenilir analiz üretmeye yetecek metin veya uygun bağlam bulunamadı.',
      summary: '',
      keyPoints: [],
      context: '',
      perspectives: [],
      risks: [],
      questions: [],
      confidence: 'low',
    };
  }

  const picked = pickSentences(sourceText, 4);
  const keywords = extractKeywords(sourceText).slice(0, 5);
  const impact = categoryLabel(article.category);
  const summary = picked[0] ?? article.description ?? article.title;

  return {
    available: true,
    summary,
    keyPoints: picked.slice(0, 3),
    context: `Bu haber ${impact} açısından izlenmeye değer. Öne çıkan kavramlar: ${keywords.join(', ') || 'gündem, kaynak, gelişme'}.`,
    perspectives: [
      `${article.source.name} haberin görünen gelişmesini öne çıkarıyor; farklı kaynaklarda ayrıntı ve vurgu değişebilir.`,
      'Okur açısından asıl soru, gelişmenin kısa vadeli sonuçlarının mı yoksa kalıcı etkilerinin mi daha güçlü olacağı.',
      'Karar vericiler ve etkilenen taraflar için zamanlama, kaynak güvenilirliği ve resmi açıklamalar belirleyici olacaktır.',
    ],
    risks: [
      'Tek kaynaklı bilgiyle kesin hüküm vermek yanıltıcı olabilir.',
      'Başlık, olayın tüm taraflarını veya arka planını tek başına göstermeyebilir.',
    ],
    questions: [
      'Bu gelişmeden doğrudan kimler etkileniyor?',
      'Haberde resmi veri, belge veya birincil kaynak var mı?',
      'Farklı kaynaklar aynı olayı hangi noktalarda başka türlü çerçeveliyor?',
    ],
    confidence: article.content && article.content.length > 700 ? 'high' : 'medium',
  };
}
