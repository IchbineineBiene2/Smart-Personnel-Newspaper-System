import axios from 'axios';
import { query } from '../db/index';

const CALENDARIFIC_BASE = 'https://calendarific.com/api/v2/holidays';

const COUNTRIES = [
  { code: 'TR', name: 'Türkiye' },
  { code: 'US', name: 'Amerika' },
  { code: 'DE', name: 'Almanya' },
  { code: 'GB', name: 'İngiltere' },
] as const;

interface CalendarificHoliday {
  name: string;
  description?: string;
  date: {
    iso: string;
  };
}

interface CalendarificResponse {
  response: {
    holidays: CalendarificHoliday[];
  };
}

async function fetchCountryHolidays(
  apiKey: string,
  country: string,
  year: number
): Promise<CalendarificHoliday[]> {
  const res = await axios.get<CalendarificResponse>(CALENDARIFIC_BASE, {
    params: {
      api_key: apiKey,
      country,
      year,
      type: 'national',
    },
  });

  return res.data.response.holidays ?? [];
}

async function insertHoliday(
  holiday: CalendarificHoliday,
  countryName: string,
  isImportant: boolean
): Promise<boolean> {
  const title = holiday.name;
  const description = holiday.description ?? holiday.name;
  const eventDate = new Date(holiday.date.iso);

  const existing = await query<{ id: string }>(
    'SELECT id FROM events WHERE title = $1 AND event_date = $2 LIMIT 1',
    [title, eventDate]
  );

  if (existing.rowCount && existing.rowCount > 0) return false;

  const result = await query<{ id: string }>(
    `INSERT INTO events
       (title, summary, description, event_date, location, category, is_important, image_url, source)
     VALUES
       ($1, $2, $3, $4, $5, 'genel', $6, NULL, 'calendarific')
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [title, description, description, eventDate, countryName, isImportant]
  );

  return Boolean(result.rowCount && result.rowCount > 0);
}

export async function fetchCalendarificHolidays(): Promise<number> {
  const apiKey = process.env.CALENDARIFIC_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') return 0;

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1];
  let inserted = 0;

  for (const year of years) {
    for (const country of COUNTRIES) {
      try {
        const holidays = await fetchCountryHolidays(apiKey, country.code, year);
        for (const holiday of holidays) {
          const wasInserted = await insertHoliday(holiday, country.name, country.code === 'TR');
          if (wasInserted) inserted++;
        }
      } catch (err) {
        console.error(
          `[Calendarific] Holiday fetch failed: ${country.code}/${year}`,
          (err as Error).message
        );
      }
    }
  }

  return inserted;
}
