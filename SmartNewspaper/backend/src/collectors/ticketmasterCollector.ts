import axios from 'axios';
import { ConcertEvent } from './concertCollector';

interface TicketmasterEvent {
  id: string;
  name: string;
  description?: string;
  dates?: {
    start?: {
      localDate?: string;
      localTime?: string;
    };
  };
  _embedded?: {
    venues?: Array<{
      name?: string;
      city?: {
        name?: string;
      };
      state?: {
        name?: string;
      };
      address?: {
        line1?: string;
      };
    }>;
    attractions?: Array<{
      name?: string;
    }>;
  };
  images?: Array<{
    url?: string;
    height?: number;
  }>;
  url?: string;
  priceRanges?: Array<{
    min?: number;
    max?: number;
    currency?: string;
  }>;
  classifications?: Array<{
    segment?: {
      name?: string;
    };
    genre?: {
      name?: string;
    };
    subGenre?: {
      name?: string;
    };
    type?: {
      name?: string;
    };
  }>;
}

interface TicketmasterResponse {
  _embedded?: {
    events?: TicketmasterEvent[];
  };
  page?: {
    totalElements: number;
    size: number;
  };
}

class TicketmasterCollector {
  private readonly DISCOVERY_URL = 'https://app.ticketmaster.com/discovery/v2';

  constructor() {
    console.log('✅ Ticketmaster Collector başlatıldı');
  }

  /**
   * Consumer Key'i dinamik olarak al (.env timing sorunu çözmek için)
   */
  private get consumerKey(): string {
    return process.env.TICKETMASTER_CONSUMER_KEY || '';
  }

  /**
   * API'nin kullanılabilir olup olmadığını kontrol et
   */
  private get isAvailable(): boolean {
    return !!this.consumerKey;
  }

