// TODO [BACKEND]: Arşiv verileri backend API'den çekilecek (GET /api/archive/:userId)
// TODO [BACKEND]: Arşiv oluşturma işlemi backend'de cron job ile günlük/haftalık çalışacak
// TODO [BACKEND]: PDF dosyaları backend'de oluşturulup storage'da (S3/GCS) saklanacak

import { ContentCategory } from './content';

export interface ArchivedEdition {
  id: string;
  title: string;
  generatedAt: string;        // ISO date string
  categories: ContentCategory[];
  articleCount: number;
  summary: string;
}

export interface ArchivedArticle {
  id: string;
  editionId: string;
  title: string;
  excerpt: string;
  category: ContentCategory;
  source: string;
  publishedAt: string;
}

// Mock arşiv verileri (FR26)
export const ARCHIVED_EDITIONS: ArchivedEdition[] = [
  {
    id: 'edition-001',
    title: 'Kisisel Gazete - 21 Mart 2026',
    generatedAt: '2026-03-21T08:00:00Z',
    categories: ['Teknoloji', 'Spor'],
    articleCount: 6,
    summary: 'Yapay zeka gelismeleri, sampiyonluk yolunda son durum ve daha fazlasi.',
  },
  {
    id: 'edition-002',
    title: 'Kisisel Gazete - 20 Mart 2026',
    generatedAt: '2026-03-20T08:00:00Z',
    categories: ['Ekonomi', 'Saglik'],
    articleCount: 5,
    summary: 'Piyasa analizi, saglik sektorunde yeni yaklasimlar.',
  },
  {
    id: 'edition-003',
    title: 'Kisisel Gazete - 19 Mart 2026',
    generatedAt: '2026-03-19T08:00:00Z',
    categories: ['Kultur', 'Teknoloji', 'Ekonomi'],
    articleCount: 8,
    summary: 'Festival programi aciklandi, dijital donusum ve ekonomi gundemi.',
  },
  {
    id: 'edition-004',
    title: 'Kisisel Gazete - 18 Mart 2026',
    generatedAt: '2026-03-18T08:00:00Z',
    categories: ['Spor', 'Kultur'],
    articleCount: 4,
    summary: 'Yerel lig sonuclari, tiyatro sezonu baslangici.',
  },
  {
    id: 'edition-005',
    title: 'Kisisel Gazete - 17 Mart 2026',
    generatedAt: '2026-03-17T08:00:00Z',
    categories: ['Teknoloji', 'Saglik', 'Ekonomi'],
    articleCount: 7,
    summary: 'Siber guvenlik uyarilari, saglik taramalari ve borsa ozeti.',
  },
];

// Her edition icin mock makaleler (FR27)
export const ARCHIVED_ARTICLES: ArchivedArticle[] = [
  // Edition 001
  {
    id: 'arch-art-001',
    editionId: 'edition-001',
    title: 'Yapay Zeka Gazetecilikte Devrim Yaratiyor',
    excerpt: 'Haber odalari yapay zeka destekli icerik uretim araclarini test ediyor.',
    category: 'Teknoloji',
    source: 'Hurriyet',
    publishedAt: '21 Mart 2026',
  },
  {
    id: 'arch-art-002',
    editionId: 'edition-001',
    title: 'Blockchain Tabanli Haber Dogrulama Sistemi',
    excerpt: 'Dezenformasyona karsi yeni bir teknolojik yaklasim gelistiriliyor.',
    category: 'Teknoloji',
    source: 'Cumhuriyet',
    publishedAt: '21 Mart 2026',
  },
  {
    id: 'arch-art-003',
    editionId: 'edition-001',
    title: 'Sampiyonluk Yarisi Kizisiyor',
    excerpt: 'Lig lideri takim kritik deplasmana cikiyor.',
    category: 'Spor',
    source: 'Sabah',
    publishedAt: '21 Mart 2026',
  },
  {
    id: 'arch-art-004',
    editionId: 'edition-001',
    title: 'Genc Yetenek Transferi Gerceklesti',
    excerpt: 'Altyapidan yetisen oyuncu buyuk kuluple anlasti.',
    category: 'Spor',
    source: 'Milliyet',
    publishedAt: '21 Mart 2026',
  },
  // Edition 002
  {
    id: 'arch-art-005',
    editionId: 'edition-002',
    title: 'Merkez Bankasi Faiz Karari Aciklandi',
    excerpt: 'Piyasalar karari olumlu karsiladi, borsa yukseliste.',
    category: 'Ekonomi',
    source: 'Sozcu',
    publishedAt: '20 Mart 2026',
  },
  {
    id: 'arch-art-006',
    editionId: 'edition-002',
    title: 'Saglik Sektorunde Dijital Donusum',
    excerpt: 'Hastaneler yapay zeka destekli tani sistemlerine geciyor.',
    category: 'Saglik',
    source: 'Hurriyet',
    publishedAt: '20 Mart 2026',
  },
  // Edition 003
  {
    id: 'arch-art-007',
    editionId: 'edition-003',
    title: 'Uluslararasi Film Festivali Programi',
    excerpt: '45 ulkeden 120 film gosterilecek.',
    category: 'Kultur',
    source: 'Cumhuriyet',
    publishedAt: '19 Mart 2026',
  },
  {
    id: 'arch-art-008',
    editionId: 'edition-003',
    title: '5G Altyapisi Genislemeye Devam Ediyor',
    excerpt: 'Yeni baz istasyonlari ile kapsama alani artiyor.',
    category: 'Teknoloji',
    source: 'Sabah',
    publishedAt: '19 Mart 2026',
  },
];

export function getEditionArticles(editionId: string): ArchivedArticle[] {
  return ARCHIVED_ARTICLES.filter((a) => a.editionId === editionId);
}

export function searchArchive(query: string): ArchivedArticle[] {
  const lower = query.toLowerCase();
  return ARCHIVED_ARTICLES.filter(
    (a) =>
      a.title.toLowerCase().includes(lower) ||
      a.excerpt.toLowerCase().includes(lower) ||
      a.category.toLowerCase().includes(lower) ||
      a.source.toLowerCase().includes(lower)
  );
}
