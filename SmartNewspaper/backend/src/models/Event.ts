export type EventCategory = 'akademik' | 'sosyal' | 'son-tarih' | 'sinav' | 'genel';

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
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  publishedAt: string;  // ISO 8601
  expiresAt?: string;   // ISO 8601 — bu tarihten sonra gösterilmez
  priority: 'critical' | 'normal';
}