  /**
   * Ticketmaster'dan etkinlikleri çek (Public API) - Türkiye marketplace
   */
  async fetchEvents(pageSize: number = 50): Promise<ConcertEvent[]> {
    // Ticketmaster env değişkeni yoksa boş array döner
    if (!this.isAvailable) {
      console.log('ℹ️ Ticketmaster API key bulunamadı, boş veri döndürülüyor...');
      return [];
    }

    try {
      console.log(`📍 Ticketmaster (Türkiye) konserler çekiliyor...`);

      const url = `${this.DISCOVERY_URL}/events.json`;

      // Türkiye için doğru parametreler
      const response = await axios.get<TicketmasterResponse>(url, {
        params: {
          apikey: this.consumerKey,
          source: 'wts-tr', // Ticketmaster Türkiye marketplace
          size: pageSize,
          sort: 'date,asc',
          locale: 'tr-TR,*'
        },
        timeout: 15000
      });

      const events: ConcertEvent[] = [];

      if (response.data._embedded?.events) {
        for (const event of response.data._embedded.events) {
          const concertEvent = this.parseTicketmasterEvent(event);
          if (concertEvent) {
            events.push(concertEvent);
          }
        }
      }

      console.log(`✅ Ticketmaster'dan ${events.length} etkinlik bulundu`);
      return events;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('❌ Ticketmaster API hatası:', error.response?.status, error.response?.statusText);
        if (error.response?.data) {
          console.error('Response:', error.response.data);
        }
      } else {
        console.error('❌ Ticketmaster hatası:', error instanceof Error ? error.message : error);
      }
      return [];
    }
  }

  /**
   * Ticketmaster event'ini ConcertEvent'e çevir
   */
  private parseTicketmasterEvent(event: TicketmasterEvent): ConcertEvent | null {
    try {
      if (!event.name || !event.id) {
        return null;
      }

      // Venue bilgisi
      const venue = event._embedded?.venues?.[0];
      const location = venue?.city?.name || venue?.state?.name || 'Bilinmiyor';
      const venueName = venue?.name || 'Bilinmiyor';

      // Tarih bilgisi
      const dateStr = event.dates?.start?.localDate;
      const timeStr = event.dates?.start?.localTime;

      if (!dateStr) {
        return null;
      }

      const date = new Date(`${dateStr}T${timeStr || '19:00:00'}`);

      // Sanatçı bilgisi
      const artist = event._embedded?.attractions?.[0]?.name || event.name;

      // Resim URL'i (en yüksek kalitelisini seç)
      const image = event.images?.sort((a, b) => (b.height || 0) - (a.height || 0))?.[0];
      const imageUrl = image?.url;

      // Fiyat bilgisi
      const priceRange = event.priceRanges?.[0];
      let priceStr = '';
      if (priceRange) {
        const currency = priceRange.currency || 'USD';
        if (priceRange.min && priceRange.max) {
          priceStr = `${priceRange.min}-${priceRange.max} ${currency}`;
        } else if (priceRange.min) {
          priceStr = `${priceRange.min} ${currency}+`;
        }
      }

      // Kategori belirle - segment ve genre bilgisine göre
      const segment = event.classifications?.[0]?.segment?.name?.toLowerCase() || '';
      const genre = event.classifications?.[0]?.genre?.name?.toLowerCase() || '';
      const subGenre = event.classifications?.[0]?.subGenre?.name?.toLowerCase() || '';
      const type = event.classifications?.[0]?.type?.name?.toLowerCase() || '';
      
      let category: 'konser' | 'tiyatro' | 'stand-up' = 'konser';
      
      // Kategori belirleme: segment → genre → subgenre → type kontrol sırasıyla
      const classificationText = `${segment} ${genre} ${subGenre} ${type}`.toLowerCase();
      
      if (classificationText.includes('comedy') || classificationText.includes('stand-up') || classificationText.includes('standup')) {
        category = 'stand-up';
      } else if (classificationText.includes('theater') || classificationText.includes('theatre') || classificationText.includes('tiyatro')) {
        category = 'tiyatro';
      } else if (classificationText.includes('opera') || classificationText.includes('ballet') || classificationText.includes('bale') || 
                 classificationText.includes('dance') || classificationText.includes('sports') || classificationText.includes('spor')) {
        // Opera, Bale, Spor vb. etkinlikleri konser olarak kategorilendir (genel event)
        category = 'konser';
      }
      // Varsayılan olarak konser

      const concertEvent: ConcertEvent = {
        id: `ticketmaster_${event.id}`,
        title: event.name,
        artist,
        date: date.toISOString(),
        location,
        venue: venueName,
        description: event.description || `${artist} tarafından sunuluyor`,
        imageUrl,
        category,
        ticketOptions: [
          {
            source: 'ticketmaster',
            url: event.url || 'https://www.ticketmaster.com',
            price: priceStr || undefined,
            available: true
          }
        ]
      };

      return concertEvent;
    } catch (error) {
      console.error('Ticketmaster event parse hatası:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * Türkiye'de yaklaşan konserler
   */
  async fetchTurkeyEvents(pageSize: number = 50): Promise<ConcertEvent[]> {
    return this.fetchEvents(pageSize);
  }

  /**
   * Belirtilen şehirde konserler
   */
  async fetchEventsByCity(cityName: string, pageSize: number = 50): Promise<ConcertEvent[]> {
    if (!this.isAvailable) {
      console.log('ℹ️ Ticketmaster API key yok, boş veri döndürülüyor...');
      return [];
    }

    try {
      console.log(`📍 Ticketmaster'dan ${cityName} için konserler çekiliyor...`);

      const response = await axios.get<TicketmasterResponse>(
        `${this.DISCOVERY_URL}/events.json`,
        {
          params: {
            apikey: this.consumerKey,
            countryCode: 'TR',
            city: cityName,
            size: pageSize,
            sort: 'date,asc'
          },
          timeout: 15000
        }
      );

      const events: ConcertEvent[] = [];

      if (response.data._embedded?.events) {
        for (const event of response.data._embedded.events) {
          const concertEvent = this.parseTicketmasterEvent(event);
          if (concertEvent) {
            events.push(concertEvent);
          }
        }
      }

      console.log(`✅ Ticketmaster'dan ${cityName}'de ${events.length} etkinlik bulundu`);
      return events;
    } catch (error) {
      console.error(`❌ Ticketmaster ${cityName} hatası:`, error instanceof Error ? error.message : error);
      return [];
    }
  }
}

export const ticketmasterCollector = new TicketmasterCollector();
export { TicketmasterCollector };
