import { ticketmasterCollector } from './ticketmasterCollector';

export interface ConcertEvent {
  id: string;
  title: string;
  artist: string;
  date: string; // ISO 8601
  location: string;
  venue: string;
  description: string;
  imageUrl?: string;
  ticketOptions: Array<{
    source: 'ticketmaster';
    url: string;
    price?: string;
    available: boolean;
  }>;
  category: 'konser' | 'tiyatro' | 'stand-up';
}

/**
 * Ticketmaster API'den konser/tiyatro/stand-up etkinlikleri topla
 */
class ConcertCollector {
  async collectAll(): Promise<ConcertEvent[]> {
    console.log('🎪 Konser verisi toplamaya başlanıyor...');
    
    try {
      const events = await ticketmasterCollector.fetchTurkeyEvents(50);
      console.log(`✅ Ticketmaster'dan ${events.length} etkinlik yüklendi`);
      return events;
    } catch (error) {
      console.error('❌ Konser toplama hatası:', error instanceof Error ? error.message : error);
      return [];
    }
  }
}

export const concertCollector = new ConcertCollector();
export { ConcertCollector };
