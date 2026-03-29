import { Router, Request, Response } from 'express';
import { EVENTS_SEED, ANNOUNCEMENTS_SEED } from '../data/eventsData';
import { EventCategory } from '../models/Event';

const router = Router();

// GET /api/events — Tüm etkinlikleri getir (filtrelenebilir)
router.get('/', (req: Request, res: Response) => {
  const { category, important, upcoming } = req.query;
  const now = new Date().toISOString();

  let events = [...EVENTS_SEED];

  if (category) {
    events = events.filter((e) => e.category === (category as EventCategory));
  }

  if (important === 'true') {
    events = events.filter((e) => e.isImportant);
  }

  // upcoming=true → sadece gelecekteki etkinlikler, upcoming=false → geçmiş
  if (upcoming === 'true') {
    events = events.filter((e) => e.date >= now);
  } else if (upcoming === 'false') {
    events = events.filter((e) => e.date < now);
  }

  // Tarihe göre artan sırala (yaklaşan en üstte)
  events.sort((a, b) => a.date.localeCompare(b.date));

  res.json({ total: events.length, events });
});

// GET /api/events/:id — Tek etkinlik
router.get('/:id', (req: Request, res: Response) => {
  const event = EVENTS_SEED.find((e) => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Etkinlik bulunamadı' });
  return res.json(event);
});

// GET /api/events/announcements/list — Tüm duyurular
router.get('/announcements/list', (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const { priority } = req.query;

  let announcements = ANNOUNCEMENTS_SEED.filter(
    (a) => !a.expiresAt || a.expiresAt > now
  );

  if (priority) {
    announcements = announcements.filter((a) => a.priority === priority);
  }

  // Tarihe göre azalan sırala (en yeni üstte)
  announcements.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  res.json({ total: announcements.length, announcements });
});

export default router;