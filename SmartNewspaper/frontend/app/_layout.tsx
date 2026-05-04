
import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { useTheme } from '@/hooks/useTheme';
import { isOnboardingComplete } from '@/services/auth';
import { NotificationProvider } from '@/contexts/NotificationContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    const checkOnboarding = async () => {
      const isComplete = await isOnboardingComplete();
      setOnboardingComplete(isComplete);
    };
    checkOnboarding();
  }, []);

  useEffect(() => {
    if (loaded && onboardingComplete !== null) {
      SplashScreen.hideAsync();
    }
  }, [loaded, onboardingComplete]);

  if (!loaded || onboardingComplete === null) {
    return null;
  }

  return <RootLayoutNav initialRouteName={onboardingComplete ? '(tabs)' : 'onboarding'} />;
}

interface RootLayoutNavProps {
  initialRouteName: string;
}

function RootLayoutNav({ initialRouteName }: RootLayoutNavProps) {
  const { colors, themeName } = useTheme();
  const pageBackground = themeName === 'vincent' ? colors.surface : colors.background;

  const customTheme = {
    dark: false,
    colors: {
      primary: colors.accent,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.error,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' as const },
      medium: { fontFamily: 'System', fontWeight: '500' as const },
      bold: { fontFamily: 'System', fontWeight: '700' as const },
      heavy: { fontFamily: 'System', fontWeight: '900' as const },
    },
  };

  return (
    <NotificationProvider>
      <ThemeProvider value={customTheme}>
        <Stack
          initialRouteName={initialRouteName}
          screenOptions={{
            contentStyle: {
              backgroundColor: pageBackground,
            },
            headerStyle: {
              backgroundColor: pageBackground,
            },
            headerTintColor: colors.textPrimary,
            headerTitleAlign: 'center',
            headerTitleStyle: {
              color: colors.textPrimary,
              fontSize: 18,
              fontWeight: '700',
            },
            headerShadowVisible: false,
          }}
      >
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ title: 'Giriş Yap' }} />
        <Stack.Screen name="auth/register" options={{ title: 'Kayıt Ol' }} />
        <Stack.Screen
          name="events/[id]"
          options={{
            title: 'Etkinlik Detayi',
            headerTintColor: colors.textPrimary,
            headerStyle: {
              backgroundColor: pageBackground,
            },
            headerTitleAlign: 'center',
            headerTitleStyle: {
              color: colors.textPrimary,
              fontSize: 18,
              fontWeight: '700',
            },
          }}
        />
        <Stack.Screen
          name="news/[id]"
          options={{
            title: 'Haber Detayi',
            headerTintColor: colors.textPrimary,
            headerStyle: {
              backgroundColor: pageBackground,
            },
            headerTitleAlign: 'center',
            headerTitleStyle: {
              color: colors.textPrimary,
              fontSize: 18,
              fontWeight: '700',
            },
          }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      </ThemeProvider>
    </NotificationProvider>
  );
}
