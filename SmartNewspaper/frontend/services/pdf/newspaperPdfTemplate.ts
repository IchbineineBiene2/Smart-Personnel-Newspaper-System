import { ContentCategory } from '@/services/content';

export type NewspaperArticleInput = {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: ContentCategory | string;
  source: string;
  date: string;
  relevanceScore?: number;
  imageUrl?: string;
};

export type NewspaperPersonalization = {
  preferredCategories?: Array<ContentCategory | string>;
};

export type NewspaperTemplateInput = {
  newspaperName?: string;
  generatedAt?: string;
  articles: NewspaperArticleInput[];
  personalization?: NewspaperPersonalization;
};

type ScoredArticle = NewspaperArticleInput & {
  computedScore: number;
  normalizedCategory: string;
};

export type NewspaperPreparedArticle = NewspaperArticleInput & {
  computedScore: number;
  categoryDisplayName: string;
};

export type NewspaperPreparedSection = {
  categoryKey: string;
  categoryDisplayName: string;
  articles: NewspaperPreparedArticle[];
};

export type NewspaperPreparedData = {
  newspaperName: string;
  displayDate: string;
  sections: NewspaperPreparedSection[];
  personalizationExists: boolean;
};

export const CATEGORY_DISPLAY_MAP: Record<string, string> = {
  Teknoloji: 'Teknoloji',
  Spor: 'Spor',
  Kultur: 'Kultur & Sanat',
  'Kultur & Sanat': 'Kultur & Sanat',
  Saglik: 'Saglik',
  Ekonomi: 'Ekonomi',
};

