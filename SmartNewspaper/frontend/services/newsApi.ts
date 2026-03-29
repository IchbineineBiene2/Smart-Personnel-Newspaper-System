import { Platform } from 'react-native';
import { ContentCategory } from './content';

// Android emülatörde localhost yerine 10.0.2.2 kullanılır
const API_BASE =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export interface ApiArticle {
  id: string;
  title: string;
  description: string;
  content?: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
  source: {
    id?: string;
    name: string;
    url: string;
    type: 'newsapi' | 'rss' | 'scraper';
  };
  category?: string;
  language: string;
}

interface FetchNewsParams {
  language?: 'tr' | 'en';
  category?: string;
  source?: string;
  limit?: number;
  offset?: number;
}

// Backend kategori → Uygulama kategorisi eşleşmesi (sadece özgün kategoriler)
const CATEGORY_MAP: Record<string, ContentCategory> = {
  technology: 'Teknoloji',
  science: 'Teknoloji',
  sports: 'Spor',
  business: 'Ekonomi',
  health: 'Saglik',
  entertainment: 'Kultur',
};

// Başlık / açıklama metninden anahtar kelime ile kategori çıkarımı
const CATEGORY_KEYWORDS: Record<ContentCategory, string[]> = {
  Spor: [
    // Türkçe
    'futbol', 'basketbol', 'voleybol', 'tenis', 'formula', ' lig', 'spor', 'gol', 'şampiyon',
    'turnuva', 'sporcu', 'stadyum', 'transfer', 'kulüb', 'maçı', 'maçında', 'atletizm',
    'yüzme', 'güreş', 'boks',
    // İngilizce
    'nba', 'nfl', 'f1', 'football', 'basketball', 'tennis', 'sport', 'match', 'goal',
    'champion', 'tournament', 'player', 'stadium',
    // Almanca
    'fußball', 'bundesliga', 'sport', 'tor', 'spieler', 'meister', 'turnier', 'wm', 'em ',
  ],
  Ekonomi: [
    // Türkçe
    'borsa', 'dolar', 'euro', 'faiz', 'enflasyon', 'ekonomi', 'bütçe', 'ticaret', 'bitcoin',
    'piyasa', 'hisse', 'yatırım', 'ihracat', 'ithalat', 'kur', 'merkez bankası', 'vergi',
    'kripto', 'resesyon', 'büyüme', 'şirket', 'banka', 'fiyat',
    // İngilizce
    'market', 'inflation', 'dollar', 'economy', 'trade', 'finance', 'stock', 'gdp', 'bank',
    'currency', 'crypto', 'recession', 'budget',
    // Almanca
    'wirtschaft', 'börse', 'inflation', 'haushalt', 'aktie', 'bank', 'handel', 'steuer',
    'unternehmen', 'konjunktur',
  ],
  Saglik: [
    // Türkçe
    'sağlık', 'hastane', 'ilaç', 'hastalık', 'pandemi', 'covid', 'kanser', 'doktor', 'hasta',
    'tedavi', 'aşı', 'tıp', 'ameliyat', 'grip', 'bağışıklık', 'klinik', 'eczane', 'obezite',
    // İngilizce
    'health', 'hospital', 'medicine', 'disease', 'treatment', 'vaccine', 'cancer', 'doctor',
    'patient', 'virus', 'therapy', 'diabetes', 'mental', 'wellness',
    // Almanca
    'gesundheit', 'krankenhaus', 'impfung', 'krankheit', 'medizin', 'arzt', 'patient',
  ],
  Teknoloji: [
    // Türkçe
    'teknoloji', 'yapay zeka', 'yazılım', 'uygulama', 'iphone', 'android', 'bilgisayar',
    'internet', 'siber', 'robot', 'uzay', 'nasa', 'spacex', 'elektrikli araç', 'chip', 'gpu',
    // İngilizce
    'technology', 'software', 'artificial intelligence', ' ai ', 'computer', 'cyber',
    'digital', 'innovation', 'startup', 'chatgpt', 'microsoft', 'google', 'apple', 'meta',
    'tesla', 'drone', 'blockchain',
    // Almanca
    'technologie', 'software', 'künstliche intelligenz', 'computer', 'digital', 'startup',
    'roboter', 'raumfahrt',
  ],
  Kultur: [
    // Türkçe
    'film', 'müzik', 'sanat', 'tiyatro', 'dizi', 'festival', 'kültür', 'sinema', 'konser',
    'sergi', 'edebiyat', 'kitap', 'roman', 'yazar', 'şarkı', 'albüm', 'ödül', 'oscar',
    // İngilizce
    'culture', 'music', 'art', 'theater', 'cinema', 'concert', 'exhibition', 'literature',
    'book', 'award', 'grammy', 'actor', 'actress', 'director', 'series', 'netflix',
    // Almanca
    'kultur', 'musik', 'kunst', 'theater', 'kino', 'festival', 'literatur', 'buch', 'preis',
  ],
};

