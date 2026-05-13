import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRef, useEffect, useState } from 'react';

import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import AppHeader from '@/components/AppHeader';
import { NewsNotificationToast } from '@/components/NewsNotificationToast';
import { useNotification } from '@/contexts/NotificationContext';
import { getToken, logoutUser } from '@/services/auth';

const NAV_ROUTES: { name: string; label: string; icon: string; iconFilled: string }[] = [
  { name: 'search',   label: 'Arama',       icon: 'search-outline',   iconFilled: 'search' },
  { name: 'profile',  label: 'Profil',      icon: 'person-outline',   iconFilled: 'person' },
  { name: 'notifications', label: 'Bildirimler', icon: 'notifications-outline', iconFilled: 'notifications' },
  { name: 'index',    label: 'Anasayfa',    icon: 'grid-outline',     iconFilled: 'grid' },
  { name: 'feed',     label: 'Akış',        icon: 'reader-outline',   iconFilled: 'reader' },
  { name: 'explore',  label: 'Keşfet',      icon: 'compass-outline',  iconFilled: 'compass' },
  { name: 'newspaper', label: 'Kisisel Gazete', icon: 'newspaper-outline', iconFilled: 'newspaper' },
  { name: 'discover', label: 'Ekinlikler',  icon: 'calendar-outline', iconFilled: 'calendar' },
  { name: 'archive',  label: 'Arşiv',       icon: 'archive-outline',  iconFilled: 'archive' },
  { name: 'messages', label: 'Mesajlar',    icon: 'chatbubble-outline', iconFilled: 'chatbubble' },
  { name: 'ai',       label: 'AI Chat',     icon: 'sparkles-outline', iconFilled: 'sparkles' },
];

const HIDDEN_ROUTES = ['publisherpage', 'publisherprofile', 'pdfpreview', 'messages/[userId]'];

const LAYOUT_I18N = {
  tr: { home: 'Ana Sayfa', feed: 'Akış', explore: 'Keşfet', search: 'Arama', events: 'Etkinlikler', archive: 'Arşiv', profile: 'Profil' },
  en: { home: 'Home', feed: 'Feed', explore: 'Explore', search: 'Search', events: 'Events', archive: 'Archive', profile: 'Profile' },
  de: { home: 'Startseite', feed: 'Feed', explore: 'Entdecken', search: 'Suche', events: 'Veranstaltungen', archive: 'Archiv', profile: 'Profil' },
} as const;