export const CATEGORY_COLOR_MAP: Record<string, { bg: string; text: string }> = {
  Teknoloji: { bg: '#0047AB', text: '#FFFFFF' },
  Spor: { bg: '#D32F2F', text: '#FFFFFF' },
  Kultur: { bg: '#8B00D9', text: '#FFFFFF' },
  'Kultur & Sanat': { bg: '#8B00D9', text: '#FFFFFF' },
  Saglik: { bg: '#2E7D32', text: '#FFFFFF' },
  Ekonomi: { bg: '#F57C00', text: '#FFFFFF' },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeCategory(category: string): string {
  return category.trim();
}

function parseDateToEpoch(dateLike: string): number {
  const parsed = Date.parse(dateLike);
  if (!Number.isNaN(parsed)) return parsed;
  return 0;
}

function computeFreshnessBoost(dateLike: string): number {
  const publishedAt = parseDateToEpoch(dateLike);
  if (!publishedAt) return 0;

  const ageMs = Date.now() - publishedAt;
  const oneHour = 60 * 60 * 1000;
  const hours = Math.max(0, Math.floor(ageMs / oneHour));

  if (hours <= 6) return 28;
  if (hours <= 24) return 22;
  if (hours <= 72) return 14;
  if (hours <= 168) return 8;
  return 2;
}

function scoreArticles(
  articles: NewspaperArticleInput[],
  personalization?: NewspaperPersonalization
): { scored: ScoredArticle[]; personalizationExists: boolean } {
  const preferredSet = new Set((personalization?.preferredCategories ?? []).map((item) => normalizeCategory(String(item))));
  const hasExplicitRelevance = articles.some((article) => typeof article.relevanceScore === 'number');
  const hasPreferences = preferredSet.size > 0;
  const personalizationExists = hasExplicitRelevance || hasPreferences;

  const scored = articles.map((article) => {
    const normalizedCategory = normalizeCategory(String(article.category));
    const base = article.relevanceScore ?? 0;
    const preferenceBoost = preferredSet.has(normalizedCategory) ? 35 : 0;
    const freshnessBoost = computeFreshnessBoost(article.date);

    return {
      ...article,
      normalizedCategory,
      computedScore: base + preferenceBoost + freshnessBoost,
    };
  });

  return { scored, personalizationExists };
}

function groupByCategory(scoredArticles: ScoredArticle[]): Array<{ category: string; articles: ScoredArticle[] }> {
  const map = new Map<string, ScoredArticle[]>();

  scoredArticles.forEach((article) => {
    const key = article.normalizedCategory;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(article);
  });

  return Array.from(map.entries()).map(([category, articles]) => ({ category, articles }));
}

function formatDisplayDate(input?: string): string {
  const rawDate = input ? new Date(input) : new Date();
  if (Number.isNaN(rawDate.getTime())) {
    return new Date().toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  return rawDate.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function renderArticle(article: NewspaperPreparedArticle): string {
  const safeTitle = escapeHtml(article.title);
  const safeSummary = escapeHtml(article.summary);
  const safeContent = escapeHtml(article.content || article.summary);
  const safeSource = escapeHtml(article.source);
  const safeDate = escapeHtml(article.date);

  // Format content into readable paragraphs
  // Split by multiple newlines, then by sentences to create natural paragraph breaks
  const contentParagraphs = safeContent
    .split(/\n+/)
    .filter((line) => line.trim().length > 0)
    .map((paragraph) => {
      // If paragraph is very long, try to break it into ~2-3 sentences per visual paragraph
      if (paragraph.length > 180) {
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        const chunked: string[] = [];
        let current = '';
        
        sentences.forEach((sent) => {
          if ((current + sent).length > 160 && current.length > 0) {
            chunked.push(current.trim());
            current = sent;
          } else {
            current += sent;
          }
        });
        if (current.trim()) chunked.push(current.trim());
        
        return chunked.map((chunk) => `<p class="article-body">${chunk}</p>`).join('');
      }
      return `<p class="article-body">${paragraph}</p>`;
    })
    .join('');

  return `
    <article class="article-cell">
      ${
        article.imageUrl
          ? `<img src="${escapeHtml(article.imageUrl)}" alt="${safeTitle}" class="article-image" />`
          : '<div class="article-image-placeholder"></div>'
      }
      <h3 class="article-title">${safeTitle}</h3>
      ${contentParagraphs}
      <p class="article-meta">${safeSource} | ${safeDate}</p>
    </article>
  `;
}

export function prepareNewspaperPdfData(input: NewspaperTemplateInput): NewspaperPreparedData {
  const newspaperName = input.newspaperName ?? 'Smart Newspaper';
  const displayDate = formatDisplayDate(input.generatedAt);
  const { scored, personalizationExists } = scoreArticles(input.articles, input.personalization);

  const ordered = personalizationExists
    ? [...scored].sort((a, b) => b.computedScore - a.computedScore)
    : [...scored].sort((a, b) => parseDateToEpoch(b.date) - parseDateToEpoch(a.date));

  const groupedSections = groupByCategory(ordered);

  const sections: NewspaperPreparedSection[] = groupedSections.map(({ category, articles }) => {
    const categoryDisplayName = CATEGORY_DISPLAY_MAP[category] ?? category;
    return {
      categoryKey: category,
      categoryDisplayName,
      articles: articles.map((article) => ({
        ...article,
        categoryDisplayName,
      })),
    };
  });

  return {
    newspaperName,
    displayDate,
    sections,
    personalizationExists,
  };
}

export function renderNewspaperPdfHtml(input: NewspaperTemplateInput): string {
  const { newspaperName, displayDate, sections } = prepareNewspaperPdfData(input);

  // Flatten all articles across all sections for 3-column grid
  const allArticles = sections.flatMap((section) => section.articles);

  const articleHtml = allArticles.map(renderArticle).join('');

  return `
<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      @page {
        size: A4;
        margin: 12mm 10mm 12mm 10mm;
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      html, body {
        margin: 0;
        padding: 0;
        color: #111111;
        background: #ffffff;
        font-family: 'Times New Roman', Georgia, serif;
      }

      .masthead {
        text-align: center;
        margin-bottom: 8mm;
        padding-bottom: 3mm;
        border-bottom: 2px solid #111111;
        page-break-after: avoid;
      }

      .paper-title {
        margin: 0 0 2mm 0;
        font-size: 48px;
        font-weight: 900;
        letter-spacing: -0.5px;
        line-height: 1;
      }

      .masthead-sub {
        margin: 0;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 2px;
        font-weight: 600;
      }

      /* 3-Column Grid Layout */
      .articles-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 4mm;
        grid-auto-rows: auto;
      }

      .article-cell {
        display: flex;
        flex-direction: column;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .article-image {
        width: 100%;
        height: 70mm;
        object-fit: cover;
        display: block;
        margin-bottom: 2mm;
        background: #f0f0f0;
      }

      .article-image-placeholder {
        width: 100%;
        height: 70mm;
        background: #d0d0d0;
        margin-bottom: 2mm;
        display: block;
      }

      .article-title {
        margin: 0 0 2mm 0;
        font-size: 13px;
        font-weight: 900;
        line-height: 1.2;
        color: #111111;
      }

      .article-body {
        margin: 0 0 1.5mm 0;
        font-size: 9px;
        line-height: 1.4;
        font-weight: 400;
        color: #222222;
        text-align: justify;
      }

      .article-body:last-of-type {
        margin-bottom: 2mm;
      }

      .article-summary {
        margin: 0 0 1.5mm 0;
        font-size: 9.5px;
        line-height: 1.35;
        font-weight: 500;
        color: #222222;
      }

      .article-meta {
        margin: 0;
        font-size: 7.5px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        font-weight: 600;
        color: #666666;
      }

      .page-footer {
        position: fixed;
        left: 10mm;
        right: 10mm;
        bottom: 5mm;
        text-align: center;
        font-size: 8px;
        letter-spacing: 0.5px;
        border-top: 1px solid #cccccc;
        padding-top: 2mm;
        background: white;
      }

      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        
        .masthead {
          page-break-after: avoid;
        }
      }
    </style>
  </head>
  <body>
    <header class="masthead">
      <h1 class="paper-title">${escapeHtml(newspaperName)}</h1>
      <p class="masthead-sub">Gunluk Baski | ${escapeHtml(displayDate)}</p>
    </header>

    <main class="articles-grid">
      ${articleHtml}
    </main>

    <footer class="page-footer">
      Smart Newspaper | © 2026
    </footer>
  </body>
</html>
`.trim();
}
