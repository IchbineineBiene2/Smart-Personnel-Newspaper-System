import { useEffect, useState } from 'react';
import {
  ApiAnnouncement,
  ApiEvent,
  EventCategory,
  fetchAnnouncements,
  fetchEvents,
} from '@/services/eventsApi';

// Modül seviyesi cache
let cachedEvents: ApiEvent[] = [];
let cachedAnnouncements: ApiAnnouncement[] = [];
let pendingEvents: Promise<ApiEvent[]> | null = null;
let pendingAnnouncements: Promise<ApiAnnouncement[]> | null = null;

async function loadEvents(): Promise<ApiEvent[]> {
  if (cachedEvents.length > 0) return cachedEvents;
  if (pendingEvents) return pendingEvents;
  pendingEvents = fetchEvents().then((data) => {
    cachedEvents = data;
    pendingEvents = null;
    return data;
  });
  return pendingEvents;
}

async function loadAnnouncements(): Promise<ApiAnnouncement[]> {
  if (cachedAnnouncements.length > 0) return cachedAnnouncements;
  if (pendingAnnouncements) return pendingAnnouncements;
  pendingAnnouncements = fetchAnnouncements().then((data) => {
    cachedAnnouncements = data;
    pendingAnnouncements = null;
    return data;
  });
  return pendingAnnouncements;
}

export function useEvents(category?: EventCategory | null) {
  const [events, setEvents] = useState<ApiEvent[]>(cachedEvents);
  const [loading, setLoading] = useState(cachedEvents.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedEvents.length > 0) {
      setEvents(cachedEvents);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadEvents()
      .then((data) => {
        setEvents(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const now = new Date().toISOString();
  const filtered = category ? events.filter((e) => e.category === category) : events;
  const upcoming = filtered.filter((e) => e.date >= now);
  const past = filtered.filter((e) => e.date < now);

  return { events: filtered, upcoming, past, loading, error };
}

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<ApiAnnouncement[]>(cachedAnnouncements);
  const [loading, setLoading] = useState(cachedAnnouncements.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedAnnouncements.length > 0) {
      setAnnouncements(cachedAnnouncements);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadAnnouncements()
      .then((data) => {
        setAnnouncements(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const critical = announcements.filter((a) => a.priority === 'critical');
  const normal = announcements.filter((a) => a.priority === 'normal');

  return { announcements, critical, normal, loading, error };
}