/**
 * Basit Türkçe entity extractor — regex tabanlı MVP.
 * İki katmanlı benzerlik algoritmasında embedding skoru orta seviyedeyken
 * (0.55-0.78) "aynı olay mı?" kararını desteklemek için kullanılır.
 *
 * İleride: bir Türkçe NER modeli (örn. spaCy tr veya bert-base-turkish-cased-ner)
 * ile değiştirilebilir; arayüz aynı kalır.
 */

export interface Entities {
  persons: string[];
  orgs: string[];
  places: string[];
  numbers: string[];
}

// Türk şehirleri + sık geçen ülkeler — büyük harf normalize edilmiş halleri
const TURKISH_PLACES = new Set([
  'istanbul', 'ankara', 'izmir', 'bursa', 'antalya', 'adana', 'konya', 'gaziantep',
  'mersin', 'diyarbakir', 'kayseri', 'eskisehir', 'samsun', 'trabzon', 'malatya',
  'erzurum', 'van', 'sanliurfa', 'denizli', 'kocaeli', 'manisa', 'sakarya', 'hatay',
  'balikesir', 'kahramanmaras', 'aydin', 'tekirdag', 'mugla', 'edirne', 'kirsehir',
  'turkiye', 'amerika', 'almanya', 'fransa', 'ingiltere', 'rusya', 'ukrayna',
  'israil', 'filistin', 'iran', 'irak', 'suriye', 'yunanistan', 'cin', 'japonya',
  'avrupa', 'asya', 'afrika', 'orta dogu', 'orta doğu',
]);

// Kurum tetikleyici sözcükler — büyük harfle başlayan + bunları içeren ifadeler "org"
const ORG_TRIGGERS = [
  'Bakanlığı', 'Bakanlığı\'', 'Belediyesi', 'Belediyesi\'', 'Üniversitesi',
  'Cumhuriyeti', 'Partisi', 'Vakfı', 'Derneği', 'Birliği', 'Federasyonu',
  'Bankası', 'Holding', 'Grup', 'A.Ş.', 'Ltd.', 'Şirketi',
  'Mahkemesi', 'Müdürlüğü', 'Genel Müdürlüğü', 'Başkanlığı',
  'Kulübü', 'Spor', 'Sportif',
];

// Stop-words — capitalized olsa bile entity sayılmaz
const STOPWORDS_CAPITALIZED = new Set([
  'Bir', 'Bu', 'Bugun', 'Bugün', 'Şu', 'Su', 'Ne', 'Nasıl', 'Nasil',
  'Pazar', 'Pazartesi', 'Salı', 'Sali', 'Çarşamba', 'Carsamba', 'Perşembe',
  'Persembe', 'Cuma', 'Cumartesi',
  'Ocak', 'Şubat', 'Subat', 'Mart', 'Nisan', 'Mayıs', 'Mayis', 'Haziran',
  'Temmuz', 'Ağustos', 'Agustos', 'Eylül', 'Eylul', 'Ekim', 'Kasım', 'Kasim', 'Aralık', 'Aralik',
  'The', 'And', 'For', 'With', 'From', 'That', 'This', 'After',
]);

const PERSON_TITLES = [
  'Cumhurbaşkanı', 'Cumhurbaskani', 'Başbakan', 'Basbakan', 'Bakan',
  'Vali', 'Belediye Başkanı', 'Belediye Baskani', 'Genel Başkan', 'Genel Baskan',
  'Başkan', 'Baskan', 'Müdür', 'Mudur',
];

// Türkçe karakterleri ASCII'ye indirgeyip lowercase yapar — yer karşılaştırması için
function normalizePlace(s: string): string {
  return s
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .trim();
}

/**
 * Capitalized word sequence yakalayıcı.
 * "İmamoğlu", "Recep Tayyip Erdoğan", "Anadolu Adliyesi" gibi 1-4 kelimelik dizileri bulur.
 * Türkçe karakter desteği dahil.
 */
const CAP_SEQ_RE = /(?:[A-ZÇĞİÖŞÜ][a-zçğıöşü']+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü']+){0,3})/g;

