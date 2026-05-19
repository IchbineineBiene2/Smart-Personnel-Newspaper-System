import { query } from './index';

export interface Concert {
  id: string;
  title: string;
  artist: string;
  description: string;
  date: string;
  location: string;
  venue: string;
  category: 'konser' | 'tiyatro' | 'stand-up';
  imageUrl?: string;
  ticketUrl?: string;
  price?: string;
  createdAt: string;
}

interface ConcertRow {
  id: string;
  title: string;
  artist: string | null;
  description: string | null;
  event_date: Date;
  location: string | null;
  venue: string | null;
  category: string;
  image_url: string | null;
  ticket_url: string | null;
  price: string | null;
  created_at: Date;
}

function rowToConcert(row: ConcertRow): Concert {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist ?? '',
    description: row.description ?? '',
    date: row.event_date.toISOString(),
    location: row.location ?? '',
    venue: row.venue ?? '',
    category: row.category as Concert['category'],
    imageUrl: row.image_url ?? undefined,
    ticketUrl: row.ticket_url ?? undefined,
    price: row.price ?? undefined,
    createdAt: row.created_at.toISOString(),
  };
}

export async function getConcerts(params?: {
  category?: string;
}): Promise<{ total: number; concerts: Concert[] }> {
  const { category } = params || {};
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (category) {
    conditions.push(`category = $${idx++}`);
    values.push(category);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query<ConcertRow>(
    `SELECT * FROM concerts ${where} ORDER BY event_date ASC`,
    values
  );

  const concerts = result.rows.map(rowToConcert);
  return { total: concerts.length, concerts };
}

export async function getConcertById(id: string): Promise<Concert | null> {
  const result = await query<ConcertRow>(
    'SELECT * FROM concerts WHERE id = $1',
    [id]
  );
  return result.rows[0] ? rowToConcert(result.rows[0]) : null;
}