function NavItem({
  label,
  icon,
  iconFilled,
  isActive,
  onPress,
  colors,
  hasUnread,
}: {
  label: string;
  icon: string;
  iconFilled: string;
  isActive: boolean;
  onPress: () => void;
  colors: any;
  hasUnread?: boolean;
}) {
  const bgAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(bgAnim, {
        toValue: isActive ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnim, {
        toValue: isActive ? 1 : 0.95,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive]);

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0)', colors.accent + '18'],
  });

  return (
    <Pressable
      onPress={onPress}
      style={styles.navItem}
      accessibilityRole="button"
    >
      <Animated.View
        style={[
          styles.navItemInner,
          { backgroundColor: bgColor, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {isActive && (
          <View style={[styles.activeBar, { backgroundColor: colors.accent }]} />
        )}
        <Ionicons
          name={(isActive ? iconFilled : icon) as any}
          size={20}
          color={isActive ? colors.accent : colors.textMuted}
        />
        {hasUnread ? (
          <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} />
        ) : null}
        <Text
          style={[
            styles.navLabel,
            { color: isActive ? colors.accent : colors.textMuted },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function WebSidebarTabBar({
  tabProps,
  colors,
  pageBackground,
}: {
  tabProps: BottomTabBarProps;
  colors: any;
  pageBackground: string;
}) {
  const { state, navigation } = tabProps;
  const router = useRouter();
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    let active = true;

    const loadUnreadMessages = async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (active) setHasUnreadMessages(false);
          return;
        }

        const response = await fetch('http://localhost:3000/api/messages/conversations', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        const hasUnread = (data.conversations || []).some(
          (conversation: { unread_count?: number }) => (conversation.unread_count || 0) > 0
        );
        if (active) setHasUnreadMessages(hasUnread);
      } catch {
        if (active) setHasUnreadMessages(false);
      }
    };

    loadUnreadMessages();
    const interval = setInterval(loadUnreadMessages, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadUnreadNotifications = async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (active) setHasUnreadNotifications(false);
          return;
        }

        const response = await fetch('http://localhost:3000/api/notifications/unread/count', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        if (active) setHasUnreadNotifications((data.unread_count || 0) > 0);
      } catch {
        if (active) setHasUnreadNotifications(false);
      }
    };

    loadUnreadNotifications();
    const interval = setInterval(loadUnreadNotifications, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const today = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const visibleRoutes = state.routes.filter((r) => !HIDDEN_ROUTES.includes(r.name));
  
  // Sort routes according to NAV_ROUTES order
  const sortedVisibleRoutes = [...visibleRoutes].sort((a, b) => {
    const aIndex = NAV_ROUTES.findIndex(n => n.name === a.name);
    const bIndex = NAV_ROUTES.findIndex(n => n.name === b.name);
    return aIndex - bIndex;
  });

  return (
    <Animated.View
      style={[
        styles.sidebar,
        {
          backgroundColor: pageBackground,
          borderRightColor: colors.borderSubtle,
          opacity: fadeAnim,
        },
      ]}
    >
      {/* Brand */}
      <View style={[styles.brand, { borderBottomColor: colors.borderSubtle }]}>
        <View style={[styles.brandIcon, { backgroundColor: colors.accent }]}>
          <Ionicons name="newspaper" size={18} color="#fff" />
        </View>
        <View>
          <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>
            GAZETE<Text style={{ color: colors.accent }}>.AI</Text>
          </Text>
          <Text style={[styles.brandSub, { color: colors.textMuted }]}>DASHBOARD</Text>
        </View>
      </View>

      {/* Nav */}
      <View style={styles.nav}>
        {sortedVisibleRoutes.map((route) => {
          const routeIndex = state.routes.findIndex((r) => r.key === route.key);
          const isActive = state.index === routeIndex;
          const navRoute = NAV_ROUTES.find((n) => n.name === route.name);
          if (!navRoute) return null;

          return (
            <NavItem
              key={route.key}
              label={navRoute.label}
              icon={navRoute.icon}
              iconFilled={navRoute.iconFilled}
              isActive={isActive}
              colors={colors}
              hasUnread={
                (route.name === 'messages' && hasUnreadMessages) ||
                (route.name === 'notifications' && hasUnreadNotifications)
              }
              onPress={() => navigation.navigate(route.name)}
            />
          );
        })}
      </View>

      {/* Bottom */}
      <View style={styles.bottom}>
        <View
          style={[
            styles.todayCard,
            {
              backgroundColor: colors.accent + '0A',
              borderColor: colors.accent + '30',
            },
          ]}
        >
          <Text style={[styles.todayLabel, { color: colors.accent }]}>BUGÜN</Text>
          <Text style={[styles.todayDate, { color: colors.textSecondary }]}>{today}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.logoutBtn,
            { backgroundColor: pressed ? '#ef444410' : 'transparent' },
          ]}
          onPress={async () => {
            await logoutUser();
            router.replace('/auth/login');
          }}
        >
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.logoutText}>ÇIKIŞ YAP</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default function TabLayout() {
  const { colors, themeName } = useTheme();
  const { language } = useLanguage();
  const { currentNotification, dismissNotification } = useNotification();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const pageBackground = themeName === 'vincent' ? colors.surface : colors.background;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) =>
          isWeb ? (
            <WebSidebarTabBar
              tabProps={props}
              colors={colors}
              pageBackground={pageBackground}
            />
          ) : (
            <BottomTabBar {...props} />
          )
        }
        screenOptions={{
          tabBarPosition: isWeb ? 'left' : 'bottom',
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarActiveBackgroundColor: colors.surface,
          tabBarInactiveBackgroundColor: colors.surface,
          tabBarShowLabel: !isWeb,
          tabBarHideOnKeyboard: true,
          sceneStyle: { backgroundColor: pageBackground },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            marginBottom: 2,
          },
          tabBarIconStyle: { marginBottom: 0, marginTop: 0 },
          tabBarItemStyle: {
            borderRadius: 10,
            marginHorizontal: 4,
            marginVertical: 2,
            minHeight: 44,
            justifyContent: 'center',
            alignItems: 'center',
          },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.borderSubtle,
            borderTopWidth: 1,
            height: isWeb ? undefined : 64 + insets.bottom,
            paddingBottom: isWeb ? 0 : insets.bottom,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerShown: !isWeb,
          headerStyle: {
            backgroundColor: isWeb ? pageBackground : colors.surface,
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
            title: LAYOUT_I18N[language].home,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="feed"
          options={{
            title: LAYOUT_I18N[language].feed,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="reader-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: LAYOUT_I18N[language].explore,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="compass-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: LAYOUT_I18N[language].search,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="search-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="discover"
          options={{
            title: LAYOUT_I18N[language].events,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ai"
          options={{
            title: 'AI Chat',
            tabBarLabel: 'AI',
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
                        props.style as any,
                        styles.mobileCenterFab,
                        {
                          backgroundColor: selected ? colors.accent : colors.accentLight,
                          borderColor: colors.surface,
                        },
                      ]}
                    >
                      <Ionicons
                        name={selected ? 'sparkles' : 'sparkles-outline'}
                        size={24}
                        color="#fff"
                      />
                    </Pressable>
                  );
                },
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Bildirimler',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="notifications-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="archive"
          options={{
            title: LAYOUT_I18N[language].archive,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="archive-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: LAYOUT_I18N[language].profile,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="newspaper" options={{ href: null }} />
        <Tabs.Screen name="publisherpage" options={{ href: null }} />
        <Tabs.Screen name="publisherprofile" options={{ href: null }} />
        <Tabs.Screen name="pdfpreview" options={{ href: null }} />
      </Tabs>

      <NewsNotificationToast
        notification={currentNotification}
        onDismiss={dismissNotification}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    height: '100%' as any,
    borderRightWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 20,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  nav: {
    flex: 1,
    gap: 2,
    paddingTop: 8,
  },
  navItem: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  navItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 16,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    left: 30,
    top: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: '50%' as any,
    marginTop: -14,
    width: 4,
    height: 28,
    borderRadius: 999,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  bottom: {
    gap: 8,
    paddingTop: 8,
  },
  todayCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  todayLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  todayDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 2,
  },
  todayQuote: {
    fontSize: 10,
    fontStyle: 'italic',
    lineHeight: 15,
    flex: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  logoutText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ef4444',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  mobileCenterFab: {
    width: 58,
    height: 58,
    borderRadius: 999,
    marginTop: -22,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
