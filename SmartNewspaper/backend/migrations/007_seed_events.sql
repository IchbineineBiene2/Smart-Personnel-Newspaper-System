-- Migration 007: Etkinlik ve duyuru seed verisi
-- eventsData.ts'deki hardcoded verileri DB'ye aktarır.

INSERT INTO events (id, title, summary, description, event_date, location, category, is_important, created_at)
VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567801',
    'Yapay Zeka ve Gazetecilik Zirvesi',
    'Haber odalarında yapay zeka kullanımı ve geleceği tartışılıyor.',
    'Editörler, veri gazeteciliği uzmanları ve ürün ekipleri bir araya gelerek haber odasında yapay zeka kullanımını tartışacak. Etkinlikte panel oturumları, canlı demolar ve networking fırsatları yer alıyor.',
    '2026-04-10T10:00:00+03:00',
    'İstanbul Kongre Merkezi, Salon A',
    'akademik',
    TRUE,
    '2026-03-20T09:00:00+03:00'
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567802',
    'Bahar Dönemi Vize Sınavları',
    'Tüm bölümler için bahar dönemi vize sınav takvimi açıklandı.',
    'Bahar 2026 dönemi vize sınavları 14-18 Nisan tarihleri arasında gerçekleşecektir. Sınav programları bölüm panolarına asılmıştır. Mazeret sınav başvuruları için son tarih 20 Nisan''dır.',
    '2026-04-14T09:00:00+03:00',
    'Tüm Kampüs Binaları',
    'sinav',
    TRUE,
    '2026-03-22T10:00:00+03:00'
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567803',
    'Burs Başvurusu Son Gün',
    'Kurumsal burs programı başvuruları için son tarih yaklaşıyor.',
    'Smart Newspaper burs programı kapsamında 10 öğrenciye tam burs verilecektir. Başvuru için GPA en az 3.0, bir motivasyon mektubu ve iki referans mektubu gerekmektedir. Başvurular online portal üzerinden yapılacaktır.',
    '2026-04-05T23:59:00+03:00',
    'Online Başvuru Portalı',
    'son-tarih',
    TRUE,
    '2026-03-15T08:00:00+03:00'
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567804',
    'Geleneksel Bahar Şenliği',
    'Yıllık bahar şenliği bu yıl daha büyük bir organizasyonla geliyor.',
    'Konserler, stantlar, yemek festivali ve çeşitli aktivitelerle dolu iki günlük bahar şenliği. Tüm personel ve öğrenciler davetlidir.',
    '2026-04-19T11:00:00+03:00',
    'Merkez Kampüs Açık Alanı',
    'sosyal',
    FALSE,
    '2026-03-18T11:00:00+03:00'
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567805',
    'Dijital Pazarlama Sertifika Programı',
    'Ücretsiz online sertifika programı kayıtları açıldı.',
    'SEO, sosyal medya yönetimi, içerik stratejisi ve analitik konularını kapsayan 8 haftalık online sertifika programı.',
    '2026-04-07T14:00:00+03:00',
    'Online (Zoom)',
    'akademik',
    FALSE,
    '2026-03-25T09:00:00+03:00'
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567806',
    'Mezunlar Buluşması 2026',
    'Her yıl düzenlenen mezunlar buluşması bu yıl daha geniş katılımla gerçekleşecek.',
    'Tüm mezunlarımız ve mevcut personelimizi kapsayan yıllık buluşma etkinliği. Akşam yemeği, ödül töreni ve networking etkinlikleri planlanmıştır.',
    '2026-05-03T18:30:00+03:00',
    'İstanbul Marriott Oteli',
    'sosyal',
    FALSE,
    '2026-03-10T12:00:00+03:00'
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567807',
    'Proje Teslim Son Tarihi — Bahar Dönemi',
    'Tüm bahar dönemi proje ödevleri için son teslim tarihi.',
    'Bahar 2026 dönemi dönem projelerinin son teslim tarihi. Geç teslimler kabul edilmeyecektir.',
    '2026-04-28T23:59:00+03:00',
    'Online Sistem',
    'son-tarih',
    TRUE,
    '2026-03-01T08:00:00+03:00'
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567808',
    'Finaller Dönemi Hazırlık Semineri',
    'Sınav dönemine hazırlık için ücretsiz seminer.',
    'Verimli çalışma teknikleri, zaman yönetimi ve sınav kaygısıyla başa çıkma yöntemlerini ele alan ücretsiz seminer.',
    '2026-05-12T13:00:00+03:00',
    'Konferans Salonu B-101',
    'akademik',
    FALSE,
    '2026-03-28T10:00:00+03:00'
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567809',
    'Yıl Sonu Final Sınavları',
    'Bahar 2026 dönemi final sınav takvimi.',
    'Final sınavları 26 Mayıs - 6 Haziran tarihleri arasında gerçekleşecektir.',
    '2026-05-26T09:00:00+03:00',
    'Sınav Salonları (TBA)',
    'sinav',
    TRUE,
    '2026-03-05T09:00:00+03:00'
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567810',
    'Kariyer Günleri 2026',
    'Sektörün önde gelen şirketleri kampüste iş ve staj fırsatları sunuyor.',
    'Teknoloji, medya, finans ve pazarlama sektörlerinden 50''den fazla firma katılacak. CV hazırlama workshopları, birebir mülakatlar planlanmıştır.',
    '2026-04-23T09:00:00+03:00',
    'Fuar Alanı, Bina D',
    'sosyal',
    TRUE,
    '2026-03-12T11:00:00+03:00'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO announcements (id, title, content, published_at, expires_at, priority)
