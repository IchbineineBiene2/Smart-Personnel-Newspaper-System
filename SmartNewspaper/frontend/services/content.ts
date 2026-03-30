export type ContentCategory =
  | 'Teknoloji'
  | 'Spor'
  | 'Ekonomi'
  | 'Saglik'
  | 'Kultur'
  | 'Siyaset'
  | 'Magazin';

export type EventItem = {
  id: string;
  title: string;
  summary: string;
  description: string;
  date: string;
  location: string;
  category: ContentCategory;
};

export type AnnouncementItem = {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
};

export type NewsItem = {
  id: string;
  title: string;
  excerpt: string;
  category: ContentCategory;
};

export type NewspaperSource =
  | 'Sabah'
  | 'Cumhuriyet'
  | 'Hurriyet'
  | 'Sozcu'
  | 'Milliyet'
  | 'Reuters'
  | 'BBC';

export const CATEGORIES: ContentCategory[] = [
  'Teknoloji',
  'Spor',
  'Ekonomi',
  'Saglik',
  'Kultur',
  'Siyaset',
  'Magazin',
];

export const NEWSPAPERS: NewspaperSource[] = [
  'Sabah',
  'Cumhuriyet',
  'Hurriyet',
  'Sozcu',
  'Milliyet',
  'Reuters',
  'BBC',
];

export const EVENTS: EventItem[] = [
  {
    id: 'event-101',
    title: 'Dijital Medya Zirvesi',
    summary: 'Gazetecilikte yapay zeka uygulamalari ele alinacak.',
    description:
      'Editorler, veri gazeteciligi uzmanlari ve urun ekipleri bir araya gelerek haber odasinda yapay zeka kullanimini tartisacak.',
    date: '24 Mart 2026, 10:00',
    location: 'Istanbul Kongre Merkezi',
    category: 'Teknoloji',
  },
  {
    id: 'event-102',
    title: 'Yerel Spor Bulusmasi',
    summary: 'Genclik spor kulubu yoneticileri ile panel.',
    description:
      'Yerel liglerde altyapi, sponsorluk ve taraftar etkilesimi konularinda acik oturumlar duzenlenecek.',
    date: '27 Mart 2026, 14:30',
    location: 'Ankara Genclik Parki',
    category: 'Spor',
  },
  {
    id: 'event-103',
    title: 'Kultur Sanat Forumu',
    summary: 'Bagimsiz sanatci destek mekanizmalari konusulacak.',
    description:
      'Kultur politikalari, belediye destekleri ve bagimsiz sanat mekanlarinin gelecegi odakli bir forum programi.',
    date: '30 Mart 2026, 16:00',
    location: 'Izmir Sanat Fabrikasi',
    category: 'Kultur',
  },
  {
    id: 'event-104',
    title: 'Kamuoyu Hakkinda Konusma',
    summary: 'Demografik degisimler ve siyasal tercihler uzerine panel.',
    description:
      'Sosyal bilimciler, anketorcular ve siyasal analiz uzmanlarindan olusacak panelde son secim trendleri, genclik tercihler ve degisken oy kullanima iliskin bulguların tartisılacaktir.',
    date: '2 Nisan 2026, 11:00',
    location: 'Ankara Insan Haklari Merkezi',
    category: 'Siyaset',
  },
  {
    id: 'event-105',
    title: 'Ünlüler Doruğunda Moda Gecesi',
    summary: 'Türkiye\'nin en tanınmış yüzleri moda tasarımcılarıyla bir araya gelecek.',
    description:
      'Ünlü oyuncular, müzisyenler ve modacıların katılımıyla düzenlenecek gala, gelecek sezon moda trendlerini sergileyecektir.',
    date: '5 Nisan 2026, 19:00',
    location: 'Istanbul Lüks Otel Balo Salonu',
    category: 'Magazin',
  },
];

export const ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: 'ann-201',
    title: 'Sistem Bakimi',
    content: '26 Mart gecesi 01:00-03:00 arasinda planli bakim yapilacaktir.',
    publishedAt: '19 Mart 2026',
  },
  {
    id: 'ann-202',
    title: 'Yeni Kategori Eklendi',
    content: 'Saglik kategorisinde gunluk ozet bultenler yayina alindi.',
    publishedAt: '18 Mart 2026',
  },
];

export const NEWS: NewsItem[] = [
  {
    id: 'news-301',
    title: 'Mobil Uygulama Kullanimi Rekor Kiriyor',
    excerpt: 'Yerel haber takip uygulamalarinda gunluk aktif kullanici sayisi artti.',
    category: 'Teknoloji',
  },
  {
    id: 'news-302',
    title: 'Sehir Takimi Finalde',
    excerpt: 'Final macina kalan takim taraftarlardan buyuk destek aliyor.',
    category: 'Spor',
  },
  {
    id: 'news-303',
    title: 'Enflasyon Verilerinde Yeni Donem',
    excerpt: 'Aciklanan guncel raporda piyasalarin beklentisi dikkat cekti.',
    category: 'Ekonomi',
  },
  {
    id: 'news-304',
    title: 'Toplum Sagligi Icin Erken Teshis Uyarisi',
    excerpt: 'Uzmanlar duzenli kontrolun onemini tekrar vurguladi.',
    category: 'Saglik',
  },
  {
    id: 'news-305',
    title: 'Acik Hava Tiyatro Sezonu Basliyor',
    excerpt: 'Bu yilki programda 20 farkli ekip sahne alacak.',
    category: 'Kultur',
  },
  {
    id: 'news-306',
    title: 'Global AI Regulation Talks Enter New Phase',
    excerpt: 'Policy makers from multiple regions discussed a common framework for AI safety.',
    category: 'Teknoloji',
  },
  {
    id: 'news-307',
    title: 'Markets React to Updated Inflation Outlook',
    excerpt: 'Analysts expect short-term volatility as investors reassess growth forecasts.',
    category: 'Ekonomi',
  },
];
