
import { ticketmasterCollector } from './ticketmasterCollector';
import { getConcerts } from '../db/concertsRepository';

export interface ConcertEvent {
  id: string;
  title: string;
  artist: string;
  date: string;
  location: string;
  venue: string;
  description: string;
  imageUrl?: string;
  ticketOptions: Array<{
    source: 'ticketmaster' | 'biletix' | 'bubilet' | 'passo';
    url: string;
    price?: string;
    available: boolean;
  }>;
  category: 'konser' | 'tiyatro' | 'stand-up';
}

class ConcertCollector {
  async collectAll(): Promise<ConcertEvent[]> {
    console.log('🎪 Konser verisi toplamaya başlanıyor...');

    try {
      // Önce DB'den seed verileri al
      const { concerts: dbConcerts } = await getConcerts();
      console.log(`✅ Veritabanından ${dbConcerts.length} konser yüklendi`);

      // DB'den gelen verileri ConcertEvent'e dönüştür
      const dbEvents: ConcertEvent[] = dbConcerts.map((c) => ({
        id: c.id,
        title: c.title,
        artist: c.artist,
        date: c.date,
        location: c.location,
        venue: c.venue,
        description: c.description,
        imageUrl: c.imageUrl,
        ticketOptions: c.ticketUrl ? [
          {
            source: 'biletix' as const,
            url: c.ticketUrl,
            price: c.price,
            available: true,
          }
        ] : [],
        category: c.category,
      }));

      // Ticketmaster'dan da verileri almayı dene
      let ticketmasterEvents: ConcertEvent[] = [];
      try {
        ticketmasterEvents = await ticketmasterCollector.fetchTurkeyEvents(50);
        console.log(`✅ Ticketmaster'dan ${ticketmasterEvents.length} etkinlik yüklendi`);
      } catch (err) {
        console.log('ℹ️ Ticketmaster verisi yüklenemedi, sadece DB verisi kullanılıyor');
      }

      // Her ikisini birleştir (Ticketmaster eventleri başa, DB eventleri arka)
      return [...ticketmasterEvents, ...dbEvents];
    } catch (error) {
      console.error('❌ Konser toplama hatası:', error instanceof Error ? error.message : error);
      return [];
    }
  }
}

export const concertCollector = new ConcertCollector();
export { ConcertCollector };
