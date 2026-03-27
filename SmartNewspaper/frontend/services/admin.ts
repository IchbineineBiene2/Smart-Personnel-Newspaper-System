// TODO [BACKEND]: Admin CRUD islemleri REST API uzerinden yapilacak (POST/PUT/DELETE /api/admin/sources, /api/admin/categories)
// TODO [BACKEND]: Kullanici rolleri ve yetkilendirme JWT + role-based access control ile yapilacak
// TODO [BACKEND]: Log kayitlari server-side loglama sistemi ile tutulacak (Winston/Pino)
// TODO [BACKEND]: Istatistikler backend analytics servisi ile hesaplanacak
// TODO [AUTH]: Admin paneli sadece admin rolu olan kullanicilara gosterilecek (su an herkese acik)

import { ContentCategory } from './content';

// FR24: Haber kaynaklari yonetimi
export interface NewsSourceConfig {
  id: string;
  name: string;
  url: string;
  category: ContentCategory;
  isActive: boolean;
  addedAt: string;
}

// FR24: Kullanici rolleri
export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'user';
  status: 'active' | 'suspended';
  lastActive: string;
}

// FR25: Sistem log kayitlari
export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  module: string;
  message: string;
}

// FR25: Kullanim istatistikleri
export interface UsageStats {
  totalUsers: number;
  activeToday: number;
  totalNewsAccess: number;
  totalBookmarks: number;
  topCategories: { category: string; count: number }[];
  dailyActivity: { date: string; users: number; newsAccess: number }[];
}

// Mock haber kaynaklari
export const MOCK_NEWS_SOURCES: NewsSourceConfig[] = [
  {
    id: 'src-001',
    name: 'Sabah',
    url: 'https://sabah.com.tr',
    category: 'Teknoloji',
    isActive: true,
    addedAt: '2026-01-15',
  },
  {
    id: 'src-002',
    name: 'Cumhuriyet',
    url: 'https://cumhuriyet.com.tr',
    category: 'Ekonomi',
    isActive: true,
    addedAt: '2026-01-15',
  },
  {
    id: 'src-003',
    name: 'Hurriyet',
    url: 'https://hurriyet.com.tr',
    category: 'Spor',
    isActive: true,
    addedAt: '2026-01-16',
  },
  {
    id: 'src-004',
    name: 'Sozcu',
    url: 'https://sozcu.com.tr',
    category: 'Kultur',
    isActive: false,
    addedAt: '2026-02-01',
  },
  {
    id: 'src-005',
    name: 'Milliyet',
    url: 'https://milliyet.com.tr',
    category: 'Saglik',
    isActive: true,
    addedAt: '2026-02-10',
  },
];

// Mock kategori listesi (yonetilebilir)
export const MOCK_MANAGED_CATEGORIES: { id: string; name: ContentCategory; articleCount: number; isActive: boolean }[] = [
  { id: 'cat-001', name: 'Teknoloji', articleCount: 45, isActive: true },
  { id: 'cat-002', name: 'Spor', articleCount: 38, isActive: true },
  { id: 'cat-003', name: 'Ekonomi', articleCount: 52, isActive: true },
  { id: 'cat-004', name: 'Saglik', articleCount: 21, isActive: true },
  { id: 'cat-005', name: 'Kultur', articleCount: 29, isActive: true },
];

// Mock kullanici kayitlari
export const MOCK_USERS: UserRecord[] = [
  { id: 'u-001', name: 'Ahmet Kullanici', email: 'ahmet@example.com', role: 'admin', status: 'active', lastActive: '2026-03-22' },
  { id: 'u-002', name: 'Seyma Aslan', email: 'seyma@example.com', role: 'editor', status: 'active', lastActive: '2026-03-21' },
  { id: 'u-003', name: 'Beyza Gultekin', email: 'beyza@example.com', role: 'user', status: 'active', lastActive: '2026-03-20' },
  { id: 'u-004', name: 'Elif Caliskaner', email: 'elif@example.com', role: 'user', status: 'suspended', lastActive: '2026-03-10' },
  { id: 'u-005', name: 'Enes Demiryurek', email: 'enes@example.com', role: 'editor', status: 'active', lastActive: '2026-03-22' },
];

// Mock sistem loglari
export const MOCK_LOGS: SystemLog[] = [
  { id: 'log-001', timestamp: '2026-03-22 14:32:10', level: 'info', module: 'NewsCollection', message: 'Haber toplama gorevi basariyla tamamlandi. 23 yeni makale.' },
  { id: 'log-002', timestamp: '2026-03-22 14:30:05', level: 'warning', module: 'NewsCollection', message: 'Sozcu kaynagindan veri cekilemedi. Yeniden deneniyor.' },
  { id: 'log-003', timestamp: '2026-03-22 13:00:00', level: 'info', module: 'Archive', message: 'Gunluk arsiv olusturuldu. 5 kullanici icin edisyon hazirlandi.' },
  { id: 'log-004', timestamp: '2026-03-21 23:45:12', level: 'error', module: 'Auth', message: 'Basarisiz giris denemesi: elif@example.com (3. deneme).' },
  { id: 'log-005', timestamp: '2026-03-21 20:15:33', level: 'info', module: 'UserProfile', message: 'Kullanici tercihleri guncellendi: u-003.' },
  { id: 'log-006', timestamp: '2026-03-21 18:00:00', level: 'info', module: 'Recommendation', message: 'Oneri motoru guncellendi. 150 kullanici icin yeni oneriler hazirlandi.' },
];

// Mock kullanim istatistikleri
export const MOCK_USAGE_STATS: UsageStats = {
  totalUsers: 156,
  activeToday: 43,
  totalNewsAccess: 1247,
  totalBookmarks: 89,
  topCategories: [
    { category: 'Teknoloji', count: 412 },
    { category: 'Ekonomi', count: 298 },
    { category: 'Spor', count: 267 },
    { category: 'Saglik', count: 158 },
    { category: 'Kultur', count: 112 },
  ],
  dailyActivity: [
    { date: '17 Mart', users: 32, newsAccess: 189 },
    { date: '18 Mart', users: 38, newsAccess: 221 },
    { date: '19 Mart', users: 41, newsAccess: 198 },
    { date: '20 Mart', users: 35, newsAccess: 245 },
    { date: '21 Mart', users: 47, newsAccess: 312 },
    { date: '22 Mart', users: 43, newsAccess: 278 },
  ],
};
