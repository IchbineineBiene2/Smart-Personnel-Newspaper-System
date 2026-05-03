import { Router, Request, Response } from 'express';
import { concertCollector } from '../collectors/concertCollector';

const router = Router();

// Cache
let cachedConcerts: any[] = [];
let cacheTimestamp: number = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 saat

/**
 * GET /api/concerts
 * Konser, tiyatro, stand-up etkinliklerini döner
 * Query params:
 *   - category: 'konser' | 'tiyatro' | 'stand-up'
 *   - source: 'biletix' | 'bubilet' | 'passo'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, source } = req.query;

    // Cache kontrol
    if (cachedConcerts.length > 0 && Date.now() - cacheTimestamp < CACHE_DURATION) {
      console.log('[API] Konserler cache\'den sunuluyor');
      let filtered = cachedConcerts;

      if (category) {
        filtered = filtered.filter(c => c.category === category);
      }
      if (source) {
        filtered = filtered.filter(c => 
          c.ticketOptions.some((t: any) => t.source === source)
        );
      }

      return res.json({
        success: true,
        count: filtered.length,
        events: filtered,
        cached: true
      });
    }

    // Konserler topla
    console.log('[API] Konserler toplama başlıyor...');
    const concerts = await concertCollector.collectAll();
    
    // Cache'e kaydet
    cachedConcerts = concerts;
    cacheTimestamp = Date.now();

    // Filtrele
    let filtered = concerts;
    if (category) {
      filtered = filtered.filter(c => c.category === category);
    }
    if (source) {
      filtered = filtered.filter(c => 
        c.ticketOptions.some((t: any) => t.source === source)
      );
    }

    res.json({
      success: true,
      count: filtered.length,
      events: filtered,
      cached: false
    });
  } catch (err) {
    console.error('[API] Konser getirme hatası:', err);
    res.status(500).json({
      success: false,
      error: 'Konserler yüklenemedi',
      message: err instanceof Error ? err.message : 'Bilinmeyen hata'
    });
  }
});

/**
 * GET /api/concerts/search
 * Konser arama (başlık/sanatçı)
 * Query params:
 *   - q: arama terimi
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Arama terimi gerekli (q parametresi)'
      });
    }

    // Cache kontrol
    if (cachedConcerts.length === 0 || Date.now() - cacheTimestamp > CACHE_DURATION) {
      cachedConcerts = await concertCollector.collectAll();
      cacheTimestamp = Date.now();
    }

    const query = q.toLowerCase();
    const results = cachedConcerts.filter(c =>
      c.title.toLowerCase().includes(query) ||
      c.artist.toLowerCase().includes(query) ||
      c.venue.toLowerCase().includes(query) ||
      c.location.toLowerCase().includes(query)
    );

    res.json({
      success: true,
      count: results.length,
      events: results
    });
  } catch (err) {
    console.error('[API] Konser arama hatası:', err);
    res.status(500).json({
      success: false,
      error: 'Arama yapılamadı'
    });
  }
});

/**
 * GET /api/concerts/:id
 * Tek bir konser detayı
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (cachedConcerts.length === 0 || Date.now() - cacheTimestamp > CACHE_DURATION) {
      cachedConcerts = await concertCollector.collectAll();
      cacheTimestamp = Date.now();
    }

    const concert = cachedConcerts.find(c => c.id === id);
    
    if (!concert) {
      return res.status(404).json({
        success: false,
        error: 'Konser bulunamadı'
      });
    }

    res.json({
      success: true,
      event: concert
    });
  } catch (err) {
    console.error('[API] Konser detay hatası:', err);
    res.status(500).json({
      success: false,
      error: 'Konser detayı yüklenemedi'
    });
  }
});

/**
 * GET /api/concerts/venues/unique
 * Benzersiz mekanları döner
 */
router.get('/venues/unique', async (req: Request, res: Response) => {
  try {
    if (cachedConcerts.length === 0 || Date.now() - cacheTimestamp > CACHE_DURATION) {
      cachedConcerts = await concertCollector.collectAll();
      cacheTimestamp = Date.now();
    }

    const venues = [...new Set(cachedConcerts.map(c => c.venue))];

    res.json({
      success: true,
      count: venues.length,
      venues
    });
  } catch (err) {
    console.error('[API] Mekan listesi hatası:', err);
    res.status(500).json({
      success: false,
      error: 'Mekanlar yüklenemedi'
    });
  }
});

export default router;
