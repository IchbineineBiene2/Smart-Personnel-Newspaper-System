import { Platform } from 'react-native';

const API_BASE =
  Platform.OS === 'web'
    ? 'http://localhost:3000'
    : Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';

export type EventCategory = 'akademik' | 'sosyal' | 'son-tarih' | 'sinav' | 'genel' | 'konser' | 'tiyatro' | 'stand-up';

export type TicketSource = 'biletix' | 'bubilet' | 'passo';

export interface TicketOption {
  source: TicketSource;
  url: string;
  price?: string;
  available: boolean;
}

export interface ApiEvent {
  id: string;
  title: string;
  summary: string;
  description: string;
  date: string;
  location: string;
  category: EventCategory;
  isImportant: boolean;
  imageUrl?: string;
  createdAt: string;
  ticketOptions?: TicketOption[];
  artist?: string;
  venue?: string;
}

export interface ApiAnnouncement {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  expiresAt?: string;
  priority: 'critical' | 'normal';
}

export async function fetchEvents(params?: {
  category?: EventCategory;
  important?: boolean;
  upcoming?: boolean;
}): Promise<ApiEvent[]> {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.important !== undefined) query.set('important', String(params.important));
  if (params?.upcoming !== undefined) query.set('upcoming', String(params.upcoming));

  const qs = query.toString();
  const res = await fetch(`${API_BASE}/api/events${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Etkinlikler yüklenemedi');
  const data = await res.json();
  return Array.isArray(data.events) ? data.events as ApiEvent[] : [];
}

export async function fetchEventById(id: string): Promise<ApiEvent> {
  const res = await fetch(`${API_BASE}/api/events/${id}`);
  if (!res.ok) throw new Error('Etkinlik bulunamadı');
  return res.json();
}

export async function fetchAnnouncements(params?: {
  priority?: 'critical' | 'normal';
}): Promise<ApiAnnouncement[]> {
  const query = new URLSearchParams();
  if (params?.priority) query.set('priority', params.priority);

  const qs = query.toString();
  const res = await fetch(`${API_BASE}/api/events/announcements/list${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Duyurular yüklenemedi');
  const data = await res.json();
  return Array.isArray(data.announcements) ? data.announcements as ApiAnnouncement[] : [];
}

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  akademik: 'Akademik',
  sosyal: 'Sosyal',
  konser: 'Konser',
  tiyatro: 'Tiyatro',
  'stand-up': 'Stand-up',
  'son-tarih': 'Son Tarih',
  sinav: 'Sınav',
  genel: 'Genel',
};

export const EVENT_CATEGORY_COLORS: Record<EventCategory, string> = {
  akademik: '#3B82F6',
  sosyal: '#10B981',
  konser: '#EC4899',   // Pink
  tiyatro: '#8B5CF6',  // Purple
  'stand-up': '#F97316', // Orange
  'son-tarih': '#EF4444',
  sinav: '#F59E0B',
  genel: '#6B7280',
};
