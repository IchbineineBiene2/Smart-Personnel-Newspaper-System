// TODO [BACKEND]: Arşiv verileri backend API'den çekilecek (GET /api/archive/:userId)
// TODO [BACKEND]: Arşiv oluşturma işlemi backend'de cron job ile günlük/haftalık çalışacak
// TODO [BACKEND]: PDF dosyaları backend'de oluşturulup storage'da (S3/GCS) saklanacak

import { ContentCategory } from './content';

export interface ArchivedEdition {
  id: string;
  title: string;
  generatedAt: string;        // ISO date string
  categories: ContentCategory[];
  articleCount: number;
  summary: string;
}

export interface ArchivedArticle {
  id: string;
  editionId: string;
  title: string;
  excerpt: string;
  category: ContentCategory;
  source: string;
  publishedAt: string;
  imageUrl?: string;
}

// Mock arşiv verileri (FR26)
export const ARCHIVED_EDITIONS: ArchivedEdition[] = [
  {
    id: 'edition-001',
    title: 'Kisisel Gazete - 21 Mart 2026',
    generatedAt: '2026-03-21T08:00:00Z',
    categories: ['Teknoloji', 'Spor'],
    articleCount: 6,
    summary: 'Yapay zeka gelismeleri, sampiyonluk yolunda son durum ve daha fazlasi.',
  },
  {
    id: 'edition-002',
    title: 'Kisisel Gazete - 20 Mart 2026',
    generatedAt: '2026-03-20T08:00:00Z',
    categories: ['Ekonomi', 'Saglik'],
    articleCount: 5,
    summary: 'Piyasa analizi, saglik sektorunde yeni yaklasimlar.',
  },
  {
    id: 'edition-003',
    title: 'Kisisel Gazete - 19 Mart 2026',
    generatedAt: '2026-03-19T08:00:00Z',
    categories: ['Kultur', 'Teknoloji', 'Ekonomi'],
    articleCount: 8,
    summary: 'Festival programi aciklandi, dijital donusum ve ekonomi gundemi.',
  },
  {
    id: 'edition-004',
    title: 'Kisisel Gazete - 18 Mart 2026',
    generatedAt: '2026-03-18T08:00:00Z',
    categories: ['Spor', 'Kultur'],
    articleCount: 4,
    summary: 'Yerel lig sonuclari, tiyatro sezonu baslangici.',
  },
  {
    id: 'edition-005',
    title: 'Kisisel Gazete - 17 Mart 2026',
    generatedAt: '2026-03-17T08:00:00Z',
    categories: ['Teknoloji', 'Saglik', 'Ekonomi'],
    articleCount: 7,
    summary: 'Siber guvenlik uyarilari, saglik taramalari ve borsa ozeti.',
  },
];

