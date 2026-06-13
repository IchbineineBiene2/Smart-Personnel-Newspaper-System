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
    console.log('[Concert Collector] Konser verisi toplanıyor...');

    let dbEvents: ConcertEvent[] = [];
    try {
      const { concerts: dbConcerts } = await getConcerts();
      console.log(`[Concert Collector] DB'den ${dbConcerts.length} konser yüklendi`);

      dbEvents = dbConcerts.map((concert) => ({
        id: concert.id,
        title: concert.title,
        artist: concert.artist,
        date: concert.date,
        location: concert.location,
        venue: concert.venue,
        description: concert.description,
        imageUrl: concert.imageUrl,
        ticketOptions: concert.ticketUrl
          ? [
              {
                source: 'biletix' as const,
                url: concert.ticketUrl,
                price: concert.price,
                available: true,
              },
            ]
          : [],
        category: concert.category,
      }));
    } catch (error) {
      console.error(
        '[Concert Collector] DB konser verisi yüklenemedi:',
        error instanceof Error ? error.message : error
      );
    }

    let ticketmasterEvents: ConcertEvent[] = [];
    try {
      ticketmasterEvents = await ticketmasterCollector.fetchTurkeyEvents(50);
      console.log(`[Concert Collector] Ticketmaster'dan ${ticketmasterEvents.length} etkinlik yüklendi`);
    } catch (error) {
      console.error(
        '[Concert Collector] Ticketmaster verisi yüklenemedi:',
        error instanceof Error ? error.message : error
      );
    }

    return [...ticketmasterEvents, ...dbEvents];
  }
}

export const concertCollector = new ConcertCollector();
export { ConcertCollector };
