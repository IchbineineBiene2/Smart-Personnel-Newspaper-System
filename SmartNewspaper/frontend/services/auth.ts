import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETE_KEY = 'onboarding-complete';
const USER_PROFILE_KEY = 'user-profile';
const USER_PASSWORD_KEY = 'user-password';
const AUTH_LOGGED_IN_KEY = 'auth-logged-in';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface RegisterInput {
  name: string;
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
  const profile: UserProfile = {
    id: `user-${Date.now()}`,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
  };

  await AsyncStorage.multiSet([
    [USER_PROFILE_KEY, JSON.stringify(profile)],
    [USER_PASSWORD_KEY, input.password],
    [AUTH_LOGGED_IN_KEY, 'true'],
  ]);

  return profile;
}

export async function loginUser(input: LoginInput): Promise<UserProfile | null> {
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
  const emailMatches = profile.email.toLowerCase() === input.email.trim().toLowerCase();
  const passwordMatches = passwordValue === input.password;

  if (!emailMatches || !passwordMatches) {
    return null;
  }

  await AsyncStorage.setItem(AUTH_LOGGED_IN_KEY, 'true');
  return profile;
}

export async function logoutUser(): Promise<void> {
  await AsyncStorage.setItem(AUTH_LOGGED_IN_KEY, 'false');
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