// Her edition icin mock makaleler (FR27)
export const ARCHIVED_ARTICLES: ArchivedArticle[] = [
  // Edition 001
  {
    id: 'arch-art-001',
    editionId: 'edition-001',
    title: 'Yapay Zeka Gazetecilikte Devrim Yaratiyor',
    excerpt: 'Haber odalari yapay zeka destekli icerik uretim araclarini test ediyor. Teknoloji sektoru, otomatik haber yazim ve editoryal yardim sistemlerine milyonlarca dolar yatirimi gerceklestiriyor. Gazetecilik mesleginin geleceği bu teknolojiye bagli hale gelirken, etik sorunlar ve insani yonune yonek tart ismalara devam ediliyor. Uzmanlar, yapay zekanin gazetecilerin isini degistireceğini ancak tamamen ortadan kaldiracağini dusmuyorlar.',
    category: 'Teknoloji',
    source: 'Hurriyet',
    publishedAt: '21 Mart 2026',
    imageUrl: 'https://images.unsplash.com/photo-1677442d019cecf8d8e94df3e90202ac5a9a0da8f?w=1000&h=700&fit=crop',
  },
  {
    id: 'arch-art-002',
    editionId: 'edition-001',
    title: 'Blockchain Tabanli Haber Dogrulama Sistemi',
    excerpt: 'Dezenformasyona karsi yeni bir teknolojik yaklasim gelistiriliyor. Blockchain teknolojisi kullanilarak olusturulan yeni platform, haber kaynaklarini dogrulamak ve yanlis bilgilerin yayilmasini onlemek icin tasarlanmistir. Sistem, her haberle birlikte kaynak bilgisini zincirli bir yapida saklamakta ve degistirilmesini imkansiz kilmaktadir. Bu cozum, sosyal medyada yaygın olan fake news problemi ile mucadelede devrim niteliğinde bir adim olarak gorulmektedir.',
    category: 'Teknoloji',
    source: 'Cumhuriyet',
    publishedAt: '21 Mart 2026',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f70504504?w=600&h=400&fit=crop',
  },
  {
    id: 'arch-art-003',
    editionId: 'edition-001',
    title: 'Sampiyonluk Yarisi Kizisiyor',
    excerpt: 'Lig lideri takim kritik deplasmana cikiyor ve şampiyonluk yolunda onemli bir viraj yasilmak uzere. Rakip takimin son on macinda elde ettigi basarili sonuclar, odenenen macin ne kadar zor olacagini gostermektedir. Kaleci pozisyonunda yapilan son dakika transferi, defansin guclendirilmesine yardimci olmustur. Antrenor, oyuncularinin hazirliginin en yuksek noktada oldugunu belirtmis ve yarim finali kazanmanin sampiyonlugun anahtar olmadigi sinyalini vermistir.',
    category: 'Spor',
    source: 'Sabah',
    publishedAt: '21 Mart 2026',
    imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=400&fit=crop',
  },
  {
    id: 'arch-art-004',
    editionId: 'edition-001',
    title: 'Genc Yetenek Transferi Gerceklesti',
    excerpt: 'Altyapidan yetisen oyuncu buyuk kuluple anlasti ve turkiye futbolune yeni bir umut kapiladi. Genç futbolcu, u-21 milli takimda oynayan bir uc aydir scout sistemine yaklasan performans gosteri dı. Bonusu havale edildikten sonra, iki buçuk yillik sozlesme imzalandi. Teknik heyet, oyuncunun uluslararasi alanda ciddi basarilar elde edecegine inandigi ve ona ilk 11de oynama sans verecegi haber verilmistir.',
    category: 'Spor',
    source: 'Milliyet',
    publishedAt: '21 Mart 2026',
    imageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop',
  },
  // Edition 002
  {
    id: 'arch-art-005',
    editionId: 'edition-002',
    title: 'Merkez Bankasi Faiz Karari Aciklandi',
    excerpt: 'Piyasalar karari olumlu karsiladi, borsa yukseliste ve döviz kurları düsüse başladi. Merkez Bankasi Başkani aciklamasinda, enflasyon hedefine ulaşmak icin bu adimin atildigini belirtti. Turkiye Cumhuriyet Merkez Bankasi (TCMB) tarafindan açiklanan yeni politika, ekonomistler tarafindan degisik sekilde yorumlanmistir. Iki aylik vadeli interbank faiz oraninda gozumlenen yapisallik, para piyasasi dinamigini daha esnek hale getirmesi beklenmektedir.',
    category: 'Ekonomi',
    source: 'Sozcu',
    publishedAt: '20 Mart 2026',
    imageUrl: 'https://images.unsplash.com/photo-1611432579069-0fcd3d99ba5e?w=600&h=400&fit=crop',
  },
  {
    id: 'arch-art-006',
    editionId: 'edition-002',
    title: 'Saglik Sektorunde Dijital Donusum',
    excerpt: 'Hastaneler yapay zeka destekli tani sistemlerine geciyor ve hasta memnuniyeti yukselmektedir. Radyoloji bolumlerinde kullanilan goruntu analiz algoritmalari, insani hata oranini yuzde 15 oraninda azaltmistir. Ayni zamanda hastalar, elektronik sağlik kayıtlarına 24 saat erişim saglanmasi ile ek bir kolaylık elde etmişlerdir. Saglik Bakanlığı, son altı ay icinde 156 hastaneye yapay zeka sistemini kurmasi amacina dogru hizla ilerleyecegini duyurmuştur.',
    category: 'Saglik',
    source: 'Hurriyet',
    publishedAt: '20 Mart 2026',
    imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop',
  },
  // Edition 003
  {
    id: 'arch-art-007',
    editionId: 'edition-003',
    title: 'Uluslararasi Film Festivali Programi',
    excerpt: '45 ulkeden 120 film gosterilecek ve sinemabillari rekorun tıklanmaya basladi. Festival direktoru, bu yilin en kapsamli festival oldugunu ve pek çok ödüllü filmin programa dahil edildigini açikladi. Açilis gunu Barcelona\'dan FIPRESCI odulu kazanmiş bir eser gösterilecek ve ünlü oyunculardan oluşan jüri tarafindan tanitilacaktir. Kütüphaneler ve universiteler, festivalin tamamlandiğı dönemde özel etkinlikler düzenlemek icin başvuru yapabileceklerdir.',
    category: 'Kultur',
    source: 'Cumhuriyet',
    publishedAt: '19 Mart 2026',
    imageUrl: 'https://images.unsplash.com/photo-1489599849228-ed7a8349346d?w=600&h=400&fit=crop',
  },
  {
    id: 'arch-art-008',
    editionId: 'edition-003',
    title: '5G Altyapisi Genislemeye Devam Ediyor',
    excerpt: 'Yeni baz istasyonlari ile kapsama alani artiyor ve internet hizlari iki katina cikmistir. Telekomunikasyon sektoru, merkez sehirlerde 5G ag kurulumunu tamamlamiş ve şimdide kırsal bölgelere yoğunlaşmaktadir. Teknoloji gözlemcileri, bu altyapinin yapay zeka, otonom araclar ve internet-of-things (IoT) uygulamalariyla birlikte guzellikle çalişacağini belirtiyorlar. Operator şirketleri, yatirim ile birlikte hizmet kalitesine de özgun dikkat göstermeyi vaat etmişlerdir.',
    category: 'Teknoloji',
    source: 'Sabah',
    publishedAt: '19 Mart 2026',
    imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop',
  },
];

export function getEditionArticles(editionId: string): ArchivedArticle[] {
  return ARCHIVED_ARTICLES.filter((a) => a.editionId === editionId);
}

export function searchArchive(query: string): ArchivedArticle[] {
  const lower = query.toLowerCase();
  return ARCHIVED_ARTICLES.filter(
    (a) =>
      a.title.toLowerCase().includes(lower) ||
      a.excerpt.toLowerCase().includes(lower) ||
      a.category.toLowerCase().includes(lower) ||
      a.source.toLowerCase().includes(lower)
  );
}
