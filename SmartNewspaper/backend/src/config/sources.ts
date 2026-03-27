export interface RssSource {
  name: string;
  url: string;
  language: string;
  category?: string;
}

// Türkçe, İngilizce ve Almanca RSS kaynakları
export const RSS_SOURCES: RssSource[] = [
  // ── Türkçe ──────────────────────────────────────────────────────────────
  { name: 'Hürriyet', url: 'https://www.hurriyet.com.tr/rss/anasayfa', language: 'tr', category: 'general' },
  { name: 'Milliyet', url: 'https://www.milliyet.com.tr/rss/rssNew/gundemRss.xml', language: 'tr', category: 'general' },
  { name: 'Sabah', url: 'https://www.sabah.com.tr/rss/anasayfa.xml', language: 'tr', category: 'general' },
  { name: 'BBC Türkçe', url: 'https://feeds.bbci.co.uk/turkce/rss.xml', language: 'tr', category: 'general' },
  { name: 'NTV', url: 'https://www.ntv.com.tr/son-dakika.rss', language: 'tr', category: 'breaking' },
  // ── İngilizce ───────────────────────────────────────────────────────────
  { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', language: 'en', category: 'general' },
  { name: 'BBC Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', language: 'en', category: 'technology' },
  { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', language: 'en', category: 'business' },
  { name: 'Reuters', url: 'https://feeds.reuters.com/reuters/topNews', language: 'en', category: 'general' },
  // Deutsche Welle İngilizce
  { name: 'DW News', url: 'https://rss.dw.com/rdf/rss-en-all', language: 'en', category: 'general' },
  { name: 'DW Europe', url: 'https://rss.dw.com/rdf/rss-en-eu', language: 'en', category: 'general' },
  { name: 'DW Business', url: 'https://rss.dw.com/rdf/rss-en-bus', language: 'en', category: 'business' },
  // Spiegel International (İngilizce)
  { name: 'Spiegel International', url: 'https://www.spiegel.de/international/index.rss', language: 'en', category: 'general' },
  // ── Almanca ─────────────────────────────────────────────────────────────
  { name: 'DW Deutsch', url: 'https://rss.dw.com/rdf/rss-de-news', language: 'de', category: 'general' },
  { name: 'Tagesschau', url: 'https://www.tagesschau.de/xml/rss2/', language: 'de', category: 'general' },
  { name: 'Spiegel', url: 'https://www.spiegel.de/schlagzeilen/index.rss', language: 'de', category: 'general' },
];

// NewsAPI kategorileri
export const NEWS_API_CATEGORIES = [
  'business',
  'entertainment',
  'general',
  'health',
  'science',
  'sports',
  'technology',
];

// NewsAPI dilleri
export const NEWS_API_LANGUAGES = ['tr', 'en'];
