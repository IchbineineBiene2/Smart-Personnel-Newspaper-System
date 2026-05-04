import { query } from './index';
import { Event as EventItem, Announcement, EventCategory } from '../models/Event';

interface EventRow {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  event_date: Date;
  location: string | null;
  category: string;
  is_important: boolean;
  image_url: string | null;
  created_at: Date;
}

interface AnnouncementRow {
  id: string;
  title: string;
  content: string;
  published_at: Date;
  expires_at: Date | null;
  priority: string;
}

function rowToEvent(row: EventRow): EventItem {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary ?? '',
    description: row.description ?? '',
    date: row.event_date.toISOString(),
    location: row.location ?? '',
    category: row.category as EventCategory,
    isImportant: row.is_important,
    imageUrl: row.image_url ?? undefined,
    createdAt: row.created_at.toISOString(),
  };
}

function rowToAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    publishedAt: row.published_at.toISOString(),
    expiresAt: row.expires_at?.toISOString() ?? undefined,
    priority: row.priority as Announcement['priority'],
  };
}

export async function getEvents(params: {
  category?: string;
  important?: boolean;
  upcoming?: boolean;
}): Promise<{ total: number; events: EventItem[] }> {
  const { category, important, upcoming } = params;
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (category)           { conditions.push(`category = $${idx++}`); values.push(category); }
  if (important === true)  { conditions.push(`is_important = TRUE`); }
  if (upcoming === true)   { conditions.push(`event_date > NOW()`); }
  if (upcoming === false)  { conditions.push(`event_date <= NOW()`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query<EventRow>(
    `SELECT * FROM events ${where} ORDER BY event_date ASC`,
    values
  );

  const events = result.rows.map(rowToEvent);
  return { total: events.length, events };
}

export async function getEventById(id: string): Promise<EventItem | null> {
  const result = await query<EventRow>(
    'SELECT * FROM events WHERE id = $1',
    [id]
  );
  return result.rows[0] ? rowToEvent(result.rows[0]) : null;
}

export async function getAnnouncements(params: {
  priority?: string;
}): Promise<{ total: number; announcements: Announcement[] }> {
  const { priority } = params;
  const conditions: string[] = ['(expires_at IS NULL OR expires_at > NOW())'];
  const values: unknown[] = [];
  let idx = 1;

  if (priority) { conditions.push(`priority = $${idx++}`); values.push(priority); }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const result = await query<AnnouncementRow>(
    `SELECT * FROM announcements ${where} ORDER BY published_at DESC`,
    values
  );

  const announcements = result.rows.map(rowToAnnouncement);
  return { total: announcements.length, announcements };
}
