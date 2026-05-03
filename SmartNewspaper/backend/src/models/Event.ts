export type EventCategory = 'akademik' | 'sosyal' | 'son-tarih' | 'sinav' | 'genel' | 'konser' | 'tiyatro' | 'stand-up';

export type TicketSource = 'biletix' | 'bubilet' | 'passo';

export interface TicketOption {
  source: TicketSource;
  url: string;
  price?: string; // "250 TL - 500 TL" gibi aralık
  available: boolean;
}

export interface Event {
  id: string;
  title: string;
  summary: string;
  description: string;
  date: string;       // ISO 8601: "2026-04-10T10:00:00"
  location: string;
  category: EventCategory;
  isImportant: boolean;
  imageUrl?: string;
  createdAt: string;
  ticketOptions?: TicketOption[]; // Bilet satın alma seçenekleri
  artist?: string;    // Konser/tiyatro/stand-up için sanatçı adı
  venue?: string;     // Mekan adı (ek bilgi)
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  publishedAt: string;  // ISO 8601
  expiresAt?: string;   // ISO 8601 — bu tarihten sonra gösterilmez
  priority: 'critical' | 'normal';
}