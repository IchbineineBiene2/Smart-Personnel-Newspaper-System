/**
 * Backend-synced user preferences.
 *
 * Login varsa backend'den çeker / yazar. Logged-out kullanıcılar için
 * AsyncStorage local olarak çalışır (usePreferences hook'unda yönetilir).
 */
import { Platform } from 'react-native';
import { getToken } from './auth';

const API_BASE =
  Platform.OS === 'web'
    ? 'http://localhost:3000'
    : Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';

export interface BackendPreferences {
  preferredCategories: string[];
  preferredLanguages: string[];
  preferredSources: string[];
  mutedSources: string[];
  customTags: string[];
  language: string | null;
  theme: string | null;
  notificationsEnabled: boolean;
  emailDigest: boolean;
  digestFrequency: string | null;
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchPreferencesFromBackend(): Promise<BackendPreferences | null> {
  const headers = await authHeader();
  if (!headers.Authorization) return null;
  try {
    const res = await fetch(`${API_BASE}/api/preferences`, { headers });
    if (!res.ok) return null;
    return (await res.json()) as BackendPreferences;
  } catch {
    return null;
  }
}

export async function pushPreferencesToBackend(
  patch: Partial<BackendPreferences>,
): Promise<BackendPreferences | null> {
  const headers = await authHeader();
  if (!headers.Authorization) return null;
  try {
    const res = await fetch(`${API_BASE}/api/preferences`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return null;
    return (await res.json()) as BackendPreferences;
  } catch {
    return null;
  }
}
