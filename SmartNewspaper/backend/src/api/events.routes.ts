import { Router, Request, Response } from 'express';
import { getEvents, getEventById, getAnnouncements } from '../db/eventsRepository';

const router = Router();

// GET /api/events — Tüm etkinlikleri getir (filtrelenebilir)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, important, upcoming } = req.query;

    const result = await getEvents({
      category: category ? String(category) : undefined,
      important: important === 'true' ? true : undefined,
      upcoming: upcoming === 'true' ? true : upcoming === 'false' ? false : undefined,
    });

    res.json(result);
  } catch (err) {
    console.error('[EventsAPI] Etkinlik listesi hatası:', err);
    res.status(500).json({ error: 'Etkinlikler alınamadı' });
  }
});

// GET /api/events/announcements/list — Tüm duyurular
router.get('/announcements/list', async (req: Request, res: Response) => {
  try {
    const { priority } = req.query;
    const result = await getAnnouncements({
      priority: priority ? String(priority) : undefined,
    });
    res.json(result);
  } catch (err) {
    console.error('[EventsAPI] Duyuru listesi hatası:', err);
    res.status(500).json({ error: 'Duyurular alınamadı' });
  }
});

// GET /api/events/:id — Tek etkinlik
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const event = await getEventById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Etkinlik bulunamadı' });
    return res.json(event);
  } catch (err) {
    console.error('[EventsAPI] Etkinlik detay hatası:', err);
    return res.status(500).json({ error: 'Etkinlik alınamadı' });
  }
});

export default router;
