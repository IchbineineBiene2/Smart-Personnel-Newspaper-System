import axios from 'axios';
import * as cheerio from 'cheerio';

// Her haber sitesi için makale gövdesini hangi CSS seçiciden çekeceğimizi tanımlıyoruz
interface SiteRule {
  domain: string;
  contentSelector: string;   // Ana metin bloğu
  removeSelectors?: string[];  // Çıkarılacak elementler (reklam, paylaşım butonları vb.)
}

const SITE_RULES: SiteRule[] = [
  // ── Türkçe ──────────────────────────────────────────────────────────────
  {
    domain: 'hurriyet.com.tr',
    contentSelector: '.news-content, .content-text, article .newsDetay, .article-body, .haber-detay-content',
    removeSelectors: ['.news-tags', '.social-shares', '.related-news', 'script', 'style', '.advertisement', '.reklam'],
  },
  {
    domain: 'milliyet.com.tr',
    contentSelector: '.article-detail-content, .article-body, .articleContent, .detay-icerik',
    removeSelectors: ['.tags', '.share-bar', '.also-read', 'script', 'style'],
  },
  {
    domain: 'sabah.com.tr',
    contentSelector: '.newsArticle, .article-content, #news-body, .story-body, .field--name-body',
    removeSelectors: ['.tag-cloud', '.share', 'script', 'style', '.advertisement'],
  },
  {
    domain: 'ntv.com.tr',
    contentSelector: '.article-content, .news-text, .story-body, .article__content',
    removeSelectors: ['script', 'style', '.share-area', '.related-content'],
  },
  // ── İngilizce ───────────────────────────────────────────────────────────
  {
    domain: 'bbc.com',
    // BBC yapısı sık değişiyor; birden fazla seçici sırayla denenir
    contentSelector: [
      '[data-component="text-block"]',
      'article [class*="RichTextComponentWrapper"]',
      'article [class*="TextBlock"]',
      '.article__body-content p',
      'article p',
    ].join(', '),
    removeSelectors: ['script', 'style', 'figure', '[data-component="image-block"]', '.ad-slot'],
  },
  {
    domain: 'reuters.com',
    contentSelector: '.article-body__content, [class*="article-body"], .StandardArticleBody_body',
    removeSelectors: ['script', 'style', '.trust-badge', '.related-content'],
  },
  // ── Almanca / Deutsche Welle ─────────────────────────────────────────────
  {
    domain: 'dw.com',
    contentSelector: '.article__section, .longText, [class*="article__content"], .rich-text',
    removeSelectors: ['script', 'style', '.advertisement', '.kicker', '.social-links', '[class*="related"]'],
  },
  // ── Tagesschau ───────────────────────────────────────────────────────────
  {
    domain: 'tagesschau.de',
    contentSelector: '.article-module, .storyelement-text, .text article, .metatextblock',
    removeSelectors: ['script', 'style', '.socialbookmarks', '.modComment', '.linklist'],
  },
  // ── Spiegel ──────────────────────────────────────────────────────────────
  {
    domain: 'spiegel.de',
    // Spiegel bazı içerikleri paywall arkasında; açık kısımları alır
    contentSelector: '[data-sara-click-el="article_body"] p, .article-body p, .RichText p',
    removeSelectors: ['script', 'style', '.paywall', '.asset-box', '.ticker'],
  },
];

function findRule(url: string): SiteRule | null {
  return SITE_RULES.find((r) => url.includes(r.domain)) ?? null;
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function scrapeArticleContent(url: string): Promise<string | null> {
  const rule = findRule(url);
  if (!rule) return null;

  try {
    const res = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const $ = cheerio.load(res.data as string);

    // Gereksiz elementleri kaldır
    (rule.removeSelectors ?? []).forEach((sel) => $(sel).remove());

    // Ana içeriği çek
    const contentEl = $(rule.contentSelector).first();
    if (!contentEl.length) return null;

    const text = cleanText(contentEl.text());
    // En az 200 karakter yoksa anlamlı içerik değil
    return text.length >= 200 ? text : null;
  } catch {
    return null;
  }
}

// Bir makale listesindeki boş content'leri scraping ile doldurur
// Paralel istekleri sınırlamak için batchSize kullanılır
export async function enrichArticlesWithContent<T extends { url: string; content?: string; description: string }>(
  articles: T[],
  batchSize = 3
): Promise<T[]> {
  const toEnrich = articles.filter((a) => !a.content || a.content.length < 200);
  const results = [...articles];

  for (let i = 0; i < toEnrich.length; i += batchSize) {
    const batch = toEnrich.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (article) => {
        const fullText = await scrapeArticleContent(article.url);
        if (fullText) {
          const idx = results.findIndex((a) => a.url === article.url);
          if (idx !== -1) results[idx] = { ...results[idx], content: fullText };
        }
      })
    );
    // Site'ye yük bindirmemek için batch'ler arasında kısa bekleme
    if (i + batchSize < toEnrich.length) await new Promise((r) => setTimeout(r, 500));
  }

  return results;
}
