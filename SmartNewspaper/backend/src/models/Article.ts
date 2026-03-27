export interface Article {
  id: string;           // URL'nin MD5 hash'i (duplicate tespiti için)
  title: string;
  description: string;
  content?: string;
  url: string;
  imageUrl?: string;
  publishedAt: Date;
  source: ArticleSource;
  category?: string;
  language: string;
}

export interface ArticleSource {
  id?: string;
  name: string;
  url: string;
  type: 'newsapi' | 'rss' | 'scraper';
}
