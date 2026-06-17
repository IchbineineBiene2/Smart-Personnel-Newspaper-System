import { Platform } from 'react-native';
import { ContentCategory } from './content';

// Web (Docker/nginx): relative URL — nginx /api → backend:3000 proxy'si kullanır
// Android emülatör: 10.0.2.2, iOS/geliştirme: localhost
const API_BASE =
  Platform.OS === 'web'
    ? 'http://localhost:3000'
    : Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';

export interface ApiArticle {
  id: string;
  title: string;
  description: string;
  content?: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
  source: {
    id?: string;
    name: string;
    url: string;
    type: 'newsapi' | 'rss' | 'scraper';
    logoUrl?: string;
  };
  category?: string;
  language: string;
  likeCount?: number;
  viewCount?: number;
}

export function decodeHtmlEntities(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&#34;/g, '"')
    .replace(/&#034;/g, '"');
}

export function extractImageUrl(a: any): string | undefined {
  if (!a) return undefined;
  let url = a.imageUrl || a.image || a.urlToImage || a.thumbnail || a.media || a['og:image'] || a['twitter:image'];
  if (!url && a.enclosure && a.enclosure.url) {
    url = a.enclosure.url;
  }
  
  if (typeof url === 'string' && url.trim().length > 0) {
    if (url.startsWith('//')) {
      return `https:${url}`;
    } else if (url.startsWith('/')) {
      try {
        const sourceUrl = new URL(a.url);
        return `${sourceUrl.origin}${url}`;
      } catch {
        return url;
      }
    }
    return url;
  }
  return undefined;
}

export function cleanArticle<T extends { title?: string; description?: string; id?: string }>(a: T): T {
  if (!a) return a;

  const extractedImage = extractImageUrl(a);

  if (process.env.NODE_ENV !== 'production' && !extractedImage) {
    console.log(`[Image Check] No image found for article: ${a.title?.substring(0, 30)}... (ID: ${a.id || 'unknown'})`);
  }

  return {
    ...a,
    title: decodeHtmlEntities(a.title) as any,
    description: decodeHtmlEntities(a.description) as any,
    imageUrl: extractedImage,
  };
}

export interface ArticleAiAnalysis {
  available: boolean;
  message?: string;
  summary: string;
  keyPoints: string[];
  context: string;
  perspectives: string[];
  risks: string[];
  questions: string[];
  confidence: 'low' | 'medium' | 'high';
}

interface FetchNewsParams {
  language?: string;
  category?: string;
  source?: string;
  limit?: number;
  offset?: number;
}

// Backend kategori → Uygulama kategorisi eşleşmesi (sadece özgün kategoriler)
const CATEGORY_MAP: Record<string, ContentCategory> = {
  technology: 'Teknoloji',
  science: 'Bilim',
  sports: 'Spor',
  business: 'Ekonomi',
  economy: 'Ekonomi',
  health: 'Saglik',
  entertainment: 'Magazin',
  politics: 'Siyaset',
  education: 'Eğitim',
  environment: 'Çevre',
  general: 'Genel',    // Genel haberler → metin analizine bırak
  breaking: 'Genel',   // Son dakika → metin analizine bırak
};

// Başlık / açıklama metninden anahtar kelime ile kategori çıkarımı
const CATEGORY_KEYWORDS: Record<ContentCategory, string[]> = {
  Siyaset: [
    // TR - Liderler
    'erdoğan', 'kılıçdaroğlu', 'akşener', 'bahçeli', 'babacan', 'demirtaş', 'davutoğlu',
    // TR - Makamlar
    'cumhurbaşkanı', 'cumhurbaşkanlığı', 'başbakan', 'başbakanlık',
    'milletvekili', 'meclis', 'tbmm', 'belediye başkanı', 'vali', 'valilik',
    'bakan', 'bakanlık', 'bakanlığı', 'bakanlar kurulu',
    'hükümet', 'kabine', 'muhalefet',
    // TR - Partiler
    'ak parti', 'akp', 'chp', 'mhp', 'iyi parti', 'hdp', 'dem parti',
    'saadet partisi',
    // TR - Seçim/Diplomasi
    'seçim', 'genel seçim', 'yerel seçim', 'referandum', 'oy', 'sandık',
    'dışişleri', 'anlaşma', 'koalisyon', 'yaptırım',
    // EN
    'trump', 'biden', 'putin', 'zelensky', 'macron', 'scholz',
    'president', 'prime minister', 'parliament', 'congress', 'senate',
    'election', 'elections', 'electoral', 'politics', 'political', 'politician',
    'vote', 'voting', 'voter', 'legislation', 'legislative',
    'sanctions', 'embargo', 'diplomacy', 'diplomatic', 'ambassador',
    'government', 'cabinet', 'opposition',
    // DE
    'kanzler', 'bundeskanzler', 'bundestag', 'bundesrat', 'bundesregierung',
    'wahl', 'wahlkampf', 'koalition', 'politik', 'politisch', 'politiker',
    'partei', 'diplomatie',
  ],
  Dünya: [
    // TR - Ülkeler / Uluslararası
    'abd', 'amerika', 'rusya', 'çin', 'iran', 'irak', 'suriye', 'ukrayna',
    'filistin', 'gazze', 'lübnan', 'afganistan', 'pakistan', 'mısır',
    'israil', 'fransa', 'almanya', 'ingiltere', 'japonya', 'hindistan',
    'birleşmiş milletler', 'bm', 'nato', 'ab', 'avrupa birliği',
    'uluslararası', 'dünya genelinde', 'küresel',
    'savaş', 'çatışma', 'ateşkes', 'barış görüşmeleri', 'barış süreci',
    'göç', 'göçmen', 'mülteci', 'sığınmacı',
    // EN
    'united states', 'russia', 'china', 'iran', 'iraq', 'syria', 'ukraine',
    'palestine', 'gaza', 'lebanon', 'afghanistan', 'israel',
    'united nations', 'nato', 'european union',
    'international', 'worldwide', 'global',
    'war', 'conflict', 'ceasefire', 'peace talks', 'peace process',
    'migration', 'migrant', 'refugee', 'asylum',
    // DE
    'vereinte nationen', 'europäische union', 'international',
    'krieg', 'konflikt', 'waffenstillstand', 'friedensverhandlungen',
    'migration', 'flüchtling', 'asyl',
  ],
  Ekonomi: [
    // TR - Finans/Piyasa/Ticaret
    'borsa', 'dolar', 'euro', 'sterlin', 'faiz', 'faiz oranı',
    'enflasyon', 'deflasyon', 'ekonomi', 'ekonomik', 'ekonomist',
    'bütçe', 'ticaret', 'ticari',
    'bitcoin', 'kripto', 'kripto para', 'altcoin',
    'piyasa', 'hisse', 'hisse senedi',
    'yatırım', 'yatırımcı', 'ihracat', 'ithalat',
    'döviz kuru', 'merkez bankası', 'tcmb',
    'vergi', 'kdv', 'gelir vergisi', 'kurumlar vergisi',
    'kredi', 'banka', 'bankacılık',
    'resesyon', 'ekonomik kriz', 'büyüme', 'gsyh',
    'şirket', 'kâr', 'kârlılık', 'ciro',
    'fiyat artışı', 'fiyat düşüşü', 'zam',
    'gayrimenkul', 'emlak', 'inşaat',
    'petrol', 'petrol fiyatı', 'doğalgaz fiyatı',
    // EN
    'stock market', 'wall street', 'inflation', 'economy', 'economic',
    'budget', 'trade', 'commerce', 'dollar', 'currency', 'forex',
    'crypto', 'cryptocurrency', 'bitcoin', 'ethereum',
    'investment', 'investor', 'export', 'import',
    'interest rate', 'central bank', 'federal reserve',
    'stock', 'bond', 'shares',
    'tax', 'taxation', 'credit', 'banking',
    'recession', 'gdp', 'profit', 'revenue',
    'real estate', 'property', 'housing',
    // DE
    'wirtschaft', 'wirtschaftlich', 'börse', 'finanzmarkt',
    'haushalt', 'handel', 'bank', 'banken', 'zentralbank',
    'steuer', 'steuerpolitik', 'konjunktur',
    'unternehmen', 'gewinn', 'umsatz',
    'immobilien', 'wohnungsbau',
  ],
  Spor: [
    // TR - Futbol
    'futbol', 'futbolcu', 'maç', 'maçı', 'maçında', 'gol', 'golü',
    'şampiyon', 'şampiyonluk', 'lig', 'süper lig',
    'transfer', 'transferler', 'kulüp', 'antrenör', 'hakem',
    'kaleci', 'sezon', 'turnuva', 'derbi', 'takım',
    'dünya kupası', 'şampiyonlar ligi',
    'galatasaray', 'fenerbahçe', 'beşiktaş', 'trabzonspor',
    // TR - Diğer sporlar
    'basketbol', 'voleybol', 'tenis', 'formula', 'f1',
    'yüzme', 'güreş', 'boks', 'atletizm', 'maraton',
    'olimpiyat', 'olimpik', 'milli takım',
    'spor', 'sporcu', 'stadyum', 'antrenman', 'taraftar',
    // EN
    'football', 'soccer', 'goal', 'league',
    'premier league', 'la liga', 'bundesliga', 'champions league',
    'world cup', 'tournament', 'championship', 'champion',
    'basketball', 'nba', 'volleyball', 'tennis', 'cricket',
    'boxing', 'wrestling', 'swimming', 'athletics',
    'olympics', 'olympic', 'medal', 'sports', 'athlete',
    'formula 1', 'f1', 'racing',
    // DE
    'fußball', 'fußballspieler', 'tor', 'mannschaft',
    'meisterschaft', 'pokal',
    'basketball', 'tennis', 'leichtathletik',
    'olympische spiele', 'sport', 'sportlich',
  ],
  Teknoloji: [
    // TR
    'teknoloji', 'teknolojik', 'dijital', 'dijitalleşme',
    'yazılım', 'yazılımcı', 'programlama',
    'yapay zeka', 'chatgpt', 'gpt', 'copilot',
    'siber', 'siber saldırı', 'siber güvenlik',
    'robot', 'robotik',
    'iphone', 'android', 'akıllı telefon', 'smartphone',
    'chip', 'gpu', 'cpu', 'işlemci', 'grafik kartı',
    '5g', 'wifi', 'bluetooth',
    'microsoft', 'google', 'apple', 'amazon', 'meta',
    'nvidia', 'amd', 'intel',
    'startup', 'girişim',
    'blockchain', 'nft', 'web3',
    'elektrikli araç', 'otonom araç', 'tesla',
    'dron', 'drone', 'insansız hava aracı',
    'sanal gerçeklik', 'metaverse',
    // EN
    'technology', 'tech', 'software', 'app', 'application',
    'artificial intelligence', 'machine learning', 'deep learning',
    'cyber', 'cybersecurity', 'robotics', 'automation',
    'smartphone', 'iphone', 'android',
    'chip', 'gpu', 'cpu', 'processor',
    'microsoft', 'google', 'apple', 'nvidia', 'intel', 'amd',
    'startup', 'innovation',
    'blockchain', 'nft', 'web3',
    'electric vehicle', 'autonomous', 'drone',
    'virtual reality', 'augmented reality', 'metaverse',
    'coding', 'programming', 'developer',
    // DE
    'technologie', 'technik', 'digitalisierung',
    'künstliche intelligenz', 'cybersicherheit',
    'roboter', 'automatisierung', 'softwareentwicklung',
  ],
  Bilim: [
    // TR
    'bilim', 'bilimsel', 'bilim insanı', 'araştırma', 'araştırmacı',
    'uzay', 'uzay aracı', 'uzay istasyonu', 'uzay yürüyüşü',
    'nasa', 'spacex', 'esa', 'roket', 'uydu', 'mars', 'ay',
    'fizik', 'kimya', 'biyoloji', 'matematik',
    'gen', 'genetik', 'dna', 'genom',
    'fosil', 'arkeoloji', 'arkeolog', 'kazı',
    'keşif', 'keşfedildi', 'icat', 'buluş',
    'laboratuvar', 'deney', 'hipotez', 'teori',
    'evren', 'galaksi', 'yıldız', 'gezegen', 'kara delik',
    'atom', 'molekül', 'parçacık', 'kuantum',
    // EN
    'science', 'scientific', 'scientist', 'research', 'researcher',
    'space', 'spacecraft', 'space station',
    'nasa', 'spacex', 'rocket', 'satellite', 'mars', 'moon',
    'physics', 'chemistry', 'biology',
    'gene', 'genetic', 'dna', 'genome',
    'fossil', 'archaeology', 'archaeologist',
    'discovery', 'invention', 'breakthrough',
    'laboratory', 'experiment', 'hypothesis', 'theory',
    'universe', 'galaxy', 'planet', 'black hole',
    'atom', 'molecule', 'particle', 'quantum',
    // DE
    'wissenschaft', 'wissenschaftlich', 'forscher', 'forschung',
    'weltraum', 'raumfahrt', 'rakete', 'satellit',
    'physik', 'chemie', 'biologie',
    'entdeckung', 'erfindung', 'durchbruch',
    'labor', 'experiment',
  ],
  Saglik: [
    // TR
    'sağlık', 'sağlık bakanlığı', 'sağlık hizmeti',
    'doktor', 'hemşire', 'cerrah', 'hastane', 'klinik',
    'ilaç', 'ilaçlar', 'eczane', 'reçete',
    'tedavi', 'tedavisi', 'ameliyat', 'ameliyata',
    'hastalık', 'hastalığı', 'hasta',
    'koronavirüs', 'covid', 'pandemi', 'aşı', 'aşılama',
    'grip', 'influenza', 'virüs',
    'kanser', 'kanser tedavisi', 'onkoloji',
    'diyabet', 'şeker hastalığı', 'tansiyon',
    'kalp', 'kalp krizi', 'kardiyoloji',
    'felç', 'beyin kanaması',
    'depresyon', 'anksiyete', 'psikiyatri', 'psikoloji',
    'obezite', 'beslenme', 'diyet',
    'organ nakli', 'transplant',
    // EN
    'health', 'healthcare', 'doctor', 'physician',
    'nurse', 'surgeon', 'hospital', 'clinic',
    'medicine', 'medication', 'drug', 'pharmacy',
    'treatment', 'surgery', 'surgical',
    'disease', 'illness', 'patient',
    'coronavirus', 'covid', 'pandemic', 'vaccine', 'vaccination',
    'cancer', 'tumor', 'oncology', 'chemotherapy',
    'diabetes', 'cardiac', 'cardiology', 'stroke',
    'mental health', 'depression', 'anxiety', 'psychiatry',
    'obesity', 'nutrition',
    // DE
    'gesundheit', 'gesundheitswesen', 'arzt', 'krankenhaus',
    'medikament', 'behandlung', 'krankheit',
    'impfung', 'impfstoff', 'krebs', 'therapie',
    'diabetes', 'herzinfarkt', 'depression',
  ],
  Eğitim: [
    // TR
    'eğitim', 'eğitim bakanlığı', 'milli eğitim',
    'öğretmen', 'öğretmenler', 'öğretmenlik',
    'öğrenci', 'öğrenciler', 'öğrencilik',
    'okul', 'okullar', 'lise', 'liseler', 'ilkokul', 'ortaokul',
    'üniversite', 'üniversiteler', 'fakülte', 'akademi',
    'sınav', 'sınava', 'sınavlar', 'yks', 'lgs', 'kpss', 'ales',
    'müfredat', 'ders', 'dersler', 'ders programı',
    'mezuniyet', 'diploma', 'sertifika',
    'burs', 'burslar', 'öğrenci bursu',
    'seminer', 'seminerleri', 'çevrim içi eğitim',
    'tatil', 'yaz tatili', 'sömestr',
    'yök', 'meb', 'talim terbiye kurulu',
    'rektör', 'dekan', 'müdür',
    // EN
    'education', 'educational', 'school', 'schools',
    'teacher', 'teachers', 'teaching',
    'student', 'students', 'university', 'college',
    'exam', 'examination', 'curriculum',
    'graduation', 'diploma', 'scholarship',
    'classroom', 'lecture', 'seminar',
    // DE
    'bildung', 'schule', 'schulen', 'lehrer',
    'schüler', 'studenten', 'universität',
    'prüfung', 'unterricht', 'lehrplan',
    'abschluss', 'stipendium',
  ],
  Çevre: [
    // TR
    'çevre', 'çevresel', 'çevre bakanlığı', 'çevre koruma',
    'iklim', 'iklim değişikliği', 'iklim krizi', 'küresel ısınma',
    'karbon', 'karbon ayak izi', 'karbon emisyon', 'sera gazı',
    'geri dönüşüm', 'geri dönüştürme', 'plastik şişe',
    'sıfır atık', 'atık yönetimi', 'çöp',
    'yenilenebilir enerji', 'güneş enerjisi', 'rüzgar enerjisi',
    'orman', 'ormancılık', 'ağaçlandırma', 'orman yangını',
    'hava kirliliği', 'su kirliliği', 'çevre kirliliği',
    'sürdürülebilirlik', 'sürdürülebilir',
    'doğa', 'doğal yaşam', 'biyoçeşitlilik', 'ekosistem',
    'nesli tükenmekte', 'hayvan hakları',
    'enerji tasarrufu', 'yeşil enerji',
    // EN
    'environment', 'environmental', 'climate', 'climate change',
    'global warming', 'greenhouse gas', 'carbon', 'carbon footprint',
    'recycling', 'recycle', 'zero waste', 'waste management',
    'renewable energy', 'solar energy', 'wind energy',
    'deforestation', 'reforestation', 'forest fire', 'wildfire',
    'pollution', 'air pollution', 'water pollution',
    'sustainability', 'sustainable', 'biodiversity', 'ecosystem',
    'endangered species', 'conservation',
    // DE
    'umwelt', 'umweltschutz', 'klimawandel', 'klimakrise',
    'recycling', 'erneuerbare energie', 'nachhaltigkeit',
    'entwaldung', 'verschmutzung', 'naturschutz',
  ],
  Kultur: [
    // TR - Sanat/Film/Müzik/Tiyatro/Edebiyat
    'sanat', 'sanatçı', 'sergi', 'galeri', 'müze',
    'resim', 'heykel', 'ressam',
    'film', 'filmi', 'sinema', 'yönetmen', 'senarist',
    'yapımcı', 'fragman', 'oscar', 'cannes',
    'müzik', 'müzisyen', 'şarkıcı', 'konser', 'albüm',
    'orkestra', 'opera', 'bale',
    'tiyatro', 'sahne',
    'edebiyat', 'kitap', 'yazar', 'roman', 'şiir', 'şair',
    'ödül', 'ödülleri', 'nobel', 'grammy',
    'festival', 'kültür', 'kültürel',
    // EN
    'art', 'artist', 'museum', 'gallery', 'exhibition',
    'cinema', 'director', 'screenplay',
    'music', 'musician', 'concert', 'album',
    'orchestra', 'opera', 'ballet',
    'theater', 'theatre', 'performance',
    'literature', 'author', 'writer', 'novel', 'poetry',
    'oscar', 'grammy', 'festival',
    'culture', 'cultural',
    // DE
    'kunst', 'künstler', 'museum', 'galerie', 'ausstellung',
    'kino', 'regisseur',
    'musik', 'musiker', 'konzert',
    'theater', 'theaterstück',
    'literatur', 'autor', 'roman',
    'kultur', 'kulturell',
  ],
  Magazin: [
    // TR - Ünlüler
    'ünlü', 'ünlüleri', 'ünlü oyuncu',
    'süperstar', 'manken',
    'influencer', 'youtuber', 'tiktoker',
    'boşandı', 'boşanma', 'ayrılık', 'evlilik', 'nikah', 'düğün',
    'aşk', 'çift', 'sevgili', 'flört',
    'paparazzi', 'dedikodu',
    'güzellik', 'estetik', 'botoks',
    'moda', 'defile', 'podyum',
    'makyaj', 'kozmetik',
    // EN
    'celebrity', 'celebrities', 'gossip',
    'famous', 'supermodel',
    'influencer', 'youtuber',
    'divorced', 'divorce', 'wedding', 'marriage',
    'romance', 'dating', 'couple',
    'paparazzi', 'red carpet',
    'beauty', 'cosmetic', 'botox',
    'fashion', 'haute couture', 'runway',
    'makeup', 'hairstyle',
    // DE
    'promi', 'prominente', 'klatsch',
    'scheidung', 'hochzeit',
    'mode', 'schönheit',
  ],
  Asayiş: [
    // TR
    'polis', 'emniyet', 'emniyet müdürlüğü',
    'gözaltı', 'gözaltına', 'tutuklandı', 'tutuklama',
    'şok arananlar', 'aranan şahıs', 'aranan kişi',
    'operasyon', 'baskın',
    'jandarma', 'jandarma komutanlığı',
    'suç', 'suçlu', 'cinayet', 'cinayeti',
    'soygun', 'hırsızlık', 'gasp',
    'silahlı saldırı', 'bıçaklı saldırı',
    'çete', 'organize suç', 'mafya',
    'uyuşturucu', 'kaçakçılık', 'kaçak',
    'şüpheli', 'zanlı', 'firari',
    'asayiş', 'asayiş olayı',
    'savcılık', 'savcı',
    'ceza', 'cezaevi', 'mahkeme', 'mahkumiyet',
    'denetim', 'denetimler',
    // EN
    'police', 'arrest', 'arrested', 'detention',
    'suspect', 'crime', 'criminal', 'murder',
    'robbery', 'theft', 'burglary',
    'drug trafficking', 'smuggling', 'trafficking',
    'gang', 'organized crime',
    'investigation', 'prosecutor',
    'prison', 'jail', 'sentence', 'court',
    // DE
    'polizei', 'festnahme', 'verhaftet',
    'verdächtiger', 'verbrechen', 'mord',
    'einbruch', 'diebstahl',
    'drogenhandel', 'schmuggel',
    'ermittlung', 'staatsanwalt',
    'gefängnis', 'gericht', 'urteil',
  ],
  Kaza: [
    // TR
    'kaza', 'kazası', 'kazada', 'trafik kazası',
    'araç kazası', 'çarpışma', 'çarpıştı',
    'otobüs kazası', 'kamyon kazası',
    'tren kazası', 'uçak kazası', 'helikopter kazası',
    'gemi kazası', 'gemi battı',
    'yaralı', 'yaralılar', 'yaralanan', 'yaralandı', 'yaralanarak',
    'enkaz', 'kurtarma', 'kurtarma ekibi',
    'itfaiye', 'ambulans', 'ambulansla', 'ambulanslarla',
    'olay yeri', 'kaza yeri', 'kaza yerine', 'kazaya', 'kaza yaptı',
    'direksiyon hakimiyeti', 'direksiyon hakimiyetini',
    'takla atarak', 'ters döndü', 'şarampole', 'şarampole yuvarlandı',
    'maddi hasar', 'alkollü sürücü', 'hız ihlali',
    // EN
    'accident', 'crash', 'collision',
    'traffic accident', 'car accident', 'bus crash',
    'train crash', 'plane crash', 'helicopter crash',
    'ship accident', 'shipwreck',
    'injured', 'injuries', 'casualties',
    'fatalities', 'death toll',
    'wreckage', 'debris',
    'rescue', 'rescue team',
    'fire department', 'ambulance',
    // DE
    'unfall', 'verkehrsunfall', 'zusammenstoß',
    'zugunfall', 'flugzeugunfall',
    'verletzte', 'todesfälle',
    'rettung', 'feuerwehr', 'krankenwagen',
  ],
  Deprem: [
    // TR
    'deprem', 'depremi', 'depremde', 'sarsıntı',
    'richter', 'magnitüd', 'şiddetinde',
    'artçı', 'artçı deprem', 'öncü deprem',
    'deprem merkezi', 'fay hattı', 'fay',
    'sismik', 'sismoloji', 'sismograf',
    'tsunami', 'volkan', 'volkanik',
    'deprem hasarı', 'yapı çökmesi', 'yıkıldı',
    'enkaz altında', 'enkazdan kurtarıldı',
    'afad', 'afet', 'afet yönetimi',
    // EN
    'earthquake', 'seismic', 'tremor',
    'magnitude', 'aftershock', 'foreshock',
    'epicenter', 'fault line', 'tectonic',
    'tsunami', 'volcano', 'volcanic',
    // DE
    'erdbeben', 'seismisch', 'nachbeben',
    'epizentrum', 'verwerfung', 'tektonisch',
    'tsunami', 'vulkan',
  ],
  Genel: [
    // TR - Vefat/Cenaze/Güncel
    'vefat', 'vefat etti', 'hayatını kaybetti', 'cenaze',
    'cenaze töreni', 'son yolculuk', 'anma', 'taziye',
    // EN
    'obituary', 'funeral', 'memorial', 'tribute',
    // DE
    'verstorben', 'beerdigung', 'gedenken',
  ],
};

function inferCategoryFromText(title: string, description: string): ContentCategory {
  const text = `${title} ${description}`.toLocaleLowerCase('tr-TR');
  let bestCat: ContentCategory = 'Genel';
  let bestScore = 0;
  
  // Kategori önceliği: En spesifik kategoriler önce, Genel en sonda
  const priorityOrder: ContentCategory[] = [
    'Deprem', 'Kaza', 'Asayiş',        // Acil/olay haberleri en yüksek öncelik
    'Spor',                              // Spor çok belirgin
    'Siyaset', 'Dünya',                  // Siyaset/dünya
    'Eğitim', 'Çevre', 'Bilim',         // Tematik kategoriler
    'Saglik', 'Teknoloji',              // Uzmanlık alanları
    'Kultur', 'Ekonomi',                 // Geniş kategoriler
    'Magazin',                           // En geniş/en çok false positive riski
    'Genel',                             // Varsayılan
  ];
  
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [ContentCategory, string[]][]) {
    const score = keywords.filter((kw) => {
      // Türkçe karakterleri de destekleyen word-boundary benzeri regex
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|[\\s.,!?;:\\"'\\-\\[\\]{}()])${escaped}(?:[\\s.,!?;:\\"'\\-\\[\\]{}()]|$)`, 'i');
      return regex.test(` ${text} `);
    }).length;
    
    if (score > bestScore || (score === bestScore && score > 0 && priorityOrder.indexOf(cat as ContentCategory) < priorityOrder.indexOf(bestCat))) {
      bestScore = score;
      bestCat = cat as ContentCategory;
    }
  }
  return bestCat;
}

export function mapToContentCategory(backendCategory?: string, title = '', description = ''): ContentCategory {
  // 'general' ve 'breaking' için metin analizine güven
  if (backendCategory && backendCategory !== 'general' && backendCategory !== 'breaking') {
    const mapped = CATEGORY_MAP[backendCategory.toLowerCase()];
    if (mapped && mapped !== 'Genel') return mapped;
  }
  return inferCategoryFromText(title, description);
}

function unwrapProxiedImageUrl(input: string): string {
  try {
    const parsed = new URL(input);
    if (parsed.pathname.includes('/api/proxy/image')) {
      const original = parsed.searchParams.get('url');
      if (original) return decodeURIComponent(original);
    }
  } catch {
    // Keep original value when URL parsing fails.
  }
  return input;
}

// Harici CDN resimlerini backend proxy üzerinden yükler (hotlink korumasını aşar)
export function proxyImageUrl(url?: string): string | undefined {
  if (!url) return undefined;

  let upgraded = unwrapProxiedImageUrl(url);

  // BBC images: force larger variants when a size segment exists in URL.
  if (/ichef\.bbci\.co\.uk/i.test(upgraded)) {
    upgraded = upgraded
      .replace(/\/news\/\d+\//i, '/news/1024/')
      .replace(/\/news\/(\d{2,4})x(\d{2,4})\//i, '/news/1024/')
      .replace(/\/ace\/standard\/\d+\//i, '/news/1024/')
      .replace(/\/ace\/ws\/\d+\//i, '/news/1024/')
      .replace(/\/images\/ic\/\d+x\d+\//i, '/images/ic/1024x576/');

    try {
      const parsed = new URL(upgraded);
      const width = Number(parsed.searchParams.get('imwidth') ?? 0);
      if (width && width < 1024) {
        parsed.searchParams.set('imwidth', '1200');
      }
      upgraded = parsed.toString();
    } catch {
      // Keep upgraded URL when parsing fails.
    }
  }

  // Hurriyet: prefer uncropped/original-ish variant when thumbnail path is used.
  if (/image\.hurimg\.com/i.test(upgraded)) {
    upgraded = upgraded.replace(/\/90\/\d+x\d+\//i, '/90/0x0/');
  }

  return `${API_BASE}/api/proxy/image?url=${encodeURIComponent(upgraded)}`;
}

export function proxyPageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return `${API_BASE}/api/proxy/page?url=${encodeURIComponent(url)}`;
}

/**
 * Auth-aware fetchArticles. token verilirse Authorization header eklenir;
 * personalized=true ile request edilirse backend kullanıcının kaynak/dil/kategori
 * tercihlerini filtre olarak uygular.
 */
export async function fetchArticles(
  params: FetchNewsParams & { personalized?: boolean; token?: string | null } = {},
): Promise<ApiArticle[]> {
  const query = new URLSearchParams();
  if (params.language) query.set('language', params.language);
  if (params.category) query.set('category', params.category);
  if (params.source) query.set('source', params.source);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  if (params.personalized) query.set('personalized', '1');

  const headers: Record<string, string> = {};
  if (params.token) headers.Authorization = `Bearer ${params.token}`;

  const res = await fetch(`${API_BASE}/api/news?${query.toString()}`, { headers });
  if (!res.ok) throw new Error(`API hatası: ${res.status}`);
  const data: { total: number; articles: ApiArticle[] } = await res.json();
  return data.articles.map(cleanArticle);
}

/**
 * Embedding-bazlı "Sizin İçin" feed. Auth gerekli.
 * cold=true dönerse kullanıcının henüz like/view'i yok → trending fallback.
 */
/**
 * Bir makalenin görüntülendiğini server'a bildir. Auth gerekli (token yoksa no-op).
 * Idempotent — UPSERT'tir; dwellMs ve scrollPct daha büyükle değiştirilir.
 *
 * Fire-and-forget: çağırırken `await` etme; UI'yi tutma.
 */
export async function recordArticleView(
  articleId: string,
  token: string | null,
  opts: { dwellMs?: number; scrollPct?: number; sourceCtx?: string } = {},
): Promise<void> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    await fetch(`${API_BASE}/api/news/${encodeURIComponent(articleId)}/view`, {
      method: 'POST',
      headers,
      body: JSON.stringify(opts),
    });
  } catch {
    // best-effort; analitik kaybı OK
  }
}

export async function fetchRecentViews(token: string, limit = 10): Promise<any[]> {
  if (!token) return [];
  try {
    const res = await fetch(`${API_BASE}/api/news/recent-views?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.articles ?? []).map(cleanArticle);
  } catch {
    return [];
  }
}

export interface ForYouResponse {
  cold: boolean;
  sampleCount: number;
  freshness?: 'fresh' | 'stale' | 'cold';
  articles: Array<{
    id: string;
    title: string;
    description: string;
    content?: string;
    url: string;
    image_url?: string | null;
    published_at: string;
    category?: string | null;
    language?: string | null;
    source_name: string;
    source_url: string;
    interest_score?: number;
  }>;
}
export async function fetchForYouArticles(token: string, limit = 30, days = 3): Promise<ForYouResponse | null> {
  if (!token) return null;
  const res = await fetch(`${API_BASE}/api/news/for-you?limit=${limit}&days=${days}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as ForYouResponse;
  data.articles = data.articles.map(cleanArticle);
  return data;
}

export async function fetchArticleById(id: string): Promise<ApiArticle> {
  const res = await fetch(`${API_BASE}/api/news/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`API hatası: ${res.status}`);
  return cleanArticle(await res.json() as ApiArticle);
}

export async function fetchArticleFullContent(id: string): Promise<{ content: string | null; images?: string[]; fromSource: boolean; available?: boolean }> {
  const res = await fetch(`${API_BASE}/api/news/${encodeURIComponent(id)}/full-content`);
  if (!res.ok) throw new Error(`API hatası: ${res.status}`);
  return (await res.json()) as { content: string | null; images?: string[]; fromSource: boolean; available?: boolean };
}

export async function fetchArticleAiAnalysis(id: string): Promise<ArticleAiAnalysis> {
  const res = await fetch(`${API_BASE}/api/news/${encodeURIComponent(id)}/analysis`);
  if (!res.ok) throw new Error(`API hatasÄ±: ${res.status}`);
  return (await res.json()) as ArticleAiAnalysis;
}

export async function fetchTrendingArticles(limit = 10): Promise<ApiArticle[]> {
  try {
    const res = await fetch(`${API_BASE}/api/news/trending?limit=${limit}`);
    if (!res.ok) return [];
    const data: { articles: ApiArticle[] } = await res.json();
    return (data.articles ?? []).map(cleanArticle);
  } catch {
    return [];
  }
}

export async function fetchBreakingArticles(limit = 8): Promise<ApiArticle[]> {
  try {
    const res = await fetch(`${API_BASE}/api/news/breaking?limit=${limit}`);
    if (!res.ok) return [];
    const data: { articles: ApiArticle[] } = await res.json();
    return (data.articles ?? []).map(cleanArticle);
  } catch {
    return [];
  }
}

export interface NewsSourceSummary {
  source_name: string;
  source_url: string | null;
  article_count: number;
  latest_at: string;
}

export async function fetchNewsSources(): Promise<NewsSourceSummary[]> {
  try {
    const res = await fetch(`${API_BASE}/api/news/sources`);
    if (!res.ok) return [];
    const data: { sources: NewsSourceSummary[] } = await res.json();
    return data.sources ?? [];
  } catch {
    return [];
  }
}

export type SimilarKind = 'duplicate' | 'same_event' | 'related' | 'all';

export async function fetchSimilarArticlesFromDb(
  id: string,
  options: { kind?: SimilarKind; limit?: number; threshold?: number } = {},
): Promise<any[]> {
  // v2 API: kind ∈ {duplicate, same_event, related, all}. Varsayılan same_event hem 'duplicate'
  // hem 'same_event' kayıtlarını döner — "aynı haber farklı kaynaklarda" sekmesi için doğru filtre.
  const kind = options.kind ?? 'same_event';
  const limit = options.limit ?? 12;
  const params = new URLSearchParams({ kind, limit: String(limit) });
  if (options.threshold !== undefined) params.set('threshold', String(options.threshold));
  const res = await fetch(`${API_BASE}/api/similarity/${encodeURIComponent(id)}?${params}`);
  if (!res.ok) return [];
  const rows = await res.json();
  return rows.map((r: any) => cleanArticle({
    id: r.id,
    title: r.title,
    description: r.description ?? '',
    url: r.url,
    publishedAt: r.published_at,
    imageUrl: r.image_url,
    category: r.category,
    language: r.language,
    source: { name: r.source_name },
    similarityScore: r.similarity_score,
    kind: r.kind ?? 'same_event',
    entityOverlap: r.entity_overlap ?? null,
  }));
}
