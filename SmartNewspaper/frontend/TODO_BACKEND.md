# Backend'e Tasinacak Islemler

Bu dosya, su an mock data ile calisan ancak backend gelistirildiginde API'ye tasinmasi gereken islemleri listeler.

---

## 1. Archive & History Module (FR26-FR28)

### Mevcut Durum
- `services/archive.ts` icinde statik mock data kullaniliyor
- PDF, cihaz uzerinde `expo-print` ile HTML'den olusturuluyor

### Backend'e Tasinacaklar
- [ ] **GET /api/archive/:userId** - Kullaniciya ait arsiv edisyonlarini getir
- [ ] **GET /api/archive/:userId/:editionId** - Tek bir edisyonun detayini ve makalelerini getir
- [ ] **GET /api/archive/:userId/search?q=** - Arsiv icinde arama (FR28)
- [ ] **POST /api/archive/generate** - Cron job ile gunluk/haftalik kisisel gazete olustur
- [ ] **GET /api/archive/:userId/:editionId/pdf** - PDF dosyasini backend'de olustur ve download URL dondur
- [ ] PDF dosyalari S3/Google Cloud Storage'da saklanacak
- [ ] Arsiv verileri PostgreSQL/MongoDB'de tutulacak

---

## 2. Reporting & Administration Module (FR24-FR25)

### Mevcut Durum
- `services/admin.ts` icinde statik mock data kullaniliyor
- Admin paneli herkese acik (rol kontrolu yok)

### Backend'e Tasinacaklar

#### FR24 - Kaynak ve Kategori Yonetimi
- [ ] **GET /api/admin/sources** - Haber kaynaklarini listele
- [ ] **POST /api/admin/sources** - Yeni haber kaynagi ekle
- [ ] **PUT /api/admin/sources/:id** - Haber kaynagini guncelle
- [ ] **DELETE /api/admin/sources/:id** - Haber kaynagini sil
- [ ] **GET /api/admin/categories** - Kategorileri listele
- [ ] **POST /api/admin/categories** - Yeni kategori ekle
- [ ] **PUT /api/admin/categories/:id** - Kategoriyi guncelle
- [ ] **DELETE /api/admin/categories/:id** - Kategoriyi sil

#### FR24 - Kullanici Rolleri ve Yetkileri
- [ ] **GET /api/admin/users** - Kullanici listesi
- [ ] **PUT /api/admin/users/:id/role** - Kullanici rolunu degistir (admin/editor/user)
- [ ] **PUT /api/admin/users/:id/status** - Kullanici durumunu degistir (active/suspended)
- [ ] JWT token icinde rol bilgisi tasiacak
- [ ] Middleware ile role-based access control (RBAC) uygulanacak

#### FR25 - Loglama ve Raporlama
- [ ] **GET /api/admin/logs** - Sistem loglarini getir (filtreleme: level, module, tarih araligi)
- [ ] Server-side loglama (Winston/Pino) ile sistem aktiviteleri ve hatalar kaydedilecek
- [ ] **GET /api/admin/stats** - Kullanim istatistikleri
  - Toplam kullanici, aktif kullanici
  - Haber erisim sayilari
  - Populer kategoriler
  - Gunluk aktivite grafigi
- [ ] Istatistikler backend analytics servisi ile hesaplanacak (ornegin Redis ile cache)

---

## 3. Kimlik Dogrulama & Yetkilendirme

### Mevcut Durum
- `services/auth.ts` icinde AsyncStorage ile basit profil yonetimi
- Rol kontrolu yok, admin paneli herkese acik

### Backend'e Tasinacaklar
- [ ] **POST /api/auth/login** - Kullanici girisi (JWT token dondur)
- [ ] **POST /api/auth/register** - Yeni kullanici kaydi
- [ ] **GET /api/auth/me** - Mevcut kullanici bilgisi (token ile)
- [ ] Admin paneli sadece `role: 'admin'` olan kullanicilara gosterilecek
- [ ] Frontend'de rol kontrolu: Profil ekranindaki "Yonetim" tab'i sadece admin icin render edilecek

---

## Teknik Notlar

- **Veritabani**: PostgreSQL veya MongoDB (SRS 5.6'ya gore)
- **Backend Framework**: Node.js veya Python (SRS 5.6'ya gore)
- **API Format**: RESTful JSON
- **Kimlik Dogrulama**: JWT + refresh token
- **Dosya Depolama**: S3 veya Google Cloud Storage (PDF arsivleri icin)
- **Loglama**: Winston/Pino (Node.js) veya Python logging module
