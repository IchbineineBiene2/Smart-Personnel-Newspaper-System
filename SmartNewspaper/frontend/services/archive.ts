import { ContentCategory } from './content';

const API_BASE = 'http://localhost:3000';

export interface ArchivedEdition {
  id: number;
  user_id: number;
  title: string;
  edition_date: string;       // ISO date string (YYYY-MM-DD)
  edition_type: string;       // 'daily', 'weekly' etc
  description: string | null;
  selected_articles: number[];
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

// API: Get user's archived editions
export async function fetchUserEditions(userId: number, token?: string): Promise<ArchivedEdition[]> {
  try {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

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
  selectedArticles: number[],
  token: string
): Promise<ArchivedEdition | null> {
  try {
    const res = await fetch(`${API_BASE}/api/archive/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ title, description, selectedArticles }),
    });

    if (!res.ok) return null;
    
    const data = await res.json();
    return data.edition || null;
  } catch (err) {
    console.error('[Archive] Error creating edition:', err);
    return null;
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

