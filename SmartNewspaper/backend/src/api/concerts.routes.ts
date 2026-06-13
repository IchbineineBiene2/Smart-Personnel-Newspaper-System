import { Router, Request, Response } from 'express';
import { ConcertEvent, concertCollector } from '../collectors/concertCollector';

const router = Router();

let cachedConcerts: ConcertEvent[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000;

function filterConcerts(
  concerts: ConcertEvent[],
  category?: unknown,
  source?: unknown
): ConcertEvent[] {
  let filtered = concerts;

  if (typeof category === 'string') {
    filtered = filtered.filter((concert) => concert.category === category);
  }

  if (typeof source === 'string') {
    filtered = filtered.filter((concert) =>
      concert.ticketOptions.some((ticket) => ticket.source === source)
    );
  }

  return filtered;
}

function isCacheFresh(): boolean {
  return cachedConcerts.length > 0 && Date.now() - cacheTimestamp < CACHE_DURATION;
}

async function refreshConcertCache(): Promise<ConcertEvent[]> {
  const concerts = await concertCollector.collectAll();
  if (concerts.length > 0) {
    cachedConcerts = concerts;
    cacheTimestamp = Date.now();
  }
  return concerts;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, source } = req.query;

    if (isCacheFresh()) {
      const filtered = filterConcerts(cachedConcerts, category, source);
      return res.json({
        success: true,
        count: filtered.length,
        events: filtered,
        cached: true,
      });
    }

    console.log('[API] Konserler toplama basliyor...');
    const concerts = await refreshConcertCache();
    const sourceConcerts = concerts.length > 0 ? concerts : cachedConcerts;
    const filtered = filterConcerts(sourceConcerts, category, source);

    return res.json({
      success: true,
      count: filtered.length,
      events: filtered,
      cached: concerts.length === 0 && cachedConcerts.length > 0,
      stale: concerts.length === 0 && cachedConcerts.length > 0,
    });
  } catch (err) {
    if (cachedConcerts.length > 0) {
      const filtered = filterConcerts(cachedConcerts, req.query.category, req.query.source);
      return res.json({
        success: true,
        count: filtered.length,
        events: filtered,
        cached: true,
        stale: true,
      });
    }

    console.error('[API] Konser getirme hatasi:', err);
    return res.status(500).json({
      success: false,
      error: 'Konserler yuklenemedi',
      message: err instanceof Error ? err.message : 'Bilinmeyen hata',
    });
  }
});

router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Arama terimi gerekli (q parametresi)',
      });
    }

    if (!isCacheFresh()) {
      await refreshConcertCache();
    }

    const query = q.toLowerCase();
    const results = cachedConcerts.filter((concert) =>
      concert.title.toLowerCase().includes(query) ||
      concert.artist.toLowerCase().includes(query) ||
      concert.venue.toLowerCase().includes(query) ||
      concert.location.toLowerCase().includes(query)
    );

    return res.json({
      success: true,
      count: results.length,
      events: results,
    });
  } catch (err) {
    console.error('[API] Konser arama hatasi:', err);
    return res.status(500).json({
      success: false,
      error: 'Arama yapilamadi',
    });
  }
});

router.get('/venues/unique', async (_req: Request, res: Response) => {
  try {
    if (!isCacheFresh()) {
      await refreshConcertCache();
    }

    const venues = [...new Set(cachedConcerts.map((concert) => concert.venue))];
    return res.json({
      success: true,
      count: venues.length,
      venues,
    });
  } catch (err) {
    console.error('[API] Mekan listesi hatasi:', err);
    return res.status(500).json({
      success: false,
      error: 'Mekanlar yuklenemedi',
    });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!isCacheFresh()) {
      await refreshConcertCache();
    }

    const concert = cachedConcerts.find((item) => item.id === id);
    if (!concert) {
      return res.status(404).json({
        success: false,
        error: 'Konser bulunamadi',
      });
    }

    return res.json({
      success: true,
      event: concert,
    });
  } catch (err) {
    console.error('[API] Konser detay hatasi:', err);
    return res.status(500).json({
      success: false,
      error: 'Konser detayi yuklenemedi',
    });
  }
});

export default router;
