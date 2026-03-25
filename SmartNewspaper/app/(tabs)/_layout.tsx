import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import AppHeader from '@/components/AppHeader';

function WebSidebarTabBar({ tabProps, colors }: { tabProps: BottomTabBarProps; colors: any }) {
  const today = new Date().toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
  });

  return (
    <View
      style={[
        styles.webSidebarShell,
        {
          backgroundColor: colors.surfaceHigh,
          borderRightColor: colors.borderSubtle,
        },
      ]}
    >
      <View style={[styles.webBrandCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <View style={[styles.webBrandBadge, { backgroundColor: colors.accent }]}>
          <Text style={[styles.webBrandBadgeText, { color: colors.white }]}>SN</Text>
        </View>
        <View style={styles.webBrandTextWrap}>
          <Text style={[styles.webBrandTitle, { color: colors.textPrimary }]}>Smart Newspaper</Text>
          <Text style={[styles.webBrandSub, { color: colors.textMuted }]}>Dashboard</Text>
        </View>
      </View>

      <BottomTabBar {...tabProps} />

      <View style={[styles.webInsightCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.webInsightTitle, { color: colors.textPrimary }]}>Bugun</Text>
        <Text style={[styles.webInsightDate, { color: colors.textSecondary }]}>{today}</Text>
        <View style={styles.webInsightRow}>
          <Ionicons name="sparkles-outline" size={14} color={colors.accent} />
          <Text style={[styles.webInsightText, { color: colors.textSecondary }]}>AI analiz sekmesine goz at.</Text>
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      tabBar={(props) =>
        isWeb ? <WebSidebarTabBar tabProps={props} colors={colors} /> : <BottomTabBar {...props} />
      }
      screenOptions={{
        tabBarPosition: isWeb ? 'left' : 'bottom',
        tabBarActiveTintColor: isWeb ? colors.white : colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarActiveBackgroundColor: isWeb ? colors.accent : colors.surface,
        tabBarInactiveBackgroundColor: colors.surface,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: isWeb ? 13 : 12,
          fontWeight: '600',
          marginBottom: isWeb ? 0 : 1,
          marginLeft: isWeb ? 8 : 0,
        },
        tabBarIconStyle: {
          marginBottom: 0,
          marginTop: 0,
        },
        tabBarItemStyle: {
          borderRadius: 12,
          marginHorizontal: isWeb ? 10 : 4,
          marginVertical: isWeb ? 6 : 0,
          minHeight: isWeb ? 48 : 0,
          justifyContent: 'center',
          alignItems: isWeb ? 'flex-start' : 'center',
          paddingHorizontal: isWeb ? 12 : 0,
        },
        tabBarStyle: {
          backgroundColor: isWeb ? 'transparent' : colors.surface,
          borderColor: colors.borderSubtle,
          borderTopWidth: isWeb ? 0 : 1,
          borderRightWidth: 0,
          height: isWeb ? undefined : 68 + insets.bottom,
          width: isWeb ? '100%' : undefined,
          paddingTop: isWeb ? 8 : 6,
          paddingBottom: isWeb ? 8 : insets.bottom,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerStyle: {
          backgroundColor: colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: colors.textPrimary,
        headerTitleAlign: 'center',
        headerTitleStyle: { color: 'transparent' },
        headerTitle: ({ children }) => <AppHeader title={children ?? ''} />,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Etkinlikler',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI Chat',
          tabBarLabel: isWeb ? 'AI Chat' : '',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'sparkles' : 'sparkles-outline'}
              size={isWeb ? 20 : 24}
              color={color}
            />
          ),
          tabBarButton: isWeb
            ? undefined
            : (props) => {
                const selected = props.accessibilityState?.selected;

                return (
                  <Pressable
                    onPress={props.onPress}
                    onLongPress={props.onLongPress}
                    testID={props.testID}
                    accessibilityLabel={props.accessibilityLabel}
                    accessibilityState={props.accessibilityState}
                    style={[
                      props.style,
                      styles.mobileCenterFab,
                      {
                        backgroundColor: selected ? colors.accent : colors.accentLight,
                        borderColor: colors.surface,
                      },
                    ]}
                  />
                );
              },
        }}
      />
      <Tabs.Screen
        name="archive"
        options={{
          title: 'Arsiv',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="archive-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="newspaper" options={{ href: null }} />
      <Tabs.Screen name="publisherpage" options={{ href: null }} />
      <Tabs.Screen name="publisherprofile" options={{ href: null }} />
      <Tabs.Screen name="publishernews" options={{ href: null }} />
      <Tabs.Screen name="pdfpreview" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  webSidebarShell: {
    width: 276,
    height: '100%',
    borderRightWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 14,
    justifyContent: 'space-between',
  },
  webBrandCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  webBrandBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webBrandBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  webBrandTextWrap: {
    flex: 1,
  },
  webBrandTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  webBrandSub: {
    fontSize: 11,
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  webInsightCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 10,
    gap: 6,
    marginTop: 10,
  },
  webInsightTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  webInsightDate: {
    fontSize: 13,
    fontWeight: '600',
  },
  webInsightRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  webInsightText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  mobileCenterFab: {
    width: 58,
    height: 58,
    borderRadius: 999,
    marginTop: -22,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
});
