import axios from 'axios';
import { Article } from '../models/Article';
import { generateArticleId } from '../processors/duplicateDetector';
import { NEWS_API_CATEGORIES, NEWS_API_LANGUAGES } from '../config/sources';

const NEWS_API_BASE = 'https://newsapi.org/v2';

interface NewsApiArticle {
  source: { id: string | null; name: string };
  title: string;
  description: string | null;
  content: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

function mapToArticle(item: NewsApiArticle, category: string, language: string): Article | null {
  if (!item.url || !item.title || item.title === '[Removed]') return null;
  return {
    id: generateArticleId(item.url),
    title: item.title,
    description: item.description ?? '',
    content: item.content ?? undefined,
    url: item.url,
    imageUrl: item.urlToImage ?? undefined,
    publishedAt: new Date(item.publishedAt),
    source: {
      id: item.source.id ?? undefined,
      name: item.source.name,
      url: item.url,
      type: 'newsapi',
    },
    category,
    language,
  };
}

export async function fetchTopHeadlines(
  apiKey: string,
  language: string = 'tr',
  category: string = 'general',
  pageSize: number = 50
): Promise<Article[]> {
  const res = await axios.get<NewsApiResponse>(`${NEWS_API_BASE}/top-headlines`, {
    params: { apiKey, language, category, pageSize },
  });
  return res.data.articles
    .map((a) => mapToArticle(a, category, language))
    .filter((a): a is Article => a !== null);
}

export async function fetchAllCategories(apiKey: string): Promise<Article[]> {
  const results: Article[] = [];
  for (const language of NEWS_API_LANGUAGES) {
    for (const category of NEWS_API_CATEGORIES) {
      try {
        const articles = await fetchTopHeadlines(apiKey, language, category);
        results.push(...articles);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 429) {
          console.warn('[NewsAPI] Rate limit (429) — kalan kategoriler atlanıyor.');
          return results; // Daha fazla istek atmadan çık
        }
        console.error(`NewsAPI fetch failed: ${language}/${category}`, (err as Error).message);
      }
    }
  }
  return results;
}
