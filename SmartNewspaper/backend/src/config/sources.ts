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
  { name: 'Sabah', url: 'https://news.google.com/rss/search?q=site:sabah.com.tr&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'general' },
  { name: 'BBC Türkçe', url: 'https://feeds.bbci.co.uk/turkce/rss.xml', language: 'tr', category: 'general' },
  { name: 'NTV', url: 'https://www.ntv.com.tr/son-dakika.rss', language: 'tr', category: 'breaking' },
  { name: 'TRT Haber', url: 'https://news.google.com/rss/search?q=site:trthaber.com&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'general' },
  { name: 'Habertürk', url: 'https://www.haberturk.com/rss/manset.xml', language: 'tr', category: 'general' },
  { name: 'Cumhuriyet', url: 'https://www.cumhuriyet.com.tr/rss', language: 'tr', category: 'general' },
  { name: 'Gazete Duvar', url: 'https://www.gazeteduvar.com.tr/rss', language: 'tr', category: 'general' },
  { name: 'Karar', url: 'https://www.karar.com/rss', language: 'tr', category: 'general' },
  { name: 'Independent Türkçe', url: 'https://www.indyturk.com/rss.xml', language: 'tr', category: 'general' },
  { name: 'Diken', url: 'https://www.diken.com.tr/feed/', language: 'tr', category: 'general' },
  { name: 'Yeni Şafak', url: 'https://www.yenisafak.com/rss?xml=gundem', language: 'tr', category: 'general' },
  { name: 'Takvim', url: 'https://www.takvim.com.tr/rss/anasayfa.xml', language: 'tr', category: 'general' },
  { name: 'Türkiye Gazetesi', url: 'https://www.turkiyegazetesi.com.tr/feed', language: 'tr', category: 'general' },
  { name: 'Posta', url: 'https://www.posta.com.tr/rss/anasayfa.xml', language: 'tr', category: 'general' },
  { name: 'Birgun', url: 'https://www.birgun.net/rss/home', language: 'tr', category: 'general' },
  { name: 'Evrensel', url: 'https://www.evrensel.net/rss/haber.xml', language: 'tr', category: 'general' },
  { name: 'Dünya Gazetesi', url: 'https://www.dunya.com/rss', language: 'tr', category: 'general' },
  { name: 'CNN Türk', url: 'https://www.cnnturk.com/feed/rss/news', language: 'tr', category: 'general' },
  { name: 'A Haber', url: 'https://news.google.com/rss/search?q=site:ahaber.com.tr&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'general' },
  { name: 'TGRT Haber', url: 'https://www.tgrthaber.com/rss/manset', language: 'tr', category: 'general' },

  // ── Türkçe Spor ─────────────────────────────────────────────────────────
  { name: 'Hürriyet Spor', url: 'https://www.hurriyet.com.tr/rss/spor', language: 'tr', category: 'sports' },
  { name: 'Sabah Spor', url: 'https://news.google.com/rss/search?q=site:sabah.com.tr+spor&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'sports' },
  { name: 'Fanatik', url: 'https://news.google.com/rss/search?q=site:fanatik.com.tr&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'sports' },
  { name: 'Goal.com Türkiye', url: 'https://news.google.com/rss/search?q=site:goal.com/tr&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'sports' },
  { name: 'Sozcusports', url: 'https://news.google.com/rss/search?q=site:sozcu.com.tr+spor&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'sports' },
  { name: 'A Spor', url: 'https://news.google.com/rss/search?q=site:aspor.com.tr&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'sports' },
  { name: 'TRT Spor', url: 'https://news.google.com/rss/search?q=site:trtspor.com.tr&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'sports' },
  { name: 'Fotomaç', url: 'https://news.google.com/rss/search?q=site:fotomac.com.tr&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'sports' },
  { name: 'Sporx', url: 'https://news.google.com/rss/search?q=site:sporx.com&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'sports' },

  // ── Türkçe Ekonomi ──────────────────────────────────────────────────────
  { name: 'Hürriyet Ekonomi', url: 'https://www.hurriyet.com.tr/rss/ekonomi', language: 'tr', category: 'business' },
  { name: 'Milliyet Ekonomi', url: 'https://www.milliyet.com.tr/rss/rssNew/ekonomiRss.xml', language: 'tr', category: 'economy' },
  { name: 'BloombergHT', url: 'https://news.google.com/rss/search?q=site:bloomberght.com&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'business' },
  { name: 'Para.com.tr', url: 'https://news.google.com/rss/search?q=site:para.com.tr&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'business' },
  { name: 'Dünya Ekonomi', url: 'https://www.dunya.com/rss?dunya', language: 'tr', category: 'economy' },

  // ── Türkçe Sağlık ───────────────────────────────────────────────────────
  { name: 'NTV Sağlık', url: 'https://www.ntv.com.tr/saglik.rss', language: 'tr', category: 'health' },
  { name: 'Medicana Sağlık', url: 'https://news.google.com/rss/search?q=site:medicana.com.tr&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'health' },

  // ── Türkçe Teknoloji ────────────────────────────────────────────────────
  { name: 'Hürriyet Teknoloji', url: 'https://www.hurriyet.com.tr/rss/teknoloji', language: 'tr', category: 'technology' },
  { name: 'Kristal Soft', url: 'https://news.google.com/rss/search?q=site:kristalsoft.com&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'technology' },
  { name: 'ShiftDelete.Net', url: 'https://shiftdelete.net/feed', language: 'tr', category: 'technology' },
  { name: 'DonanımHaber', url: 'https://www.donanimhaber.com/rss/tum/', language: 'tr', category: 'technology' },
  { name: 'Webtekno', url: 'https://www.webtekno.com/rss.xml', language: 'tr', category: 'technology' },
  { name: 'Technopat', url: 'https://news.google.com/rss/search?q=site:technopat.net&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'technology' },
  { name: 'Chip Online', url: 'https://www.chip.com.tr/rss', language: 'tr', category: 'technology' },
  { name: 'Log', url: 'https://www.log.com.tr/feed/', language: 'tr', category: 'technology' },

  // ── Türkçe Politika ─────────────────────────────────────────────────────
  { name: 'Hürriyet Politika', url: 'https://news.google.com/rss/search?q=site:hurriyet.com.tr+politika&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'politics' },
  { name: 'Milliyet Politika', url: 'https://www.milliyet.com.tr/rss/rssNew/politikaRss.xml', language: 'tr', category: 'politics' },
  { name: 'Sabah Politika', url: 'https://news.google.com/rss/search?q=site:sabah.com.tr+politika&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'politics' },
  { name: 'Sözcü Politika', url: 'https://news.google.com/rss/search?q=site:sozcu.com.tr+politika&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'politics' },
  { name: 'T24', url: 'https://news.google.com/rss/search?q=site:t24.com.tr&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'politics' },
  { name: 'Ensonhaber', url: 'https://news.google.com/rss/search?q=site:ensonhaber.com&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'politics' },
  
  // ── Türkçe Magazin ──────────────────────────────────────────────────────
  { name: 'Hürriyet Yaşam', url: 'https://www.hurriyet.com.tr/rss/yasam', language: 'tr', category: 'entertainment' },
  { name: 'Sabah Yaşam', url: 'https://news.google.com/rss/search?q=site:sabah.com.tr+yasam&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'entertainment' },
  { name: 'Milliyet Yaşam', url: 'https://www.milliyet.com.tr/rss/rssNew/yasam.xml', language: 'tr', category: 'entertainment' },
  { name: 'Sözcü Yaşam', url: 'https://news.google.com/rss/search?q=site:sozcu.com.tr+yasam&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'entertainment' },
  { name: 'HaberTurk Yaşam', url: 'https://news.google.com/rss/search?q=site:haberturk.com+yasam&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'entertainment' },
  { name: 'Vatan Yaşam', url: 'https://news.google.com/rss/search?q=site:gazetevatan.com+yasam&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'entertainment' },
  
  // ── İngilizce ───────────────────────────────────────────────────────────
  { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', language: 'en', category: 'general' },
  { name: 'BBC Politics', url: 'https://feeds.bbci.co.uk/news/politics/rss.xml', language: 'en', category: 'politics' },
  { name: 'BBC Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', language: 'en', category: 'technology' },
  { name: 'The Guardian Technology', url: 'https://www.theguardian.com/uk/technology/rss', language: 'en', category: 'technology' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', language: 'en', category: 'technology' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', language: 'en', category: 'technology' },
  { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', language: 'en', category: 'business' },
  { name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml', language: 'en', category: 'sports' },
  { name: 'BBC Health', url: 'https://feeds.bbci.co.uk/news/health/rss.xml', language: 'en', category: 'health' },
  { name: 'Reuters', url: 'https://news.google.com/rss/search?q=site:reuters.com&hl=en-US&gl=US&ceid=US:en', language: 'en', category: 'general' },
  { name: 'Reuters Politics', url: 'https://news.google.com/rss/search?q=site:reuters.com+politics&hl=en-US&gl=US&ceid=US:en', language: 'en', category: 'politics' },
  // Deutsche Welle İngilizce
  { name: 'DW News', url: 'https://rss.dw.com/rdf/rss-en-all', language: 'en', category: 'general' },
  { name: 'DW Europe', url: 'https://rss.dw.com/rdf/rss-en-eu', language: 'en', category: 'general' },
  { name: 'DW Business', url: 'https://rss.dw.com/xml/rss-en-bus', language: 'en', category: 'business' },
  // Spiegel International (İngilizce)
  { name: 'Spiegel International', url: 'https://www.spiegel.de/international/index.rss', language: 'en', category: 'general' },
  { name: 'AP News', url: 'https://news.google.com/rss/search?q=site:apnews.com&hl=en-US&gl=US&ceid=US:en', language: 'en', category: 'general' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', language: 'en', category: 'general' },
  { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', language: 'en', category: 'general' },
  { name: 'Euronews', url: 'https://www.euronews.com/rss?format=mrss&level=theme&name=news', language: 'en', category: 'general' },
  { name: 'France 24', url: 'https://www.france24.com/en/rss', language: 'en', category: 'general' },
  { name: 'Sky News', url: 'https://feeds.skynews.com/feeds/rss/world.xml', language: 'en', category: 'general' },
  { name: 'The Guardian World', url: 'https://www.theguardian.com/world/rss', language: 'en', category: 'general' },
  // İngilizce Magazin
  { name: 'BBC Entertainment', url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', language: 'en', category: 'entertainment' },
  { name: 'CNN Entertainment', url: 'http://rss.cnn.com/rss/edition_entertainment.rss', language: 'en', category: 'entertainment' },
  
  // ── Almanca ─────────────────────────────────────────────────────────────
  { name: 'DW Deutsch', url: 'https://rss.dw.com/rdf/rss-de-news', language: 'de', category: 'general' },
  { name: 'DW Sport', url: 'https://rss.dw.com/rdf/rss-de-sport', language: 'de', category: 'sports' },
  { name: 'DW Business', url: 'https://news.google.com/rss/search?q=site:dw.com+wirtschaft&hl=de&gl=DE&ceid=DE:de', language: 'de', category: 'business' },
  { name: 'Tagesschau', url: 'https://www.tagesschau.de/xml/rss2/', language: 'de', category: 'general' },
  { name: 'Spiegel', url: 'https://www.spiegel.de/schlagzeilen/index.rss', language: 'de', category: 'general' },
  { name: 'Spiegel Wirtschaft', url: 'https://www.spiegel.de/wirtschaft/index.rss', language: 'de', category: 'business' },
  { name: 'ZDF Heute', url: 'https://www.zdf.de/rss/zdf/nachrichten', language: 'de', category: 'general' },
  { name: 'Die Zeit', url: 'https://newsfeed.zeit.de/index', language: 'de', category: 'general' },
  { name: 'Süddeutsche Zeitung', url: 'https://news.google.com/rss/search?q=site:sueddeutsche.de&hl=de&gl=DE&ceid=DE:de', language: 'de', category: 'general' },
  { name: 'FAZ', url: 'https://www.faz.net/rss/aktuell/', language: 'de', category: 'general' },
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
