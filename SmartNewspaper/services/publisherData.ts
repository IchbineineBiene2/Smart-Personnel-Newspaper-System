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
  description: string;
  category: PublisherCategory;
  readers: string;
  cadence: string;
  verified?: boolean;
  followers: string;
  articlesCount: string;
  reporters: string;
};

export type PublisherArticle = {
  id: string;
  publisherId: string;
  title: string;
  summary: string;
  tag: string;
  likes: number;
  comments: number;
  publishedAt: string;
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
    reporters: '89',
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
    reporters: '36',
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
    reporters: '41',
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
    reporters: '17',
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
    reporters: '25',
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
    reporters: '9',
  },
];

export const PUBLISHER_ARTICLES: PublisherArticle[] = [
  {
    id: 'a1',
    publisherId: 'global-dispatch',
    title: 'The Silent Revolution of Decentralized Intelligence',
    summary:
      'How the next decade of infrastructure is being built for privacy, resilience, and community ownership.',
    tag: 'Tech & Science',
    likes: 1200,
    comments: 84,
    publishedAt: '25 Mar 2026',
  },
  {
    id: 'a2',
    publisherId: 'global-dispatch',
    title: 'Reclaiming the Commons: The New Urban Pastoral',
    summary:
      'Cities are integrating nature as a core pillar of mental health, not just visual identity.',
    tag: 'Urbanism',
    likes: 892,
    comments: 32,
    publishedAt: '24 Mar 2026',
  },
  {
    id: 'a3',
    publisherId: 'global-dispatch',
    title: 'The Paradox of Choice in the Information Age',
    summary:
      'Why abundant access to news can still create confusion without intentional curation habits.',
    tag: 'Editorial',
    likes: 2400,
    comments: 156,
    publishedAt: '23 Mar 2026',
  },
  {
    id: 'a4',
    publisherId: 'global-dispatch',
    title: 'The Analog Revival: Why Tactility Matters',
    summary:
      'Younger audiences are returning to physical media for focus, trust, and meaningful routines.',
    tag: 'Culture',
    likes: 1500,
    comments: 92,
    publishedAt: '22 Mar 2026',
  },
  {
    id: 'a5',
    publisherId: 'silicon-ledger',
    title: 'Chip Diplomacy and the New Supply Corridor',
    summary: 'Strategic semiconductor partnerships are shifting from cost-first to resilience-first planning.',
    tag: 'Technology',
    likes: 610,
    comments: 44,
    publishedAt: '25 Mar 2026',
  },
  {
    id: 'a6',
    publisherId: 'equity-journal',
    title: 'Rate Guidance in a Multi-Polar Market',
    summary: 'Regional policy differences now shape capital flows faster than traditional global signals.',
    tag: 'Economy',
    likes: 740,
    comments: 51,
    publishedAt: '24 Mar 2026',
  },
];

export const PUBLISHER_FILTERS: string[] = [
  'All Sources',
  'Technology',
  'Global Affairs',
  'Art & Design',
  'Economy',
  'Literature',
];
