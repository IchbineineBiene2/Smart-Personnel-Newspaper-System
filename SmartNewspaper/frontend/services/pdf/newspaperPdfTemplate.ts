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

function renderPreviewCard(article: NewspaperPreparedArticle, isLead = false): string {
  const safeTitle = escapeHtml(article.title);
  const safeSource = escapeHtml(article.source);
  const safeSummary = escapeHtml(article.summary || '');

  return `
    <a class="${isLead ? 'lead-card' : 'preview-card'}" href="#article-${escapeHtml(article.id)}">
      ${
        article.imageUrl
          ? `<img src="${escapeHtml(article.imageUrl)}" alt="${safeTitle}" class="${isLead ? 'lead-image' : 'preview-image'}" />`
          : `<div class="${isLead ? 'lead-image' : 'preview-image'} image-placeholder"></div>`
      }
      <div class="${isLead ? 'lead-body' : 'preview-body'}">
        <p class="category">${escapeHtml(article.categoryDisplayName)}</p>
        <h2 class="${isLead ? 'lead-title' : 'preview-title'}">${safeTitle}</h2>
        ${isLead && safeSummary ? `<p class="preview-summary">${safeSummary}</p>` : ''}
        <p class="preview-meta">${safeSource}</p>
        <p class="read-more">${isLead ? 'Haberi ac' : 'Detaya git'}</p>
      </div>
    </a>
  `;
}

function renderDetailArticle(article: NewspaperPreparedArticle, index: number, total: number): string {
  const safeTitle = escapeHtml(article.title);
  const safeContent = escapeHtml(article.content);
  const safeSource = escapeHtml(article.source);
  const safeDate = escapeHtml(article.date);

  const contentParagraphs = safeContent
    .split(/\n+/)
    .filter((line) => line.trim().length > 0)
    .map((paragraph) => {
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
    <article id="article-${escapeHtml(article.id)}" class="article-detail">
      <header class="article-detail-header">
        <p class="category">${escapeHtml(article.categoryDisplayName)}</p>
        <h2 class="article-detail-title">${safeTitle}</h2>
        <p class="article-meta">${safeSource} | ${safeDate}</p>
      </header>
      ${
        article.imageUrl
          ? `<img src="${escapeHtml(article.imageUrl)}" alt="${safeTitle}" class="article-detail-image" />`
          : ''
      }
      <div class="article-columns">${contentParagraphs}</div>
      <p class="detail-footer">Haber ${index + 1} / ${total}</p>
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

  const allArticles = sections.flatMap((section) => section.articles);
  const leadArticle = allArticles[0];
  const previewHtml = [
    leadArticle ? renderPreviewCard(leadArticle, true) : '',
    ...allArticles.slice(1, 10).map((article) => renderPreviewCard(article)),
  ].join('');
  const detailHtml = allArticles.map((article, index) => renderDetailArticle(article, index, allArticles.length)).join('');

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
        background: #fffdf8;
        font-family: 'Times New Roman', Georgia, serif;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      .masthead {
        text-align: center;
        margin-bottom: 5mm;
        padding-bottom: 3mm;
        border-bottom: 3px solid #111111;
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

      .cover-note {
        margin: 0 0 4mm 0;
        font-size: 9px;
        color: #555;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .lead-card {
        display: block;
        grid-column: 1 / -1;
        border: 1px solid #111;
        background: #fff;
        margin-bottom: 5mm;
        page-break-inside: avoid;
      }

      .lead-image {
        width: 100%;
        height: 78mm;
        object-fit: cover;
        display: block;
        background: #e5e5e5;
      }

      .lead-body {
        padding: 5mm;
      }

      .category {
        margin: 0 0 1.5mm 0;
        font-size: 8px;
        color: #8a1f11;
        font-weight: 900;
        letter-spacing: 1.5px;
        text-transform: uppercase;
      }

      .lead-title {
        margin: 0;
        font-size: 28px;
        line-height: 1.05;
        font-weight: 900;
      }

      .preview-summary {
        margin: 2mm 0 0 0;
        font-size: 10px;
        line-height: 1.35;
        color: #333;
      }

      .preview-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 3.5mm;
      }

      .preview-card {
        display: block;
        border: 1px solid #d0d0d0;
        background: #fff;
        min-height: 52mm;
        page-break-inside: avoid;
      }

      .preview-image {
        width: 100%;
        height: 25mm;
        object-fit: cover;
        display: block;
        background: #e5e5e5;
      }

      .preview-body {
        padding: 3mm;
      }

      .preview-title {
        margin: 0;
        font-size: 11px;
        font-weight: 900;
        line-height: 1.2;
      }

      .preview-meta {
        margin: 2mm 0 0 0;
        font-size: 7px;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .read-more {
        margin: 2mm 0 0 0;
        font-size: 7px;
        color: #8a1f11;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.8px;
      }

      .article-detail {
        page-break-before: always;
      }

      .article-detail-header {
        border-bottom: 2px solid #111;
        padding-bottom: 3mm;
        margin-bottom: 4mm;
      }

      .article-detail-title {
        margin: 0;
        font-size: 30px;
        line-height: 1.05;
        font-weight: 900;
      }

      .article-detail-image {
        width: 100%;
        height: 82mm;
        object-fit: cover;
        display: block;
        margin-bottom: 4mm;
      }

      .article-columns {
        column-count: 2;
        column-gap: 6mm;
      }

      .article-body {
        margin: 0 0 2mm 0;
        font-size: 10px;
        line-height: 1.45;
        color: #222;
        text-align: justify;
      }

      .article-meta,
      .detail-footer {
        margin: 2mm 0 0 0;
        font-size: 7.5px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: #666;
        font-weight: 600;
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
      <p class="masthead-sub">Gunluk Baski | ${escapeHtml(displayDate)} | ${allArticles.length} haber</p>
    </header>

    <main>
        <p class="cover-note">Onizleme kartlarina tiklayarak haber detayina gidebilirsiniz.</p>
      <section class="preview-grid">
        ${previewHtml}
      </section>
      ${detailHtml}
    </main>

    <footer class="page-footer">
      Smart Newspaper | © 2026
    </footer>
  </body>
</html>
`.trim();
}
