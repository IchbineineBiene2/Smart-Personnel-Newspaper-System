import { Announcement, Event } from '../models/Event';

export const EVENTS_SEED: Event[] = [
  {
    id: 'evt-001',
    title: 'Yapay Zeka ve Gazetecilik Zirvesi',
    summary: 'Haber odalarında yapay zeka kullanımı ve geleceği tartışılıyor.',
    description:
      'Editörler, veri gazeteciliği uzmanları ve ürün ekipleri bir araya gelerek haber odasında yapay zeka kullanımını tartışacak. Etkinlikte panel oturumları, canlı demolar ve networking fırsatları yer alıyor.',
    date: '2026-04-10T10:00:00',
    location: 'İstanbul Kongre Merkezi, Salon A',
    category: 'akademik',
    isImportant: true,
    createdAt: '2026-03-20T09:00:00',
  },
  {
    id: 'evt-002',
    title: 'Bahar Dönemi Vize Sınavları',
    summary: 'Tüm bölümler için bahar dönemi vize sınav takvimi açıklandı.',
    description:
      'Bahar 2026 dönemi vize sınavları 14-18 Nisan tarihleri arasında gerçekleşecektir. Sınav programları bölüm panolarına asılmıştır. Mazeret sınav başvuruları için son tarih 20 Nisan\'dır.',
    date: '2026-04-14T09:00:00',
    location: 'Tüm Kampüs Binaları',
    category: 'sinav',
    isImportant: true,
    createdAt: '2026-03-22T10:00:00',
  },
  {
    id: 'evt-003',
    title: 'Burs Başvurusu Son Gün',
    summary: 'Kurumsal burs programı başvuruları için son tarih yaklaşıyor.',
    description:
      'Smart Newspaper burs programı kapsamında 10 öğrenciye tam burs verilecektir. Başvuru için GPA en az 3.0, bir motivasyon mektubu ve iki referans mektubu gerekmektedir. Başvurular online portal üzerinden yapılacaktır.',
    date: '2026-04-05T23:59:00',
    location: 'Online Başvuru Portalı',
    category: 'son-tarih',
    isImportant: true,
    createdAt: '2026-03-15T08:00:00',
  },
  {
    id: 'evt-004',
    title: 'Geleneksel Bahar Şenliği',
    summary: 'Yıllık bahar şenliği bu yıl daha büyük bir organizasyonla geliyor.',
    description:
      'Konserler, stantlar, yemek festivali ve çeşitli aktivitelerle dolu iki günlük bahar şenliği. Tüm personel ve öğrenciler davetlidir. Organizasyon komitesine gönüllü olmak için HR birimine başvurabilirsiniz.',
    date: '2026-04-19T11:00:00',
    location: 'Merkez Kampüs Açık Alanı',
    category: 'sosyal',
    isImportant: false,
    createdAt: '2026-03-18T11:00:00',
  },
  {
    id: 'evt-005',
    title: 'Dijital Pazarlama Sertifika Programı',
    summary: 'Ücretsiz online sertifika programı kayıtları açıldı.',
    description:
      'SEO, sosyal medya yönetimi, içerik stratejisi ve analitik konularını kapsayan 8 haftalık online sertifika programı. Program tamamlanması halinde katılımcılara sertifika verilecektir.',
    date: '2026-04-07T14:00:00',
    location: 'Online (Zoom)',
    category: 'akademik',
    isImportant: false,
    createdAt: '2026-03-25T09:00:00',
  },
  {
    id: 'evt-006',
    title: 'Mezunlar Buluşması 2026',
    summary: 'Her yıl düzenlenen mezunlar buluşması bu yıl daha geniş katılımla gerçekleşecek.',
    description:
      'Tüm mezunlarımız ve mevcut personelimizi kapsayan yıllık buluşma etkinliği. Akşam yemeği, ödül töreni ve networking etkinlikleri planlanmıştır.',
    date: '2026-05-03T18:30:00',
    location: 'İstanbul Marriott Oteli',
    category: 'sosyal',
    isImportant: false,
    createdAt: '2026-03-10T12:00:00',
  },
  {
    id: 'evt-007',
    title: 'Proje Teslim Son Tarihi — Bahar Dönemi',
    summary: 'Tüm bahar dönemi proje ödevleri için son teslim tarihi.',
    description:
      'Bahar 2026 dönemi dönem projelerinin son teslim tarihi. Geç teslimler kabul edilmeyecektir. Projeler online sistem üzerinden yüklenmelidir. Teknik sorunlar için BT birimiyle iletişime geçiniz.',
    date: '2026-04-28T23:59:00',
    location: 'Online Sistem',
    category: 'son-tarih',
    isImportant: true,
    createdAt: '2026-03-01T08:00:00',
  },
  {
    id: 'evt-008',
    title: 'Finaller Dönemi Hazırlık Semineri',
    summary: 'Sınav dönemine hazırlık için ücretsiz seminer.',
    description:
      'Verimli çalışma teknikleri, zaman yönetimi ve sınav kaygısıyla başa çıkma yöntemlerini ele alan ücretsiz seminer. Akademik danışmanlar tarafından yürütülecektir.',
    date: '2026-05-12T13:00:00',
    location: 'Konferans Salonu B-101',
    category: 'akademik',
    isImportant: false,
    createdAt: '2026-03-28T10:00:00',
  },
  {
    id: 'evt-009',
    title: 'Yıl Sonu Final Sınavları',
    summary: 'Bahar 2026 dönemi final sınav takvimi.',
    description:
      'Final sınavları 26 Mayıs - 6 Haziran tarihleri arasında gerçekleşecektir. Sınav giriş belgelerinizi önceden sistemden indirmeyi unutmayınız. Sınav salonları 1 Mayıs\'ta açıklanacaktır.',
    date: '2026-05-26T09:00:00',
    location: 'Sınav Salonları (TBA)',
    category: 'sinav',
    isImportant: true,
    createdAt: '2026-03-05T09:00:00',
  },
  {
    id: 'evt-010',
    title: 'Kariyer Günleri 2026',
    summary: 'Sektörün önde gelen şirketleri kampüste iş ve staj fırsatları sunuyor.',
    description:
      'Teknoloji, medya, finans ve pazarlama sektörlerinden 50\'den fazla firma katılacak. CV hazırlama workshopları, birebir mülakatlar ve networking etkinlikleri planlanmıştır. Önceden kayıt zorunludur.',
    date: '2026-04-23T09:00:00',
    location: 'Fuar Alanı, Bina D',
    category: 'sosyal',
    isImportant: true,
    createdAt: '2026-03-12T11:00:00',
  },
];

