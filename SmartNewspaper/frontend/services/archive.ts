import { Platform } from 'react-native';

const API_BASE =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';

export interface ArchivedEdition {
  id: number;
  user_id: number;
  edition_date: string;       // YYYY-MM-DD format
  edition_type?: string;       // 'daily', 'weekly' etc
  title?: string | null;
  description: string | null;
  selected_articles: string[];
  articles_snapshot?: ArchivedArticleSnapshot[];
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArchivedArticleSnapshot {
  id: string;
  title: string;
  description: string;
  content?: string;
  url?: string;
  imageUrl?: string;
  publishedAt: string;
  category?: string;
  source: {
    id?: string;
    name: string;
    url?: string;
    type?: 'newsapi' | 'rss' | 'scraper';
  };
  language?: string;
}

// API: Get user's archived editions
export async function fetchUserEditions(userId: number, token: string): Promise<ArchivedEdition[]> {
  try {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
    };

    const res = await fetch(`${API_BASE}/api/archive/${userId}`, { headers });
    if (!res.ok) return [];
    
    const data = await res.json();
    return data.editions || [];
  } catch (err) {
    console.error('[Archive] Error fetching editions:', err);
    return [];
  }
}

// API: Create new archived edition
export async function createEdition(
  title: string,
  description: string | null,
  selectedArticles: string[],
  token: string,
  articlesSnapshot: ArchivedArticleSnapshot[] = []
): Promise<{ edition: ArchivedEdition | null; error: string | null }> {
  try {
    const res = await fetch(`${API_BASE}/api/archive/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ title, description, selectedArticles, articlesSnapshot }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        edition: null,
        error: data.error || 'Gazete oluşturulamadı'
      };
    }

    return {
      edition: data.edition || null,
      error: null
    };
  } catch (err) {
    console.error('[Archive] Error creating edition:', err);
    return {
      edition: null,
      error: err instanceof Error ? err.message : 'Ağ hatası'
    };
  }
}

// API: Delete archived edition
export async function deleteEdition(userId: number, editionId: number, token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/archive/${userId}/${editionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return res.ok;
  } catch (err) {
    console.error('[Archive] Error deleting edition:', err);
    return false;
  }
}

