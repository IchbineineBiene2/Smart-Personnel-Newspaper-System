export interface RssSource {
  name: string;
  url: string;
  language: string;
  category?: string;
}

// Türkçe, İngilizce ve Almanca RSS kaynakları
export const RSS_SOURCES: RssSource[] = [
  // ── Türkçe Genel ────────────────────────────────────────────────────────
  { name: 'Hürriyet', url: 'https://www.hurriyet.com.tr/rss/anasayfa', language: 'tr', category: 'general' },
  { name: 'Milliyet', url: 'https://www.milliyet.com.tr/rss/rssNew/gundemRss.xml', language: 'tr', category: 'general' },
  { name: 'Sabah', url: 'https://www.sabah.com.tr/rss/anasayfa.xml', language: 'tr', category: 'general' },
  { name: 'BBC Türkçe', url: 'https://feeds.bbci.co.uk/turkce/rss.xml', language: 'tr', category: 'general' },
  { name: 'NTV', url: 'https://www.ntv.com.tr/son-dakika.rss', language: 'tr', category: 'breaking' },
  { name: 'TRT Haber', url: 'https://www.trthaber.com/xml_mobile.php', language: 'tr', category: 'general' },
  { name: 'Habertürk', url: 'https://www.haberturk.com/rss/manset.xml', language: 'tr', category: 'general' },
  { name: 'Cumhuriyet', url: 'https://www.cumhuriyet.com.tr/rss', language: 'tr', category: 'general' },
  { name: 'Gazete Duvar', url: 'https://www.gazeteduvar.com.tr/rss', language: 'tr', category: 'general' },
  { name: 'Karar', url: 'https://www.karar.com/rss', language: 'tr', category: 'general' },
  { name: 'Independent Türkçe', url: 'https://www.indyturk.com/rss.xml', language: 'tr', category: 'general' },
  { name: 'Diken', url: 'https://www.diken.com.tr/feed/', language: 'tr', category: 'general' },

  // ── Türkçe Spor ─────────────────────────────────────────────────────────
  { name: 'Hürriyet Spor', url: 'https://www.hurriyet.com.tr/rss/spor', language: 'tr', category: 'sports' },
  { name: 'Sabah Spor', url: 'https://www.sabah.com.tr/rss/spor.xml', language: 'tr', category: 'sports' },
  { name: 'Fanatik', url: 'https://www.fanatik.com.tr/rss.xml', language: 'tr', category: 'sports' },
  { name: 'Goal.com Türkiye', url: 'https://www.goal.com/tr/rss', language: 'tr', category: 'sports' },
  { name: 'Sozcusports', url: 'https://www.sozcu.com.tr/spor/rss/', language: 'tr', category: 'sports' },
  { name: 'A Spor', url: 'https://www.aspor.com.tr/rss/anasayfa.xml', language: 'tr', category: 'sports' },
  { name: 'TRT Spor', url: 'https://www.trtspor.com.tr/rss/anasayfa.xml', language: 'tr', category: 'sports' },

  // ── Türkçe Ekonomi ──────────────────────────────────────────────────────
  { name: 'Hürriyet Ekonomi', url: 'https://www.hurriyet.com.tr/rss/ekonomi', language: 'tr', category: 'business' },
  { name: 'Milliyet Ekonomi', url: 'https://ekonomi.milliyet.com.tr/rss/rssNew/ekonomiRss.xml', language: 'tr', category: 'business' },
  { name: 'BloombergHT', url: 'https://www.bloomberght.com/rss/ekonomi.xml', language: 'tr', category: 'business' },
  { name: 'Yatırım Finansal Haberler', url: 'https://www.yatirim.com.tr/rss', language: 'tr', category: 'business' },
  { name: 'Para.com.tr', url: 'https://www.para.com.tr/rss.xml', language: 'tr', category: 'business' },

  // ── Türkçe Sağlık ───────────────────────────────────────────────────────
  { name: 'Sağlık Haberleri', url: 'https://www.saglik.gov.tr/rss', language: 'tr', category: 'health' },
  { name: 'Medicana Sağlık', url: 'https://www.medicana.com.tr/haberler/rss', language: 'tr', category: 'health' },

  // ── Türkçe Teknoloji ────────────────────────────────────────────────────
  { name: 'Hürriyet Teknoloji', url: 'https://www.hurriyet.com.tr/rss/teknoloji', language: 'tr', category: 'technology' },
  { name: 'Kristal Soft', url: 'https://www.kristalsoft.com/rss', language: 'tr', category: 'technology' },
  { name: 'ShiftDelete.Net', url: 'https://shiftdelete.net/feed', language: 'tr', category: 'technology' },
  { name: 'DonanımHaber', url: 'https://www.donanimhaber.com/rss/tum/', language: 'tr', category: 'technology' },
  { name: 'Webtekno', url: 'https://www.webtekno.com/rss.xml', language: 'tr', category: 'technology' },

  // ── Türkçe Politika ─────────────────────────────────────────────────────
  { name: 'Hürriyet Politika', url: 'https://www.hurriyet.com.tr/rss/politika', language: 'tr', category: 'politics' },
  { name: 'Milliyet Politika', url: 'https://www.milliyet.com.tr/rss/rssNew/politikaRss.xml', language: 'tr', category: 'politics' },
  { name: 'Sabah Politika', url: 'https://www.sabah.com.tr/rss/politika.xml', language: 'tr', category: 'politics' },
  { name: 'Sözcü Politika', url: 'https://www.sozcu.com.tr/politika/rss/', language: 'tr', category: 'politics' },
  { name: 'T24', url: 'https://t24.com.tr/rss', language: 'tr', category: 'politics' },
  { name: 'Ensonhaber', url: 'http://www.ensonhaber.com/rss', language: 'tr', category: 'politics' },
  
  // ── Türkçe Magazin ──────────────────────────────────────────────────────
  { name: 'Hürriyet Yaşam', url: 'https://www.hurriyet.com.tr/rss/yasam', language: 'tr', category: 'entertainment' },
  { name: 'Sabah Yaşam', url: 'https://www.sabah.com.tr/rss/yasam.xml', language: 'tr', category: 'entertainment' },
  { name: 'Milliyet Yaşam', url: 'https://www.milliyet.com.tr/rss/rssNew/yasam.xml', language: 'tr', category: 'entertainment' },
  { name: 'Sözcü Yaşam', url: 'https://www.sozcu.com.tr/yasam/rss/', language: 'tr', category: 'entertainment' },
  { name: 'HaberTurk Yaşam', url: 'https://www.haberturk.com/yasam/rss.xml', language: 'tr', category: 'entertainment' },
  { name: 'Vatan Yaşam', url: 'https://www.gazetevatan.com/rss/yasam/', language: 'tr', category: 'entertainment' },
  
  // ── İngilizce ───────────────────────────────────────────────────────────
  { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', language: 'en', category: 'general' },
  { name: 'BBC Politics', url: 'https://feeds.bbci.co.uk/news/politics/rss.xml', language: 'en', category: 'politics' },
  { name: 'BBC Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', language: 'en', category: 'technology' },
  { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', language: 'en', category: 'business' },
  { name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml', language: 'en', category: 'sports' },
  { name: 'BBC Health', url: 'https://feeds.bbci.co.uk/news/health/rss.xml', language: 'en', category: 'health' },
  { name: 'Reuters', url: 'https://feeds.reuters.com/reuters/topNews', language: 'en', category: 'general' },
  { name: 'Reuters Politics', url: 'https://feeds.reuters.com/politics', language: 'en', category: 'politics' },
  // Deutsche Welle İngilizce
  { name: 'DW News', url: 'https://rss.dw.com/rdf/rss-en-all', language: 'en', category: 'general' },
  { name: 'DW Europe', url: 'https://rss.dw.com/rdf/rss-en-eu', language: 'en', category: 'general' },
  { name: 'DW Business', url: 'https://rss.dw.com/rdf/rss-en-bus', language: 'en', category: 'business' },
  // Spiegel International (İngilizce)
  { name: 'Spiegel International', url: 'https://www.spiegel.de/international/index.rss', language: 'en', category: 'general' },
  // İngilizce Magazin
  { name: 'BBC Entertainment', url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', language: 'en', category: 'entertainment' },
  { name: 'Guardian Entertainment', url: 'https://www.theguardian.com/entertainment/rss', language: 'en', category: 'entertainment' },
  { name: 'CNN Entertainment', url: 'http://rss.cnn.com/rss/edition_entertainment.rss', language: 'en', category: 'entertainment' },
  
  // ── Almanca ─────────────────────────────────────────────────────────────
  { name: 'DW Deutsch', url: 'https://rss.dw.com/rdf/rss-de-news', language: 'de', category: 'general' },
  { name: 'DW Sport', url: 'https://rss.dw.com/rdf/rss-de-sport', language: 'de', category: 'sports' },
  { name: 'DW Business', url: 'https://rss.dw.com/rdf/rss-de-bus', language: 'de', category: 'business' },
  { name: 'Tagesschau', url: 'https://www.tagesschau.de/xml/rss2/', language: 'de', category: 'general' },
  { name: 'Spiegel', url: 'https://www.spiegel.de/schlagzeilen/index.rss', language: 'de', category: 'general' },
  { name: 'Spiegel Wirtschaft', url: 'https://www.spiegel.de/wirtschaft/index.rss', language: 'de', category: 'business' },
];

// NewsAPI kategorileri
export const NEWS_API_CATEGORIES = [
  'business',
  'entertainment',
  'general',
  'health',
  'politics',
  'science',
  'sports',
  'technology',
];

// NewsAPI dilleri
export const NEWS_API_LANGUAGES = ['tr', 'en'];
