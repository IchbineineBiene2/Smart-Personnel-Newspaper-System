import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { TicketOption, TicketSource } from '@/services/eventsApi';

const API_BASE =
  Platform.OS === 'web'
    ? 'http://localhost:3000'
    : Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';

export interface ConcertEvent {
  id: string;
  title: string;
  artist: string;
  date: string;
  location: string;
  venue: string;
  description: string;
  imageUrl?: string;
  ticketOptions: TicketOption[];
  category: 'konser' | 'tiyatro' | 'stand-up';
}

export function useConcerts(category?: 'konser' | 'tiyatro' | 'stand-up') {
  const [concerts, setConcerts] = useState<ConcertEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConcerts = async () => {
      try {
        setLoading(true);
        setError(null);

        const query = new URLSearchParams();
        if (category) query.set('category', category);

        const qs = query.toString();
        const res = await fetch(`${API_BASE}/api/concerts${qs ? `?${qs}` : ''}`);
        
        if (!res.ok) throw new Error('Konserler yüklenemedi');
        
        const data = await res.json();
        setConcerts(data.events || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
        setConcerts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchConcerts();
  }, [category]);

  const upcomingConcerts = concerts.filter(c => new Date(c.date) > new Date());
  const pastConcerts = concerts.filter(c => new Date(c.date) <= new Date());

  return {
    concerts,
    upcoming: upcomingConcerts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    past: pastConcerts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    loading,
    error
  };
}

export function searchConcerts(query: string) {
  const [results, setResults] = useState<ConcertEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const search = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/concerts/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Arama başarısız');
        
        const data = await res.json();
        setResults(data.events || []);
      } catch (err) {
        console.error('Arama hatası:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(search, 500);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  return { results, loading };
}

export function getTicketUrl(concert: ConcertEvent, source?: TicketSource): string {
  if (!concert.ticketOptions || concert.ticketOptions.length === 0) {
    return 'https://www.biletix.com';
  }

  if (source) {
    const option = concert.ticketOptions.find(t => t.source === source);
    return option?.url || concert.ticketOptions[0].url;
  }

  return concert.ticketOptions[0].url;
}
