import axios from 'axios';
import { Article } from '../models/Article';
import { generateArticleId } from '../processors/duplicateDetector';

const GUARDIAN_BASE = 'https://content.guardianapis.com';

interface GuardianResult {
  id: string;
  webTitle: string;
  webUrl: string;
  webPublicationDate: string;
  sectionName: string;
  fields?: {
    bodyText?: string;
    thumbnail?: string;
    trailText?: string;
  };
}

interface GuardianResponse {
  response: {
    status: string;
    results: GuardianResult[];
  };
}

const SECTION_MAP: Record<string, string> = {
  technology: 'technology',
  sport: 'sports',
  business: 'business',
  science: 'science',
  'lifeandstyle': 'health',
  culture: 'entertainment',
  world: 'general',
  politics: 'general',
};

export async function fetchGuardianArticles(apiKey: string, pageSize = 20): Promise<Article[]> {
  const res = await axios.get<GuardianResponse>(`${GUARDIAN_BASE}/search`, {
    params: {
      'api-key': apiKey,
      'show-fields': 'thumbnail,trailText,bodyText',
      'page-size': pageSize,
      'order-by': 'newest',
    },
  });

  return res.data.response.results.map((item): Article => ({
    id: generateArticleId(item.webUrl),
    title: item.webTitle,
    description: item.fields?.trailText ?? '',
    content: item.fields?.bodyText ?? undefined,
    url: item.webUrl,
    imageUrl: item.fields?.thumbnail ?? undefined,
    publishedAt: new Date(item.webPublicationDate),
    source: {
      name: 'The Guardian',
      url: 'https://www.theguardian.com',
      type: 'newsapi',
    },
    category: SECTION_MAP[item.sectionName.toLowerCase()] ?? 'general',
    language: 'en',
  }));
}
