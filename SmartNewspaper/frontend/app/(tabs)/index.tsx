import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { useApiNews } from '@/hooks/useNews';
import { usePersonalizedNews } from '@/hooks/useNews';
import { useNewsNotifications } from '@/hooks/useNewsNotifications';
import { useEventNotifications } from '@/hooks/useEventNotifications';
import { useTheme } from '@/hooks/useTheme';
import { usePreferences } from '@/hooks/usePreferences';
import { proxyImageUrl } from '@/services/newsApi';
import { WidgetCard, WidgetConfig } from '@/components/widgets/WidgetCard';
import { NewsWidget, NewsWidgetMode } from '@/components/widgets/NewsWidget';
import { CurrencyWidget } from '@/components/widgets/CurrencyWidget';
import { WeatherWidget } from '@/components/widgets/WeatherWidget';
import { SportsWidget } from '@/components/widgets/SportsWidget';
import { WidgetPicker } from '@/components/widgets/WidgetPicker';
import { getUserProfile } from '@/services/auth';

const WIDGET_STORAGE_KEY = 'dashboard-widgets-v2';

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: '1', type: 'news',     title: 'Son Dakika', size: 'lg' },
  { id: '2', type: 'currency', title: 'Piyasalar',  size: 'sm' },
  { id: '3', type: 'weather',  title: 'Hava Durumu', size: 'sm' },
  { id: '4', type: 'sports',   title: 'Spor Dünyası', size: 'md' },
];

type DashTab = 'foryou' | 'popular' | 'analysis';

function renderWidgetContent(
  config: WidgetConfig,
  newsMode: NewsWidgetMode,
  preferredCategories: string[],
  excludeIds: string[]
) {
  switch (config.type) {
    case 'news':
      return (
        <NewsWidget
          size={config.size}
          mode={newsMode}
          preferredCategories={preferredCategories}
          excludeIds={excludeIds}
        />
      );
    case 'currency': return <CurrencyWidget size={config.size} />;
    case 'weather':  return <WeatherWidget size={config.size} />;
    case 'sports':   return <SportsWidget size={config.size} />;
    default:
      return null;
  }
}

