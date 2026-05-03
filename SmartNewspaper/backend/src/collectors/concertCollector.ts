import axios from 'axios';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';

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
    source: 'biletix' | 'bubilet' | 'passo';
    url: string;
    price?: string;
    available: boolean;
  }>;
  category: 'konser' | 'tiyatro' | 'stand-up';
}

class ConcertCollector {
  private baseDelay = 1000; // 1 saniye, rate limit'e saygı

  async delay(ms: number = this.baseDelay) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ─── Biletix.com ───────────────────────────────────────────
  async fetchBiletix(): Promise<ConcertEvent[]> {
    try {
      console.log('📍 Biletix.com\'dan konserler çekiliyor...');
      
      const concertUrl = 'https://www.biletix.com/kategori/konser';
      const response = await axios.get(concertUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const concerts: ConcertEvent[] = [];

      // Biletix'te konser kartlarını parse et
      $('.etkinlik-karti, [data-event-item], .event-card').each((_, element) => {
        try {
          const $card = $(element);
          
          const title = $card.find('.event-title, h3, .etkinlik-adi').text().trim();
          const artist = $card.find('.artist-name, .performer, .sanatci').text().trim() || title;
          const dateStr = $card.find('.event-date, .tarih, [data-date]').text().trim();
          const location = $card.find('.event-location, .venue, .mekan').text().trim();
          const price = $card.find('.price, .fiyat').text().trim();
          const eventUrl = $card.find('a').attr('href') || '';
          const imageUrl = $card.find('img').attr('src');

          if (title && dateStr) {
            const concert: ConcertEvent = {
              id: `biletix_${uuidv4()}`,
              title,
              artist,
              date: this.parseDate(dateStr),
              location,
              venue: location,
              description: `Sanatçı: ${artist}`,
              imageUrl,
              category: 'konser',
              ticketOptions: [
                {
                  source: 'biletix',
                  url: eventUrl || 'https://www.biletix.com/kategori/konser',
                  price,
                  available: true
                }
              ]
            };
            concerts.push(concert);
          }
        } catch (err) {
          // Parse hatası, bir sonraki öğeye devam
        }
      });

      console.log(`✅ Biletix'ten ${concerts.length} konser bulundu`);
      await this.delay();
      return concerts;
    } catch (error) {
      console.error('❌ Biletix hatası:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  // ─── BuBilet.com ───────────────────────────────────────────
  async fetchBuBilet(): Promise<ConcertEvent[]> {
    try {
      console.log('📍 BuBilet.com\'dan konserler çekiliyor...');
      
      const concertUrl = 'https://www.bubilet.com/konserler';
      const response = await axios.get(concertUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const concerts: ConcertEvent[] = [];

      // BuBilet'te konser kartlarını parse et
      $('.card, .event-item, [data-testid="event-card"]').each((_: number, element: cheerio.Element) => {
        try {
          const $card = $(element);
          
          const title = $card.find('.title, h2, .event-name').text().trim();
          const artist = title; // BuBilet'te sanatçı adı başlıkta olabiliyor
          const dateStr = $card.find('.date, .event-date, time').text().trim();
          const location = $card.find('.location, .venue').text().trim();
          const price = $card.find('.price').text().trim();
          const eventUrl = $card.find('a').attr('href') || '';
          const imageUrl = $card.find('img').attr('src');

          if (title && dateStr) {
            const concert: ConcertEvent = {
              id: `bubilet_${uuidv4()}`,
              title,
              artist,
              date: this.parseDate(dateStr),
              location,
              venue: location,
              description: `Sanatçı: ${artist}`,
              imageUrl,
              category: 'konser',
              ticketOptions: [
                {
                  source: 'bubilet',
                  url: eventUrl || 'https://www.bubilet.com/konserler',
                  price,
                  available: true
                }
              ]
            };
            concerts.push(concert);
          }
        } catch (err) {
          // Parse hatası, bir sonraki öğeye devam
        }
      });

      console.log(`✅ BuBilet'ten ${concerts.length} konser bulundu`);
      await this.delay();
      return concerts;
    } catch (error) {
      console.error('❌ BuBilet hatası:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  // ─── Passo.com.tr ───────────────────────────────────────────
  async fetchPasso(): Promise<ConcertEvent[]> {
    try {
      console.log('📍 Passo.com.tr\'den konserler çekiliyor...');
      
      const concertUrl = 'https://www.passo.com.tr/konserler';
      const response = await axios.get(concertUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const concerts: ConcertEvent[] = [];

      // Passo'da konser kartlarını parse et
      $('.event-card, .ticket-item, [class*="concert"]').each((_: number, element: cheerio.Element) => {
        try {
          const $card = $(element);
          
          const title = $card.find('.event-title, h3, .name').text().trim();
          const artist = $card.find('.artist, .performer').text().trim() || title;
          const dateStr = $card.find('.date, .event-date, .tarih').text().trim();
          const location = $card.find('.venue, .location, .mekan').text().trim();
          const price = $card.find('.price, .fiyat').text().trim();
          const eventUrl = $card.find('a').attr('href') || '';
          const imageUrl = $card.find('img').attr('src');

          if (title && dateStr) {
            const concert: ConcertEvent = {
              id: `passo_${uuidv4()}`,
              title,
              artist,
              date: this.parseDate(dateStr),
              location,
              venue: location,
              description: `Sanatçı: ${artist}`,
              imageUrl,
              category: 'konser',
              ticketOptions: [
                {
                  source: 'passo',
                  url: eventUrl || 'https://www.passo.com.tr/konserler',
                  price,
                  available: true
                }
              ]
            };
            concerts.push(concert);
          }
        } catch (err) {
          // Parse hatası, bir sonraki öğeye devam
        }
      });

      console.log(`✅ Passo'dan ${concerts.length} konser bulundu`);
      await this.delay();
      return concerts;
    } catch (error) {
      console.error('❌ Passo hatası:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  // ─── Tiyatro Etkinlikleri ───────────────────────────────────
  async fetchTheater(): Promise<ConcertEvent[]> {
    try {
      console.log('📍 Tiyatro etkinlikleri çekiliyor...');
      
      const theaterUrl = 'https://www.biletix.com/kategori/tiyatro';
      const response = await axios.get(theaterUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const theater: ConcertEvent[] = [];

      $('.etkinlik-karti, [data-event-item], .event-card').each((_, element) => {
        try {
          const $card = $(element);
          const title = $card.find('.event-title, h3').text().trim();
          const dateStr = $card.find('.event-date, .tarih').text().trim();
          const location = $card.find('.event-location, .mekan').text().trim();
          const eventUrl = $card.find('a').attr('href') || '';
          const imageUrl = $card.find('img').attr('src');

          if (title && dateStr) {
            const event: ConcertEvent = {
              id: `theater_${uuidv4()}`,
              title,
              artist: title.split('-')[0].trim(),
              date: this.parseDate(dateStr),
              location,
              venue: location,
              description: title,
              imageUrl,
              category: 'tiyatro',
              ticketOptions: [
                {
                  source: 'biletix',
                  url: eventUrl || theaterUrl,
                  available: true
                }
              ]
            };
            theater.push(event);
          }
        } catch (err) {
          // Pass
        }
      });

      console.log(`✅ Tiyatroda ${theater.length} etkinlik bulundu`);
      return theater;
    } catch (error) {
      console.error('❌ Tiyatro hatası:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  // ─── Stand-up Gösterileri ───────────────────────────────────
  async fetchStandup(): Promise<ConcertEvent[]> {
    try {
      console.log('📍 Stand-up gösterileri çekiliyor...');
      
      const standupUrl = 'https://www.biletix.com/kategori/stand-up';
      const response = await axios.get(standupUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const standup: ConcertEvent[] = [];

      $('.etkinlik-karti, [data-event-item], .event-card').each((_, element) => {
        try {
          const $card = $(element);
          const title = $card.find('.event-title, h3').text().trim();
          const dateStr = $card.find('.event-date, .tarih').text().trim();
          const location = $card.find('.event-location, .mekan').text().trim();
          const eventUrl = $card.find('a').attr('href') || '';
          const imageUrl = $card.find('img').attr('src');

          if (title && dateStr) {
            const event: ConcertEvent = {
              id: `standup_${uuidv4()}`,
              title,
              artist: title.split('-')[0].trim(),
              date: this.parseDate(dateStr),
              location,
              venue: location,
              description: title,
              imageUrl,
              category: 'stand-up',
              ticketOptions: [
                {
                  source: 'biletix',
                  url: eventUrl || standupUrl,
                  available: true
                }
              ]
            };
            standup.push(event);
          }
        } catch (err) {
          // Pass
        }
      });

      console.log(`✅ Stand-up'tan ${standup.length} gösteri bulundu`);
      return standup;
    } catch (error) {
      console.error('❌ Stand-up hatası:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  // ─── Duplicate Merge ────────────────────────────────────────
  mergeDuplicates(events: ConcertEvent[]): ConcertEvent[] {
    const merged = new Map<string, ConcertEvent>();

    for (const event of events) {
      // Normalizasyon: başlık ve tarihi kıyas
      const key = `${event.title.toLowerCase()}_${event.date.split('T')[0]}`;
      
      if (merged.has(key)) {
        // Aynı etkinlik, bilet seçeneğini ekle
        const existing = merged.get(key)!;
        const ticketExists = existing.ticketOptions.some(
          t => t.source === event.ticketOptions[0].source
        );
        if (!ticketExists) {
          existing.ticketOptions.push(...event.ticketOptions);
        }
      } else {
        merged.set(key, event);
      }
    }

    return Array.from(merged.values());
  }

  // ─── Tarih Parser ───────────────────────────────────────────
  private parseDate(dateStr: string): string {
    // Türkçe tarih formatlarını ISO 8601'e çevir
    // Örneğin: "30 Mayıs 2026 19:30" → "2026-05-30T19:30:00"
    
    const months: Record<string, number> = {
      'ocak': 1, 'şubat': 2, 'mart': 3, 'nisan': 4, 'mayıs': 5, 'haziran': 6,
      'temmuz': 7, 'ağustos': 8, 'eylül': 9, 'ekim': 10, 'kasım': 11, 'aralık': 12,
      'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
      'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
    };

    try {
      // Basit parse (site spesifik formatlar varsa özel handle et)
      const normalized = dateStr.toLowerCase();
      let date = new Date();

      // "30 mayıs 2026 19:30" gibi formatlar
      const dayMatch = dateStr.match(/(\d{1,2})/);
      const timeMatch = dateStr.match(/(\d{1,2}):(\d{2})/);
      
      for (const [monthName, monthNum] of Object.entries(months)) {
        if (normalized.includes(monthName)) {
          const day = dayMatch ? parseInt(dayMatch[0]) : 1;
          const hour = timeMatch ? parseInt(timeMatch[1]) : 19;
          const minute = timeMatch ? parseInt(timeMatch[2]) : 0;
          const year = dateStr.match(/202\d/) ? parseInt(dateStr.match(/202\d/)![0]) : new Date().getFullYear();

          date = new Date(year, monthNum - 1, day, hour, minute, 0);
          break;
        }
      }

      return date.toISOString();
    } catch {
      // Parse başarısızsa bugünün tarihini dön
      return new Date().toISOString();
    }
  }

  // ─── Main Collector ─────────────────────────────────────────
  async collectAll(): Promise<ConcertEvent[]> {
    console.log('🎪 Konser verisi toplamaya başlanıyor...');

    // TEST MOCK VERİSİ - GELIŞTIRME AŞAMASINDA
    const mockConcerts: ConcertEvent[] = [
      {
        id: 'mock_1',
        title: 'Gülben Ergen Konser',
        artist: 'Gülben Ergen',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 gün sonra
        location: 'İstanbul',
        venue: 'Lütfi Kırdar Konser Salonu',
        description: 'Efsane sanatçı Gülben Ergen\'in canlı performansı',
        category: 'konser',
        ticketOptions: [
          { source: 'biletix', url: 'https://www.biletix.com/kategori/konser', price: '500₺', available: true },
          { source: 'bubilet', url: 'https://www.bubilet.com/konserler', price: '520₺', available: true }
        ]
      },
      {
        id: 'mock_2',
        title: 'Aydemir Akbaş Stand-up Show',
        artist: 'Aydemir Akbaş',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 gün sonra
        location: 'Ankara',
        venue: 'Ankara Opera House',
        description: 'Ünlü komedyen Aydemir Akbaş\'ın komik gösterisi',
        category: 'stand-up',
        ticketOptions: [
          { source: 'biletix', url: 'https://www.biletix.com/kategori/stand-up', price: '150₺', available: true }
        ]
      },
      {
        id: 'mock_3',
        title: 'Molière\'in "Cimri" Tiyatrosu',
        artist: 'Boşnak Tiyatro',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 gün sonra
        location: 'İzmir',
        venue: 'İzmir Devlet Tiyatrosu',
        description: 'Klasik tiyatro oyunu - Molière\'in şaheserinden uyarlama',
        category: 'tiyatro',
        ticketOptions: [
          { source: 'passo', url: 'https://www.passo.com.tr/tiyatro', price: '200₺', available: true }
        ]
      },
      {
        id: 'mock_4',
        title: 'Tarkan "Metamorfoz Dünü" Konseri',
        artist: 'Tarkan',
        date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 gün sonra
        location: 'Antalya',
        venue: 'Konyaaltı Sahili Açık Hava Sahnesi',
        description: 'Tarkan\'ın "Metamorfoz Dünü" albüm turası',
        category: 'konser',
        ticketOptions: [
          { source: 'biletix', url: 'https://www.biletix.com/kategori/konser', price: '800₺', available: true },
          { source: 'bubilet', url: 'https://www.bubilet.com/konserler', price: '850₺', available: true },
          { source: 'passo', url: 'https://www.passo.com.tr/konserler', price: '800₺', available: true }
        ]
      },
      {
        id: 'mock_5',
        title: 'Cem Adrian Canlı Performansı',
        artist: 'Cem Adrian',
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 gün sonra
        location: 'Bursa',
        venue: 'Bursa Nilüfer Sahnesi',
        description: 'Müzisyen Cem Adrian\'ın samimi konseri',
        category: 'konser',
        ticketOptions: [
          { source: 'bubilet', url: 'https://www.bubilet.com/konserler', price: '350₺', available: true }
        ]
      }
    ];

    // Gerçek veri toplama (şimdilik devre dışı - test için mock verileri döner)
    // const [biletix, bubilet, passo, theater, standup] = await Promise.all([
    //   this.fetchBiletix(),
    //   this.fetchBuBilet(),
    //   this.fetchPasso(),
    //   this.fetchTheater(),
    //   this.fetchStandup()
    // ]);

    // const all = [...biletix, ...bubilet, ...passo, ...theater, ...standup];
    // const merged = this.mergeDuplicates(all);

    console.log(`🎉 Toplam ${mockConcerts.length} test etkinliği yüklendi`);
    return mockConcerts;
  }
}

export const concertCollector = new ConcertCollector();
