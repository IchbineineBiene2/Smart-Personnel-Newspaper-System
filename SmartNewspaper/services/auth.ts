import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETE_KEY = 'onboarding-complete';
const USER_PROFILE_KEY = 'user-profile';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export async function isOnboardingComplete(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
  return value === 'true';
}

export async function completeOnboarding(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const value = await AsyncStorage.getItem(USER_PROFILE_KEY);
  if (value) {
    return JSON.parse(value);
  }
  return null;
}

export async function createUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
}

export async function updateUserProfile(profile: Partial<UserProfile>): Promise<void> {
  const current = await getUserProfile();
  if (current) {
    const updated: UserProfile = { ...current, ...profile };
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(updated));
  }
}