function inferCategoryFromText(title: string, description: string): ContentCategory {
  const text = `${title} ${description}`.toLowerCase();
  let bestCat: ContentCategory = 'Ekonomi'; // genel haberler için nötr varsayılan
  let bestScore = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [ContentCategory, string[]][]) {
    const score = keywords.filter((kw) => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCat = cat as ContentCategory;
    }
  }
  return bestCat;
}

export function mapToContentCategory(backendCategory?: string, title = '', description = ''): ContentCategory {
  // 'general' ve 'breaking' için metin analizine güven, spesifik kategoriler için haritayı kullan
  if (backendCategory && backendCategory !== 'general' && backendCategory !== 'breaking') {
    return CATEGORY_MAP[backendCategory.toLowerCase()] ?? inferCategoryFromText(title, description);
  }
  return inferCategoryFromText(title, description);
}

function unwrapProxiedImageUrl(input: string): string {
  try {
    const parsed = new URL(input);
    if (parsed.pathname.includes('/api/proxy/image')) {
      const original = parsed.searchParams.get('url');
      if (original) return decodeURIComponent(original);
    }
  } catch {
    // Keep original value when URL parsing fails.
  }
  return input;
}

// Harici CDN resimlerini backend proxy üzerinden yükler (hotlink korumasını aşar)
export function proxyImageUrl(url?: string): string | undefined {
  if (!url) return undefined;

  let upgraded = unwrapProxiedImageUrl(url);

  // BBC images: force larger variants when a size segment exists in URL.
  if (/ichef\.bbci\.co\.uk/i.test(upgraded)) {
    upgraded = upgraded
      .replace(/\/news\/\d+\//i, '/news/1024/')
      .replace(/\/news\/(\d{2,4})x(\d{2,4})\//i, '/news/1024/')
      .replace(/\/ace\/standard\/\d+\//i, '/news/1024/')
      .replace(/\/ace\/ws\/\d+\//i, '/news/1024/')
      .replace(/\/images\/ic\/\d+x\d+\//i, '/images/ic/1024x576/');

    try {
      const parsed = new URL(upgraded);
      const width = Number(parsed.searchParams.get('imwidth') ?? 0);
      if (width && width < 1024) {
        parsed.searchParams.set('imwidth', '1200');
      }
      upgraded = parsed.toString();
    } catch {
      // Keep upgraded URL when parsing fails.
    }
  }

  // Hurriyet: prefer uncropped/original-ish variant when thumbnail path is used.
  if (/image\.hurimg\.com/i.test(upgraded)) {
    upgraded = upgraded.replace(/\/90\/\d+x\d+\//i, '/90/0x0/');
  }

  return `${API_BASE}/api/proxy/image?url=${encodeURIComponent(upgraded)}`;
}

export async function fetchArticles(params: FetchNewsParams = {}): Promise<ApiArticle[]> {
  const query = new URLSearchParams();
  if (params.language) query.set('language', params.language);
  if (params.category) query.set('category', params.category);
  if (params.source) query.set('source', params.source);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));

  const res = await fetch(`${API_BASE}/api/news?${query.toString()}`);
  if (!res.ok) throw new Error(`API hatası: ${res.status}`);
  const data: { total: number; articles: ApiArticle[] } = await res.json();
  return data.articles;
}

export async function fetchArticleById(id: string): Promise<ApiArticle> {
  const res = await fetch(`${API_BASE}/api/news/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`API hatası: ${res.status}`);
  return (await res.json()) as ApiArticle;
}

export async function fetchArticleFullContent(id: string): Promise<{ content: string; images?: string[]; fromSource: boolean }> {
  const res = await fetch(`${API_BASE}/api/news/${encodeURIComponent(id)}/full-content`);
  if (!res.ok) throw new Error(`API hatası: ${res.status}`);
  return (await res.json()) as { content: string; images?: string[]; fromSource: boolean };
}