const NUMBER_RE = /\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?\s*(?:bin|milyon|milyar|trilyon|TL|USD|EUR|\$|€|%)\b/gi;
const YEAR_RE = /\b(19|20)\d{2}\b/g;

export function extractEntities(rawText: string): Entities {
  if (!rawText || rawText.length < 5) {
    return { persons: [], orgs: [], places: [], numbers: [] };
  }

  // Cümle başlarındaki ilk büyük harfli kelimeyi yanlış pozitif saymamak için
  // her cümlenin ilk kelimesinin tek başına olduğu durumları temizle.
  const text = rawText.replace(/\s+/g, ' ').trim();

  const persons = new Set<string>();
  const orgs = new Set<string>();
  const places = new Set<string>();
  const numbers = new Set<string>();

  const seenCap = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = CAP_SEQ_RE.exec(text)) !== null) {
    const phrase = match[0].trim();
    if (phrase.length < 3) continue;

    // Tek kelime ve stopword ise atla
    const firstWord = phrase.split(' ')[0];
    if (!phrase.includes(' ') && STOPWORDS_CAPITALIZED.has(firstWord)) continue;

    // Cümle başında olup olmadığını kontrol et (önceki karakter '.', '!', '?' ise muhtemelen cümle başı)
    const startIdx = match.index;
    const prevChar = startIdx > 0 ? text[startIdx - 1] : '';
    const isAfterPunct = startIdx === 0 || /[.!?]\s$/.test(text.slice(Math.max(0, startIdx - 2), startIdx));
    if (isAfterPunct && !phrase.includes(' ') && phrase.length < 5) continue;

    if (seenCap.has(phrase)) continue;
    seenCap.add(phrase);

    // Sınıflandır
    const lower = normalizePlace(phrase);
    if (TURKISH_PLACES.has(lower)) {
      places.add(phrase);
      continue;
    }

    // Kurum tetikleyicisi içeriyor mu?
    const isOrg = ORG_TRIGGERS.some((trig) => phrase.includes(trig));
    if (isOrg) {
      orgs.add(phrase);
      continue;
    }

    // Bir önceki kelime title mı? ("Cumhurbaşkanı Erdoğan" → Erdoğan kişi)
    const before = text.slice(Math.max(0, startIdx - 30), startIdx).trim();
    const lastBeforeWord = before.split(/\s+/).slice(-1)[0] || '';
    const isTitlePrefix = PERSON_TITLES.some((t) => before.endsWith(t) || lastBeforeWord === t);

    // 2+ kelimelik capitalized dizileri ve title prefix'li olanları "person" varsay
    if (phrase.includes(' ') || isTitlePrefix) {
      persons.add(phrase);
    } else if (phrase.length >= 5) {
      // Tek kelime ama yeterince spesifik — entity olarak tut (kategorize edilemese de overlap için kullanışlı)
      persons.add(phrase);
    }
  }

  let nm: RegExpExecArray | null;
  while ((nm = NUMBER_RE.exec(text)) !== null) {
    numbers.add(nm[0].trim().toLowerCase());
  }
  while ((nm = YEAR_RE.exec(text)) !== null) {
    numbers.add(nm[0]);
  }

  return {
    persons: Array.from(persons),
    orgs: Array.from(orgs),
    places: Array.from(places),
    numbers: Array.from(numbers),
  };
}

/**
 * İki entity seti arasındaki örtüşme sayısını döner.
 * Aynı kişiyi farklı yazımda yakalamak için case-insensitive normalize.
 */
export function entityOverlapCount(a: Entities, b: Entities): number {
  const norm = (s: string) => normalizePlace(s).replace(/\s+/g, ' ');
  const setA = new Set([
    ...a.persons.map(norm),
    ...a.orgs.map(norm),
    ...a.places.map(norm),
    ...a.numbers.map(norm),
  ]);
  let overlap = 0;
  for (const x of [...b.persons, ...b.orgs, ...b.places, ...b.numbers]) {
    if (setA.has(norm(x))) overlap++;
  }
  return overlap;
}
