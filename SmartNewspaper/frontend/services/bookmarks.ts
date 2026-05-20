/**
 * Backend-synced bookmarks helpers. Auth gerekli — token yoksa null/no-op.
 */
import { Platform } from 'react-native';
import { getToken } from './auth';

const API_BASE =
  Platform.OS === 'web'
    ? 'http://localhost:3000'
    : Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';

async function authHeader(): Promise<Record<string, string> | null> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
}

export interface BookmarkResponse {
  ids: string[];
  articles: Array<{
    id: string;
    title: string;
    description: string;
    url: string;
    image_url?: string | null;
    published_at: string;
    category?: string | null;
    language?: string | null;
    source_name: string;
    source_url: string;
    saved_at: string;
  }>;
}

export async function fetchBookmarks(): Promise<BookmarkResponse | null> {
  const h = await authHeader();
  if (!h) return null;
  try {
    const res = await fetch(`${API_BASE}/api/bookmarks?limit=200`, { headers: h });
    if (!res.ok) return null;
    return (await res.json()) as BookmarkResponse;
  } catch {
    return null;
  }
}

export async function saveBookmark(articleId: string): Promise<boolean> {
  const h = await authHeader();
  if (!h) return false;
  try {
    const res = await fetch(`${API_BASE}/api/bookmarks/${encodeURIComponent(articleId)}`, {
      method: 'POST',
      headers: h,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteBookmark(articleId: string): Promise<boolean> {
  const h = await authHeader();
  if (!h) return false;
  try {
    const res = await fetch(`${API_BASE}/api/bookmarks/${encodeURIComponent(articleId)}`, {
      method: 'DELETE',
      headers: h,
    });
    return res.ok;
  } catch {
    return false;
  }
}