VALUES
  (
    'b1c2d3e4-f5a6-7890-bcde-fa1234567801',
    'Sistem Bakımı — 2 Nisan',
    '2 Nisan 2026 gece 01:00-04:00 saatleri arasında planlı sistem bakımı yapılacaktır. Bu süre zarfında platforma erişim sağlanamayacaktır.',
    '2026-03-28T09:00:00+03:00',
    '2026-04-03T00:00:00+03:00',
    'critical'
  ),
  (
    'b1c2d3e4-f5a6-7890-bcde-fa1234567802',
    'Burs Başvurusu Hatırlatması',
    'Kurumsal burs programı başvuruları 5 Nisan''da sona erecektir. Başvuru portalına erişmek için öğrenci numaranızla giriş yapınız.',
    '2026-03-29T10:00:00+03:00',
    '2026-04-06T00:00:00+03:00',
    'critical'
  ),
  (
    'b1c2d3e4-f5a6-7890-bcde-fa1234567803',
    'Yeni Sağlık Kategorisi Bülteni',
    'Sağlık kategorisinde günlük özet bültenler yayına alındı. Profil ayarlarınızdan bildirimleri etkinleştirebilirsiniz.',
    '2026-03-25T11:00:00+03:00',
    NULL,
    'normal'
  ),
  (
    'b1c2d3e4-f5a6-7890-bcde-fa1234567804',
    'Mobil Uygulama Güncellemesi',
    'Smart Newspaper mobil uygulamasının 2.1 sürümü yayınlandı. Yeni özellikler: çevrimdışı okuma, karanlık mod iyileştirmeleri ve daha hızlı sayfa yükleme.',
    '2026-03-22T14:00:00+03:00',
    NULL,
    'normal'
  ),
  (
    'b1c2d3e4-f5a6-7890-bcde-fa1234567805',
    'Almanca Haber Kaynakları Eklendi',
    'Platformumuza DW Deutsch, Tagesschau ve Spiegel gibi Almanca haber kaynakları eklendi. Dil filtresinden "Almanca" seçeneğini kullanabilirsiniz.',
    '2026-03-20T09:00:00+03:00',
    NULL,
    'normal'
  )
ON CONFLICT (id) DO NOTHING;
