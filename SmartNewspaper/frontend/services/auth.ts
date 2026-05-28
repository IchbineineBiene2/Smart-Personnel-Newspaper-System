import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETE_KEY = 'onboarding-complete';
const USER_PROFILE_KEY = 'user-profile';
const USER_PASSWORD_KEY = 'user-password';
const AUTH_LOGGED_IN_KEY = 'auth-logged-in';
const AUTH_TOKEN_KEY = 'auth-token';
const BACKEND_USER_KEY = 'backend-user';
const API_BASE_URL = 'http://localhost:3000/api';

export interface UserProfile {
  id: string;
  name: string;
  username?: string;
  email: string;
  createdAt: string;
}

export interface BackendUser {
  userId: number;
  username: string;
  fullName?: string;
  email: string;
  role?: string;
  status?: string;
}

export interface RegisterInput {
  name: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function isOnboardingComplete(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
  return value === 'true';
}

export async function completeOnboarding(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    return null;
  }

  const value = await AsyncStorage.getItem(USER_PROFILE_KEY);
  if (value) {
    return JSON.parse(value);
  }
  return null;
}

export async function createUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
}

export async function isLoggedIn(): Promise<boolean> {
  const value = await AsyncStorage.getItem(AUTH_LOGGED_IN_KEY);
  return value === 'true';
}

export async function registerUser(input: RegisterInput): Promise<UserProfile> {
  const name = input.name.trim();
  const username = input.username.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();

  const profile: UserProfile = {
    id: `user-${Date.now()}`,
    name,
    username,
    email,
    createdAt: new Date().toISOString(),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: name, username, email, password: input.password }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.token) {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
      }
      if (data.user) {
        await AsyncStorage.setItem(BACKEND_USER_KEY, JSON.stringify(data.user));
        profile.id = String(data.user.userId ?? data.user.id ?? profile.id);
        profile.name = data.user.fullName ?? data.user.username ?? profile.name;
        profile.username = data.user.username ?? profile.username;
      }
    } else {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || 'Kayit olusturulamadi.');
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Kayit olusturulamadi. Backend baglantisini ve bilgileri kontrol et.');
  }

  await AsyncStorage.multiSet([
    [USER_PROFILE_KEY, JSON.stringify(profile)],
    [USER_PASSWORD_KEY, input.password],
    [AUTH_LOGGED_IN_KEY, 'true'],
  ]);

  return profile;
}

export async function loginUser(input: LoginInput): Promise<UserProfile | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: input.email.trim(),
        password: input.password,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const backendUser = data.user as BackendUser | undefined;

      if (data.token) {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
      }
      if (backendUser) {
        await AsyncStorage.setItem(BACKEND_USER_KEY, JSON.stringify(backendUser));
      }

      const profile: UserProfile = {
        id: String(backendUser?.userId ?? Date.now()),
        name: backendUser?.fullName ?? backendUser?.username ?? input.email.trim(),
        username: backendUser?.username,
        email: backendUser?.email ?? input.email.trim().toLowerCase(),
        createdAt: new Date().toISOString(),
      };

      await AsyncStorage.multiSet([
        [USER_PROFILE_KEY, JSON.stringify(profile)],
        [AUTH_LOGGED_IN_KEY, 'true'],
      ]);

      return profile;
    }
  } catch {
    // Fall back to the existing local-only login below.
  }

  const [storedProfile, storedPassword] = await AsyncStorage.multiGet([
    USER_PROFILE_KEY,
    USER_PASSWORD_KEY,
  ]);

  const profileValue = storedProfile[1];
  const passwordValue = storedPassword[1];

  if (!profileValue || !passwordValue) {
    return null;
  }

  const profile = JSON.parse(profileValue) as UserProfile;
  const identity = input.email.trim().toLowerCase();
  const emailMatches =
    profile.email.toLowerCase() === identity ||
    profile.username?.toLowerCase() === identity ||
    profile.name.toLowerCase() === identity;
  const passwordMatches = passwordValue === input.password;

  if (!emailMatches || !passwordMatches) {
    return null;
  }

  await AsyncStorage.setItem(AUTH_LOGGED_IN_KEY, 'true');
  return profile;
}

export async function logoutUser(): Promise<void> {
  await AsyncStorage.setItem(AUTH_LOGGED_IN_KEY, 'false');
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, BACKEND_USER_KEY]);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function getCurrentUser(): Promise<BackendUser | null> {
  const value = await AsyncStorage.getItem(BACKEND_USER_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value) as BackendUser;
  } catch {
    return null;
  }
}

export async function getUserRole(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.role ?? null;
}

export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'admin';
}

export async function seedAdminUser(): Promise<{ message: string; email?: string; password?: string }> {
  const response = await fetch(`${API_BASE_URL}/admin/seed`, { method: 'POST' });
  return response.json();
}

export async function resetUserPassword(email: string, newPassword: string): Promise<boolean> {
  const value = await AsyncStorage.getItem(USER_PROFILE_KEY);
  if (!value) {
    return false;
  }

  const profile = JSON.parse(value) as UserProfile;
  if (profile.email.toLowerCase() !== email.trim().toLowerCase()) {
    return false;
  }

  await AsyncStorage.setItem(USER_PASSWORD_KEY, newPassword);
  return true;
}

export async function updateUserProfile(profile: Partial<UserProfile>): Promise<void> {
  const value = await AsyncStorage.getItem(USER_PROFILE_KEY);
  const current = value ? (JSON.parse(value) as UserProfile) : null;
  if (current) {
    const updated: UserProfile = { ...current, ...profile };
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(updated));
  }
}