export const ANNOUNCEMENTS_SEED: Announcement[] = [
  {
    id: 'ann-001',
    title: 'Sistem Bakımı — 2 Nisan',
    content:
      '2 Nisan 2026 gece 01:00-04:00 saatleri arasında planlı sistem bakımı yapılacaktır. Bu süre zarfında platforma erişim sağlanamayacaktır.',
    publishedAt: '2026-03-28T09:00:00',
    expiresAt: '2026-04-03T00:00:00',
    priority: 'critical',
  },
  {
    id: 'ann-002',
    title: 'Burs Başvurusu Hatırlatması',
    content:
      'Kurumsal burs programı başvuruları 5 Nisan\'da sona erecektir. Başvuru portalına erişmek için öğrenci numaranızla giriş yapınız.',
    publishedAt: '2026-03-29T10:00:00',
    expiresAt: '2026-04-06T00:00:00',
    priority: 'critical',
  },
  {
    id: 'ann-003',
    title: 'Yeni Sağlık Kategorisi Bülteni',
    content:
      'Sağlık kategorisinde günlük özet bültenler yayına alındı. Profil ayarlarınızdan bildirimleri etkinleştirebilirsiniz.',
    publishedAt: '2026-03-25T11:00:00',
    priority: 'normal',
  },
  {
    id: 'ann-004',
    title: 'Mobil Uygulama Güncellemesi',
    content:
      'Smart Newspaper mobil uygulamasının 2.1 sürümü yayınlandı. Yeni özellikler: çevrimdışı okuma, karanlık mod iyileştirmeleri ve daha hızlı sayfa yükleme.',
    publishedAt: '2026-03-22T14:00:00',
    priority: 'normal',
  },
  {
    id: 'ann-005',
    title: 'Almanca Haber Kaynakları Eklendi',
    content:
      'Platformumuza DW Deutsch, Tagesschau ve Spiegel gibi Almanca haber kaynakları eklendi. Dil filtresinden "Almanca" seçeneğini kullanabilirsiniz.',
    publishedAt: '2026-03-20T09:00:00',
    priority: 'normal',
  },
];