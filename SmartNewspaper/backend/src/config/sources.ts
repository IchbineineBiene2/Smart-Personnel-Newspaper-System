export interface RssSource {
  name: string;
  url: string;
  language: string;
  category?: string;
  logoUrl?: string;
}

// Türkçe, İngilizce ve Almanca RSS kaynakları
export const RSS_SOURCES: RssSource[] = [
  // ── Türkçe Genel ────────────────────────────────────────────────────────
  { name: 'Hürriyet', url: 'https://www.hurriyet.com.tr/rss/anasayfa', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.hurriyet.com.tr' },
  { name: 'Milliyet', url: 'https://www.milliyet.com.tr/rss/rssNew/gundemRss.xml', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.milliyet.com.tr' },
  { name: 'Sabah', url: 'https://news.google.com/rss/search?q=site:sabah.com.tr&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.sabah.com.tr' },
  { name: 'BBC Türkçe', url: 'https://feeds.bbci.co.uk/turkce/rss.xml', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.bbc.com/turkce' },
  { name: 'NTV', url: 'https://www.ntv.com.tr/son-dakika.rss', language: 'tr', category: 'breaking', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.ntv.com.tr' },
  { name: 'TRT Haber', url: 'https://news.google.com/rss/search?q=site:trthaber.com&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.trthaber.com' },
  { name: 'Habertürk', url: 'https://www.haberturk.com/rss/manset.xml', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.haberturk.com' },
  { name: 'Cumhuriyet', url: 'https://www.cumhuriyet.com.tr/rss', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.cumhuriyet.com.tr' },
  { name: 'Gazete Duvar', url: 'https://www.gazeteduvar.com.tr/rss', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.gazeteduvar.com.tr' },
  { name: 'Karar', url: 'https://www.karar.com/rss', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.karar.com' },
  { name: 'Independent Türkçe', url: 'https://www.indyturk.com/rss.xml', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.indyturk.com' },
  { name: 'Diken', url: 'https://www.diken.com.tr/feed/', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.diken.com.tr' },
  { name: 'Yeni Şafak', url: 'https://www.yenisafak.com/rss?xml=gundem', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.yenisafak.com' },
  { name: 'Takvim', url: 'https://www.takvim.com.tr/rss/anasayfa.xml', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.takvim.com.tr' },
  { name: 'Türkiye Gazetesi', url: 'https://www.turkiyegazetesi.com.tr/feed', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.turkiyegazetesi.com.tr' },
  { name: 'Posta', url: 'https://www.posta.com.tr/rss/anasayfa.xml', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.posta.com.tr' },
  { name: 'Birgun', url: 'https://www.birgun.net/rss/home', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.birgun.net' },
  { name: 'Evrensel', url: 'https://www.evrensel.net/rss/haber.xml', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.evrensel.net' },
  { name: 'Dünya Gazetesi', url: 'https://www.dunya.com/rss', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.dunya.com' },
  { name: 'CNN Türk', url: 'https://www.cnnturk.com/feed/rss/news', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.cnnturk.com' },
  { name: 'A Haber', url: 'https://news.google.com/rss/search?q=site:ahaber.com.tr&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.ahaber.com.tr' },
  { name: 'TGRT Haber', url: 'https://www.tgrthaber.com/rss/manset', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.tgrthaber.com' },
  
  // ── YENİ EKLENEN TÜRKÇE KAYNAKLAR ─────────────────────────────────────────
  { name: 'Haberler.com', url: 'https://rss.haberler.com/rss.asp', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.haberler.com' },
  { name: 'Onedio', url: 'https://onedio.com/support/rss.xml', language: 'tr', category: 'entertainment', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://onedio.com' },
  { name: 'T24', url: 'https://t24.com.tr/rss', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://t24.com.tr' },
  { name: 'Sözcü', url: 'https://www.sozcu.com.tr/rss/tum-haberler.xml', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.sozcu.com.tr' },
  { name: 'Bundle', url: 'https://www.bundle.app/rss', language: 'tr', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.bundle.app' },
  
  // ── Türkçe Spor ─────────────────────────────────────────────────────────
  { name: 'Hürriyet Spor', url: 'https://www.hurriyet.com.tr/rss/spor', language: 'tr', category: 'sports', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.hurriyet.com.tr' },
  { name: 'Sabah Spor', url: 'https://news.google.com/rss/search?q=site:sabah.com.tr+spor&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'sports', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.sabah.com.tr' },
  { name: 'Fanatik', url: 'https://news.google.com/rss/search?q=site:fanatik.com.tr&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'sports', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.fanatik.com.tr' },
  { name: 'Goal.com Türkiye', url: 'https://news.google.com/rss/search?q=site:goal.com/tr&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'sports', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.goal.com' },
  { name: 'Sozcusports', url: 'https://news.google.com/rss/search?q=site:sozcu.com.tr+spor&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'sports', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.sozcu.com.tr' },
  { name: 'A Spor', url: 'https://news.google.com/rss/search?q=site:aspor.com.tr&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'sports', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.aspor.com.tr' },
  { name: 'TRT Spor', url: 'https://news.google.com/rss/search?q=site:trtspor.com.tr&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'sports', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.trtspor.com.tr' },
  { name: 'Fotomaç', url: 'https://news.google.com/rss/search?q=site:fotomac.com.tr&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'sports', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.fotomac.com.tr' },
  { name: 'Sporx', url: 'https://news.google.com/rss/search?q=site:sporx.com&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'sports', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.sporx.com' },
  { name: 'NTV Spor', url: 'https://www.ntvspor.net/rss', language: 'tr', category: 'sports', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.ntvspor.net' },

  // ── Türkçe Ekonomi ──────────────────────────────────────────────────────
  { name: 'Hürriyet Ekonomi', url: 'https://www.hurriyet.com.tr/rss/ekonomi', language: 'tr', category: 'business', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.hurriyet.com.tr' },
  { name: 'Milliyet Ekonomi', url: 'https://www.milliyet.com.tr/rss/rssNew/ekonomiRss.xml', language: 'tr', category: 'economy', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.milliyet.com.tr' },
  { name: 'BloombergHT', url: 'https://news.google.com/rss/search?q=site:bloomberght.com&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'business', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.bloomberght.com' },
  { name: 'Para.com.tr', url: 'https://news.google.com/rss/search?q=site:para.com.tr&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'business', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.para.com.tr' },
  { name: 'Dünya Ekonomi', url: 'https://www.dunya.com/rss?dunya', language: 'tr', category: 'economy', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.dunya.com' },

  // ── Türkçe Sağlık ───────────────────────────────────────────────────────
  { name: 'NTV Sağlık', url: 'https://www.ntv.com.tr/saglik.rss', language: 'tr', category: 'health', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.ntv.com.tr' },
  { name: 'Medicana Sağlık', url: 'https://news.google.com/rss/search?q=site:medicana.com.tr&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'health', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.medicana.com.tr' },

  // ── Türkçe Teknoloji ────────────────────────────────────────────────────
  { name: 'Hürriyet Teknoloji', url: 'https://www.hurriyet.com.tr/rss/teknoloji', language: 'tr', category: 'technology', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.hurriyet.com.tr' },
  { name: 'Kristal Soft', url: 'https://news.google.com/rss/search?q=site:kristalsoft.com&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'technology', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://kristalsoft.com' },
  { name: 'ShiftDelete.Net', url: 'https://shiftdelete.net/feed', language: 'tr', category: 'technology', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://shiftdelete.net' },
  { name: 'DonanımHaber', url: 'https://www.donanimhaber.com/rss/tum/', language: 'tr', category: 'technology', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.donanimhaber.com' },
  { name: 'Webtekno', url: 'https://www.webtekno.com/rss.xml', language: 'tr', category: 'technology', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.webtekno.com' },
  { name: 'Technopat', url: 'https://news.google.com/rss/search?q=site:technopat.net&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'technology', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.technopat.net' },
  { name: 'Chip Online', url: 'https://www.chip.com.tr/rss', language: 'tr', category: 'technology', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.chip.com.tr' },
  { name: 'Log', url: 'https://www.log.com.tr/feed/', language: 'tr', category: 'technology', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.log.com.tr' },

  // ── Türkçe Politika ─────────────────────────────────────────────────────
  { name: 'Hürriyet Politika', url: 'https://news.google.com/rss/search?q=site:hurriyet.com.tr+politika&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'politics', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.hurriyet.com.tr' },
  { name: 'Milliyet Politika', url: 'https://www.milliyet.com.tr/rss/rssNew/politikaRss.xml', language: 'tr', category: 'politics', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.milliyet.com.tr' },
  { name: 'Sabah Politika', url: 'https://news.google.com/rss/search?q=site:sabah.com.tr+politika&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'politics', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.sabah.com.tr' },
  { name: 'Sözcü Politika', url: 'https://news.google.com/rss/search?q=site:sozcu.com.tr+politika&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'politics', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.sozcu.com.tr' },
  { name: 'T24 Politika', url: 'https://news.google.com/rss/search?q=site:t24.com.tr&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'politics', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://t24.com.tr' },
  { name: 'Ensonhaber', url: 'https://news.google.com/rss/search?q=site:ensonhaber.com&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'politics', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.ensonhaber.com' },
  
  // ── Türkçe Magazin ──────────────────────────────────────────────────────
  { name: 'Hürriyet Yaşam', url: 'https://www.hurriyet.com.tr/rss/yasam', language: 'tr', category: 'entertainment', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.hurriyet.com.tr' },
  { name: 'Sabah Yaşam', url: 'https://news.google.com/rss/search?q=site:sabah.com.tr+yasam&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'entertainment', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.sabah.com.tr' },
  { name: 'Milliyet Yaşam', url: 'https://www.milliyet.com.tr/rss/rssNew/yasam.xml', language: 'tr', category: 'entertainment', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.milliyet.com.tr' },
  { name: 'Sözcü Yaşam', url: 'https://news.google.com/rss/search?q=site:sozcu.com.tr+yasam&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'entertainment', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.sozcu.com.tr' },
  { name: 'HaberTurk Yaşam', url: 'https://news.google.com/rss/search?q=site:haberturk.com+yasam&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'entertainment', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.haberturk.com' },
  { name: 'Vatan Yaşam', url: 'https://news.google.com/rss/search?q=site:gazetevatan.com+yasam&hl=tr&gl=TR&ceid=TR:tr', language: 'tr', category: 'entertainment', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.gazetevatan.com' },
  
  // ── İngilizce ───────────────────────────────────────────────────────────
  { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', language: 'en', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.bbc.com' },
  { name: 'BBC Politics', url: 'https://feeds.bbci.co.uk/news/politics/rss.xml', language: 'en', category: 'politics', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.bbc.com' },
  { name: 'BBC Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', language: 'en', category: 'technology', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.bbc.com' },
  { name: 'The Guardian Technology', url: 'https://www.theguardian.com/uk/technology/rss', language: 'en', category: 'technology', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.theguardian.com' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', language: 'en', category: 'technology', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://arstechnica.com' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', language: 'en', category: 'technology', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://techcrunch.com' },
  { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', language: 'en', category: 'business', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.bbc.com' },
  { name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml', language: 'en', category: 'sports', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.bbc.com' },
  { name: 'BBC Health', url: 'https://feeds.bbci.co.uk/news/health/rss.xml', language: 'en', category: 'health', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.bbc.com' },
  { name: 'Reuters', url: 'https://news.google.com/rss/search?q=site:reuters.com&hl=en-US&gl=US&ceid=US:en', language: 'en', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.reuters.com' },
  { name: 'Reuters Politics', url: 'https://news.google.com/rss/search?q=site:reuters.com+politics&hl=en-US&gl=US&ceid=US:en', language: 'en', category: 'politics', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.reuters.com' },
  // Deutsche Welle İngilizce
  { name: 'DW News', url: 'https://rss.dw.com/rdf/rss-en-all', language: 'en', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.dw.com' },
  { name: 'DW Europe', url: 'https://rss.dw.com/rdf/rss-en-eu', language: 'en', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.dw.com' },
  { name: 'DW Business', url: 'https://rss.dw.com/xml/rss-en-bus', language: 'en', category: 'business', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.dw.com' },
  // Spiegel International (İngilizce)
  { name: 'Spiegel International', url: 'https://www.spiegel.de/international/index.rss', language: 'en', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.spiegel.de' },
  { name: 'AP News', url: 'https://news.google.com/rss/search?q=site:apnews.com&hl=en-US&gl=US&ceid=US:en', language: 'en', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://apnews.com' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', language: 'en', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.aljazeera.com' },
  { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', language: 'en', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.npr.org' },
  { name: 'Euronews', url: 'https://www.euronews.com/rss?format=mrss&level=theme&name=news', language: 'en', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.euronews.com' },
  { name: 'France 24', url: 'https://www.france24.com/en/rss', language: 'en', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.france24.com' },
  { name: 'Sky News', url: 'https://feeds.skynews.com/feeds/rss/world.xml', language: 'en', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://news.sky.com' },
  { name: 'The Guardian World', url: 'https://www.theguardian.com/world/rss', language: 'en', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.theguardian.com' },
  // İngilizce Magazin
  { name: 'BBC Entertainment', url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', language: 'en', category: 'entertainment', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.bbc.com' },
  { name: 'CNN Entertainment', url: 'http://rss.cnn.com/rss/edition_entertainment.rss', language: 'en', category: 'entertainment', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://edition.cnn.com' },
  
  // ── Almanca ─────────────────────────────────────────────────────────────
  { name: 'DW Deutsch', url: 'https://rss.dw.com/rdf/rss-de-news', language: 'de', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.dw.com' },
  { name: 'DW Sport', url: 'https://rss.dw.com/rdf/rss-de-sport', language: 'de', category: 'sports', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.dw.com' },
  { name: 'DW Business', url: 'https://news.google.com/rss/search?q=site:dw.com+wirtschaft&hl=de&gl=DE&ceid=DE:de', language: 'de', category: 'business', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.dw.com' },
  { name: 'Tagesschau', url: 'https://www.tagesschau.de/xml/rss2/', language: 'de', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.tagesschau.de' },
  { name: 'Spiegel', url: 'https://www.spiegel.de/schlagzeilen/index.rss', language: 'de', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.spiegel.de' },
  { name: 'Spiegel Wirtschaft', url: 'https://www.spiegel.de/wirtschaft/index.rss', language: 'de', category: 'business', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.spiegel.de' },
  { name: 'ZDF Heute', url: 'https://www.zdf.de/rss/zdf/nachrichten', language: 'de', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.zdf.de' },
  { name: 'Die Zeit', url: 'https://newsfeed.zeit.de/index', language: 'de', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.zeit.de' },
  { name: 'Süddeutsche Zeitung', url: 'https://news.google.com/rss/search?q=site:sueddeutsche.de&hl=de&gl=DE&ceid=DE:de', language: 'de', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.sueddeutsche.de' },
  { name: 'FAZ', url: 'https://www.faz.net/rss/aktuell/', language: 'de', category: 'general', logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://www.faz.net' },
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