export default function HomeScreen() {
  const { colors, themeName } = useTheme();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { preferredCategories, preferredNewsLanguages } = usePreferences();
  const { articles, loading } = useApiNews(preferredNewsLanguages);
  useNewsNotifications();
  useEventNotifications();

  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [isEditing, setIsEditing] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DashTab>('foryou');
  const [searchQuery, setSearchQuery] = useState('');
  const [profileName, setProfileName] = useState('Kullanici');

  const headerFade = useRef(new Animated.Value(0)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.94)).current;
  const heroY = useRef(new Animated.Value(20)).current;
  const listFade = useRef(new Animated.Value(0)).current;

  // Load persisted widget config
  useEffect(() => {
    AsyncStorage.getItem(WIDGET_STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setWidgets(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      getUserProfile().then((profile) => {
        const name = profile?.name?.trim();
        setProfileName(name || 'Kullanici');
      });
    }, [])
  );

  // Entrance animations
  useEffect(() => {
    Animated.stagger(80, [
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(heroScale, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.timing(listFade, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const saveWidgets = useCallback(async (w: WidgetConfig[]) => {
    setWidgets(w);
    await AsyncStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(w));
  }, []);

  const handleRemoveWidget = useCallback((id: string) => {
    saveWidgets(widgets.filter((w) => w.id !== id));
  }, [widgets, saveWidgets]);

  const handleResizeWidget = useCallback((id: string) => {
    const sizes: WidgetConfig['size'][] = ['sm', 'md', 'lg'];
    saveWidgets(widgets.map((w) => {
      if (w.id !== id) return w;
      const next = (sizes.indexOf(w.size) + 1) % sizes.length;
      return { ...w, size: sizes[next] };
    }));
  }, [widgets, saveWidgets]);

  const handleAddWidget = useCallback((type: WidgetConfig['type'], title: string) => {
    const newW: WidgetConfig = {
      id: Date.now().toString(),
      type,
      title,
      size: 'sm',
    };
    saveWidgets([...widgets, newW]);
  }, [widgets, saveWidgets]);

  // Featured articles
  const featured = articles[0];
  const highlights = articles.slice(1, 3);

  const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const isWeb = Platform.OS === 'web';
  const isWide = isWeb && width >= 1180;
  const isTablet = isWeb && width >= 820;

  const TABS: { key: DashTab; label: string }[] = [
    { key: 'foryou',   label: 'Sizin İçin' },
    { key: 'popular',  label: 'Popüler' },
    { key: 'analysis', label: 'Analiz' },
  ];

  const tabNewsTitles: Record<DashTab, string> = {
    foryou: 'Sizin İçin',
    popular: 'Popüler Haberler',
    analysis: 'Analiz',
  };

  const featuredIds = [featured?.id, ...highlights.map((item) => item.id)].filter(Boolean) as string[];

  const bgColor = colors.background;

  const getGridCellStyle = (size: WidgetConfig['size']) => {
    const minHeights = { sm: 260, md: 320, lg: 420 };
    const minH = minHeights[size] ?? 260;
    if (!isWeb) return { width: '100%', minHeight: minH };
    // CSS Grid: lg spans both columns (full row), sm/md each span 1 column (half row)
    return { gridColumn: size === 'lg' ? 'span 2' : 'span 1', minHeight: minH } as any;
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: bgColor }]}
      contentContainerStyle={[styles.content, isWeb && styles.webContent]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>
            Günaydın, <Text style={{ color: colors.accent, fontStyle: 'italic' }}>{profileName}.</Text>
          </Text>
          <View style={styles.headerMeta}>
            <View style={[styles.metaChip, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <Ionicons name="calendar-outline" size={12} color={colors.accent} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>{today}</Text>
            </View>
            <View style={[styles.metaChip, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <Ionicons name="cloud-outline" size={12} color={colors.accent} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>24° İstanbul</Text>
            </View>
            <View style={styles.liveChip}>
              <View style={[styles.liveDot, { backgroundColor: '#10b981' }]} />
              <Text style={[styles.liveText, { color: '#10b981' }]}>Canlı Akış Aktif</Text>
            </View>
          </View>
        </View>

        {isWeb && (
          <View style={styles.headerRight}>
            {/* Search */}
            <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <Ionicons name="search-outline" size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Özel haber ağınızda keşfe çıkın..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Bell */}
            <Pressable style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
              <View style={[styles.notifDot, { borderColor: bgColor }]} />
            </Pressable>

            {/* Avatar */}
            <View style={[styles.avatar, { backgroundColor: colors.accent + '20', borderColor: colors.accent + '40' }]}>
              <Ionicons name="person" size={18} color={colors.accent} />
            </View>
          </View>
        )}
      </Animated.View>

      {/* ── Featured Section ── */}
      {featured && (
        <Animated.View
          style={[
            styles.featuredSection,
            !isTablet && styles.featuredSectionStacked,
            { opacity: heroScale, transform: [{ scale: heroScale }] },
          ]}
        >
          {/* Hero */}
          <Pressable
            style={styles.hero}
            onPress={() => router.push({ pathname: '/news/[id]', params: { id: featured.id } })}
          >
            <Image
              source={{ uri: proxyImageUrl(featured.imageUrl ?? '') || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800' }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
            {/* Multi-stop gradient overlay for depth */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.18)' }]} />
            <View style={[StyleSheet.absoluteFill, {
              background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.75) 100%)',
            } as any]} />
            <View style={styles.heroContent}>
              <View style={[styles.heroBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.heroBadgeText}>MANŞET</Text>
              </View>
              <Text style={styles.heroTitle} numberOfLines={3}>{featured.title}</Text>
              {featured.description ? (
                <Text style={styles.heroDesc} numberOfLines={2}>{featured.description}</Text>
              ) : null}
            </View>
          </Pressable>

          {/* Highlights */}
          {highlights.length > 0 && (
            <View style={styles.highlights}>
              <Text style={[styles.highlightsLabel, { color: colors.textMuted }]}>ÖNE ÇIKANLAR</Text>
              {highlights.map((item, idx) => (
                <Animated.View
                  key={item.id}
                  style={[
                    styles.highlightCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderSubtle,
                      opacity: listFade,
                      transform: [{ translateX: listFade.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                    },
                  ]}
                >
                  <Pressable
                    style={styles.highlightInner}
                    onPress={() => router.push({ pathname: '/news/[id]', params: { id: item.id } })}
                  >
                    <Text style={[styles.highlightCat, { color: colors.accent }]}>
                      {item.category?.toUpperCase() ?? 'GENEL'}
                    </Text>
                    <Text style={[styles.highlightTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={styles.highlightFooter}>
                      <Text style={[styles.highlightTime, { color: colors.textMuted }]}>
                        {timeAgo(item.publishedAt)}
                      </Text>
                      <View style={styles.detailsLink}>
                        <Text style={[styles.detailsLinkText, { color: colors.textMuted }]}>Detaylar</Text>
                        <Ionicons name="arrow-up" size={10} color={colors.textMuted} style={{ transform: [{ rotate: '45deg' }] }} />
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>
      )}

      {/* ── Dashboard Tools ── */}
      <Animated.View style={[styles.tools, { opacity: listFade }]}>
        {/* Tabs */}
        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          {TABS.map((tab) => (
            <Pressable
              key={tab.key}
              style={[
                styles.tabItem,
                activeTab === tab.key && { backgroundColor: colors.accent },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === tab.key ? '#fff' : colors.textMuted },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Edit / Add buttons */}
        <View style={styles.toolsRight}>
          <Pressable
            onPress={() => setIsEditing((v) => !v)}
            style={[
              styles.editBtn,
              {
                backgroundColor: isEditing ? '#10b98115' : colors.surface,
                borderColor: isEditing ? '#10b98140' : colors.borderSubtle,
              },
            ]}
          >
            <Ionicons
              name={isEditing ? 'save-outline' : 'settings-outline'}
              size={15}
              color={isEditing ? '#10b981' : colors.textMuted}
            />
            <Text style={[styles.editLabel, { color: isEditing ? '#10b981' : colors.textMuted }]}>
              {isEditing ? 'Kaydet' : 'Düzenle'}
            </Text>
          </Pressable>

          {isEditing && (
            <Pressable
              onPress={() => setIsPickerOpen(true)}
              style={[styles.addBtn, { backgroundColor: colors.accent }]}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addLabel}>Ekle</Text>
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* ── Widget Grid ── */}
      <Animated.View
        style={[
          styles.grid,
          { opacity: listFade },
          isWeb && ({
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
          } as any),
        ]}
      >
        {widgets.map((widget) => (
          <View
            key={widget.id}
            style={[!isWeb && styles.gridCell, getGridCellStyle(widget.size), isWeb && { display: 'flex' } as any] as any}
          >
            <WidgetCard
              config={widget.type === 'news' ? { ...widget, title: tabNewsTitles[activeTab] } : widget}
              isEditing={isEditing}
              onRemove={handleRemoveWidget}
              onResize={handleResizeWidget}
            >
              {renderWidgetContent(widget, activeTab, preferredCategories, featuredIds)}
            </WidgetCard>
          </View>
        ))}

        {widgets.length === 0 && (
          <View style={[styles.emptyGrid, { borderColor: colors.borderSubtle }]}>
            <Ionicons name="grid-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>Dashboard henüz boş.</Text>
            <Pressable onPress={() => setIsPickerOpen(true)}>
              <Text style={[styles.emptyAdd, { color: colors.accent }]}>+ Yeni widget ekleyerek başlayın</Text>
            </Pressable>
          </View>
        )}
      </Animated.View>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
        <View style={styles.footerLeft}>
          <View style={styles.footerItem}>
            <Ionicons name="sparkles" size={11} color={colors.accent} />
            <Text style={[styles.footerText, { color: colors.textMuted }]}>AI Destekli Gazete</Text>
          </View>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Gizlilik</Text>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Destek</Text>
        </View>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>© 2026 GazeteAI Hub v2.0</Text>
      </View>

      <WidgetPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onAdd={handleAddWidget}
      />
    </ScrollView>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.max(0, Math.floor(diff / 60000));
  if (m < 1) return 'şimdi';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 24, paddingBottom: 56, gap: 24 },
  webContent: { maxWidth: 1640, width: '100%' as any, alignSelf: 'center' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  headerLeft: { flex: 1, gap: 10 },
  greeting: { fontSize: 36, fontWeight: '900', letterSpacing: -1, lineHeight: 40 },
  headerMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1,
  },
  metaText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 24, borderWidth: 1, minWidth: 240,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '500' },
  iconBtn: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, position: 'relative',
  },
  notifDot: {
    position: 'absolute', top: 10, right: 10,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#ef4444', borderWidth: 2,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },

  // Featured
  featuredSection: { flexDirection: 'row', gap: 16, minHeight: 400 },
  featuredSectionStacked: { flexDirection: 'column' },
  hero: {
    flex: 2, borderRadius: 32, overflow: 'hidden',
    minHeight: 400, position: 'relative',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  heroContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 32, gap: 14,
  },
  heroBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadgeText: { fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: 2.5 },
  heroTitle: { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: -0.6, lineHeight: 36 },
  heroDesc: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 21 },

  highlights: { flex: 1, gap: 10, minWidth: 240 },
  highlightsLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2, paddingLeft: 4, marginBottom: 2 },
  highlightCard: { flex: 1, borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  highlightInner: { flex: 1, padding: 18, gap: 8, justifyContent: 'space-between' },
  highlightCat: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  highlightTitle: { fontSize: 16, fontWeight: '800', lineHeight: 22 },
  highlightFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  highlightTime: { fontSize: 10, fontWeight: '600' },
  detailsLink: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  detailsLinkText: { fontSize: 10, fontWeight: '700' },

  // Tools
  tools: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  tabBar: {
    flexDirection: 'row', gap: 2, padding: 4,
    borderRadius: 14, borderWidth: 1,
  },
  tabItem: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  tabLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  toolsRight: { flexDirection: 'row', gap: 8 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 12, borderWidth: 1,
  },
  editLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
  },
  addLabel: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },

  // Grid
  grid: { gap: 18 },
  gridCell: { width: '100%' },
  gridCellMd: { width: '48%' } as any,
  gridCellLg: { width: '100%' },
  emptyGrid: {
    width: '100%', paddingVertical: 48,
    borderRadius: 24, borderWidth: 2, borderStyle: 'dashed',
    alignItems: 'center', gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyAdd: { fontSize: 13, fontWeight: '600' },

  // Footer
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 20, borderTopWidth: 1, flexWrap: 'wrap', gap: 8,
  },
  footerLeft: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
});
