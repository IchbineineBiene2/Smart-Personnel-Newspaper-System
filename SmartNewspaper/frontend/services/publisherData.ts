export type PublisherCategory =
  | 'Technology'
  | 'Global Affairs'
  | 'Economy'
  | 'Art & Design'
  | 'Literature';

export type Publisher = {
  id: string;
  name: string;
  logoText: string;
  logoUrl?: string;
  description: string;
  category: PublisherCategory;
  readers: string;
  cadence: string;
  verified?: boolean;
  followers: string;
  articlesCount: string;
};

export type PublisherArticle = {
  id: string;
  publisherId: string;
  title: string;
  summary: string;
  tag: string;
  imageUrl?: string;
  originalUrl?: string;
  likes: number;
  comments: number;
  publishedAt: string;
  likeCount?: number;
  viewCount?: number;
};

export const PUBLISHERS: Publisher[] = [
  {
    id: 'global-dispatch',
    name: 'The Global Dispatch',
    logoText: 'GD',
    description:
      'Dedicated to unearthing stories that define our generation, from innovation frontlines to cultural shifts.',
    category: 'Global Affairs',
    readers: '1.2M',
    cadence: 'Daily',
    verified: true,
    followers: '1.2M',
    articlesCount: '45.2K',
  },
  {
    id: 'silicon-ledger',
    name: 'The Silicon Ledger',
    logoText: 'SL',
    description:
      'Deep dives into the intersection of emerging technologies and human civil rights in the digital age.',
    category: 'Technology',
    readers: '12.4K',
    cadence: 'Daily',
    followers: '824K',
    articlesCount: '12.4K',
  },
  {
    id: 'meridian-post',
    name: 'The Meridian Post',
    logoText: 'MP',
    description:
      'A standard-bearer for international reporting, providing clarity on complex geopolitical shifts.',
    category: 'Global Affairs',
    readers: '89K',
    cadence: 'Bi-weekly',
    followers: '540K',
    articlesCount: '8.9K',
  },
  {
    id: 'aesthetic-archive',
    name: 'Aesthetic Archive',
    logoText: 'AA',
    description:
      'Documenting the evolution of architecture, industrial design, and contemporary fine art.',
    category: 'Art & Design',
    readers: '5.2K',
    cadence: 'Monthly',
    followers: '301K',
    articlesCount: '6.1K',
  },
  {
    id: 'equity-journal',
    name: 'Equity Journal',
    logoText: 'EJ',
    description:
      'Financial analysis and market insights delivered with classical economics and modern data.',
    category: 'Economy',
    readers: '42K',
    cadence: 'Weekdays',
    followers: '411K',
    articlesCount: '9.4K',
  },
  {
    id: 'lyricist',
    name: 'The Lyricist',
    logoText: 'TL',
    description:
      'Celebrating the written word through poetry, short fiction, and long-form literary criticism.',
    category: 'Literature',
    readers: '3.1K',
    cadence: 'Quarterly',
    followers: '118K',
    articlesCount: '3.1K',
  },
];

export const PUBLISHER_ARTICLES: PublisherArticle[] = [];
