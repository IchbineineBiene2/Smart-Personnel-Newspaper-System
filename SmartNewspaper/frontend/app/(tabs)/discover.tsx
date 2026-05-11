import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useEvents, useAnnouncements } from '@/hooks/useEvents';
import { useConcerts } from '@/hooks/useConcerts';
import { useTheme } from '@/hooks/useTheme';
import { EventCategory, EVENT_CATEGORY_LABELS, EVENT_CATEGORY_COLORS } from '@/services/eventsApi';
import { ConcertTicketModal } from '@/components/ConcertTicketModal';
import type { ConcertEvent } from '@/hooks/useConcerts';

type FilterCat = EventCategory | 'tumu';
type ViewFilter = 'week' | 'calendar';

const CATEGORY_FILTERS: { key: FilterCat; label: string; icon: string }[] = [
  { key: 'tumu',      label: 'Tümü',      icon: 'apps-outline' },
  { key: 'akademik',  label: 'Akademik',  icon: 'school-outline' },
  { key: 'sosyal',    label: 'Sosyal',    icon: 'people-outline' },
  { key: 'konser',    label: 'Konser',    icon: 'musical-notes-outline' },
  { key: 'tiyatro',   label: 'Tiyatro',   icon: 'color-palette-outline' },
  { key: 'stand-up',  label: 'Stand-up',  icon: 'mic-outline' },
  { key: 'son-tarih', label: 'Son Tarih', icon: 'alarm-outline' },
  { key: 'sinav',     label: 'Sınav',     icon: 'document-text-outline' },
  { key: 'genel',     label: 'Genel',     icon: 'information-circle-outline' },
];

const MONTHS_TR = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

function formatEventDate(isoDate: string) {
  const d = new Date(isoDate);
  return {
    day:   String(d.getDate()),
    month: MONTHS_TR[d.getMonth()].toUpperCase(),
    time:  `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
  };
}

const CATEGORY_ACCENT: Record<string, string> = {
  akademik: '#5442F5', sosyal: '#10b981', konser: '#f59e0b',
  tiyatro: '#ec4899', 'stand-up': '#8b5cf6', 'son-tarih': '#ef4444',
  sinav: '#3b82f6', genel: '#6b7280',
};

const EVENT_IMAGE_FALLBACKS: Record<string, string> = {
  akademik: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=900&h=900&fit=crop',
  sosyal: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&h=900&fit=crop',
  'son-tarih': 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=900&h=900&fit=crop',
  sinav: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=900&h=900&fit=crop',
  genel: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=900&h=900&fit=crop',
  konser: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&h=900&fit=crop',
  tiyatro: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=900&h=900&fit=crop',
  'stand-up': 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=900&h=900&fit=crop',
};

export default function DiscoverTab() {
  const { colors, themeName } = useTheme();
  const router = useRouter();
  const { events, loading: eventsLoading } = useEvents();
  const { announcements, loading: annLoading } = useAnnouncements();
  const { concerts, loading: concertsLoading } = useConcerts();
  const [filterCat, setFilterCat] = useState<FilterCat>('tumu');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('week');
  const [selectedConcert, setSelectedConcert] = useState<ConcertEvent | null>(null);
  const [showModal, setShowModal] = useState(false);

  const headerFade = useRef(new Animated.Value(0)).current;
  const listFade = useRef(new Animated.Value(0)).current;

  const isWeb = Platform.OS === 'web';
  const bg = colors.background;

  useEffect(() => {
    Animated.stagger(80, [
      Animated.timing(headerFade, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(listFade, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const filteredEvents = filterCat === 'tumu'
    ? events
    : events.filter((e) => e.category === filterCat);

  const filteredConcerts =
    filterCat === 'tumu'
      ? concerts
      : ['konser', 'tiyatro', 'stand-up'].includes(filterCat)
      ? concerts.filter((c) => c.category === filterCat)
      : [];

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const allItems = [
    ...filteredEvents.map((e) => ({ ...e, _type: 'event' as const })),
    ...filteredConcerts.map((c) => ({ ...c, _type: 'concert' as const })),
  ]
    .filter((item) => {
      if (viewFilter !== 'week') return true;
      const itemDate = new Date(item.date);
      return itemDate >= new Date() && itemDate <= sevenDaysFromNow;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const featuredItems = allItems.slice(0, 8);

  const openItem = (item: typeof allItems[number]) => {
    if (item._type === 'concert') {
      setSelectedConcert(item as any);
      setShowModal(true);
      return;
    }

    router.push({ pathname: '/events/[id]', params: { id: item.id } });
  };

  const getItemImage = (item: typeof allItems[number]) => {
    const category = ('category' in item ? item.category : 'genel') as string;
    return item.imageUrl || EVENT_IMAGE_FALLBACKS[category] || EVENT_IMAGE_FALLBACKS.genel;
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: bg }]}
      contentContainerStyle={[styles.content, isWeb && styles.webContent]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
            Yaklaşan{' '}
            <Text style={{ color: colors.accent, fontStyle: 'italic' }}>Etkinlikler</Text>
          </Text>
          <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>
            Sizin için seçilmiş şehir gündemi ve global buluşmalar.
          </Text>
        </View>
        <View style={styles.viewFilters}>
          <Pressable
            style={[styles.viewBtn, viewFilter === 'week' && { backgroundColor: colors.accent }]}
            onPress={() => setViewFilter('week')}
          >
            <Text style={[styles.viewBtnText, { color: viewFilter === 'week' ? '#fff' : colors.textMuted }]}>
              Bu Hafta
            </Text>
          </Pressable>
          <Pressable
            style={[styles.viewBtn, viewFilter === 'calendar' && { backgroundColor: colors.accent }, { backgroundColor: viewFilter === 'calendar' ? colors.accent : colors.surface, borderColor: colors.borderSubtle, borderWidth: 1 }]}
            onPress={() => setViewFilter('calendar')}
          >
            <Text style={[styles.viewBtnText, { color: viewFilter === 'calendar' ? '#fff' : colors.textMuted }]}>
              Takvim
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* ── Category Filters ── */}
      <Animated.View style={{ opacity: headerFade }}>
        {isWeb ? (
          <View style={styles.filterRowWeb}>
            {CATEGORY_FILTERS.map((f) => (
              <Pressable
                key={f.key}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: filterCat === f.key ? colors.accent : colors.surface,
                    borderColor: filterCat === f.key ? colors.accent : colors.borderSubtle,
                  },
                ]}
                onPress={() => setFilterCat(f.key)}
              >
                <Ionicons
                  name={f.icon as any}
                  size={13}
                  color={filterCat === f.key ? '#fff' : colors.textMuted}
                />
                <Text style={[styles.filterChipText, { color: filterCat === f.key ? '#fff' : colors.textMuted }]}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {CATEGORY_FILTERS.map((f) => (
              <Pressable
                key={f.key}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: filterCat === f.key ? colors.accent : colors.surface,
                    borderColor: filterCat === f.key ? colors.accent : colors.borderSubtle,
                  },
                ]}
                onPress={() => setFilterCat(f.key)}
              >
                <Ionicons
                  name={f.icon as any}
                  size={13}
                  color={filterCat === f.key ? '#fff' : colors.textMuted}
                />
                <Text style={[styles.filterChipText, { color: filterCat === f.key ? '#fff' : colors.textMuted }]}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </Animated.View>

      {/* ── Event List ── */}
      <Animated.View style={[styles.list, { opacity: listFade }]}>
        {(eventsLoading || concertsLoading) && allItems.length === 0 && (
          <View style={styles.loadingRow}>
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Etkinlikler yükleniyor...</Text>
          </View>
        )}

        {featuredItems.length > 0 && (
          <View style={styles.gallerySection}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.galleryTitle, { color: colors.textPrimary }]}>Öne Çıkan Etkinlikler</Text>
              <Text style={[styles.galleryCount, { color: colors.textMuted }]}>{featuredItems.length} etkinlik</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalGallery}>
              {featuredItems.map((item, idx) => (
                <EventSquareCard
                  key={`featured-${item.id}-${idx}`}
                  item={item}
                  imageUrl={getItemImage(item)}
                  colors={colors}
                  compact
                  onPress={() => openItem(item)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {allItems.length > 0 && (
          <View style={styles.gallerySection}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.galleryTitle, { color: colors.textPrimary }]}>Tüm Etkinlikler</Text>
              <Text style={[styles.galleryCount, { color: colors.textMuted }]}>{allItems.length} sonuç</Text>
            </View>
            <View style={[styles.squareGrid, isWeb && styles.squareGridWeb]}>
              {allItems.map((item, idx) => (
                <EventSquareCard
                  key={`grid-${item.id}-${idx}`}
                  item={item}
                  imageUrl={getItemImage(item)}
                  colors={colors}
                  onPress={() => openItem(item)}
                />
              ))}
            </View>
          </View>
        )}

        {allItems.length === 0 && !eventsLoading && !concertsLoading && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Bu kategori için etkinlik bulunamadı.
            </Text>
          </View>
        )}
      </Animated.View>

      {/* More button */}
      {allItems.length > 0 && (
        <Pressable style={styles.moreBtn}>
          <Text style={[styles.moreBtnText, { color: colors.textMuted }]}>DAHA FAZLA GÖSTER</Text>
        </Pressable>
      )}

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="sparkles" size={11} color={colors.accent} />
            <Text style={[styles.footerText, { color: colors.textMuted }]}>AI Destekli Gazete</Text>
          </View>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Gizlilik</Text>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Destek</Text>
        </View>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>© 2026 GazeteAI Hub v2.0</Text>
      </View>

      <ConcertTicketModal
        concert={selectedConcert}
        isVisible={showModal}
        onClose={() => { setShowModal(false); setSelectedConcert(null); }}
        colors={colors}
      />
    </ScrollView>
  );
}

function EventSquareCard({
  item,
  imageUrl,
  colors,
  compact = false,
  onPress,
}: {
  item: any;
  imageUrl: string;
  colors: any;
  compact?: boolean;
  onPress: () => void;
}) {
  const { day, month, time } = formatEventDate(item.date);
  const catKey = ('category' in item ? item.category : 'genel') as string;
  const accent = CATEGORY_ACCENT[catKey] ?? colors.accent;
  const label = EVENT_CATEGORY_LABELS?.[catKey as EventCategory] ?? catKey;
  const venue = ('venue' in item ? item.venue : item.location) ?? '';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.squareCard,
        compact && styles.squareCardCompact,
        !compact && isWebLike() && styles.squareCardWeb,
        { backgroundColor: colors.surface, borderColor: colors.borderSubtle, opacity: pressed ? 0.86 : 1 },
      ]}
    >
      <Image source={{ uri: imageUrl }} style={styles.squareImage} resizeMode="cover" />
      <View style={styles.squareScrim} />

      <View style={styles.squareDate}>
        <Text style={styles.squareDateDay}>{day}</Text>
        <Text style={styles.squareDateMonth}>{month}</Text>
      </View>

      <View style={styles.squareBody}>
        <View style={[styles.squareBadge, { backgroundColor: accent }]}>
          <Text style={styles.squareBadgeText}>{label.toUpperCase()}</Text>
        </View>
        <Text style={styles.squareTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.squareMetaRow}>
          <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.82)" />
          <Text style={styles.squareMetaText} numberOfLines={1}>{venue || 'Belirtilmedi'}</Text>
        </View>
        <View style={styles.squareMetaRow}>
          <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.82)" />
          <Text style={styles.squareMetaText}>{time}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function isWebLike() {
  return Platform.OS === 'web';
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 24, paddingBottom: 40, gap: 24 },
  webContent: { maxWidth: 1040, width: '100%' as any, alignSelf: 'center' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', flexWrap: 'wrap', gap: 16,
  },
  pageTitle: { fontSize: 34, fontWeight: '900', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, fontStyle: 'italic', marginTop: 4, fontWeight: '500' },
  viewFilters: { flexDirection: 'row', gap: 8 },
  viewBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  viewBtnText: { fontSize: 12, fontWeight: '700' },

  // Filters
  filterRow: { gap: 8, paddingVertical: 4 },
  filterRowWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    flexWrap: 'nowrap',
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  filterChipText: { fontSize: 11, fontWeight: '700' },

  // List
  list: { gap: 12 },
  loadingRow: { paddingVertical: 32, alignItems: 'center' },
  loadingText: { fontSize: 13 },
  gallerySection: { gap: 12 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  galleryTitle: { fontSize: 18, fontWeight: '900' },
  galleryCount: { fontSize: 12, fontWeight: '700' },
  horizontalGallery: { gap: 14, paddingRight: 8, paddingBottom: 4 },
  squareGrid: { gap: 14 },
  squareGridWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  squareCard: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  squareCardWeb: {
    width: '32%' as any,
    minWidth: 230,
  },
  squareCardCompact: {
    width: 238,
  },
  squareImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  squareScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  squareDate: {
    position: 'absolute',
    top: 12,
    left: 12,
    minWidth: 54,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.58)',
    paddingHorizontal: 9,
    paddingVertical: 7,
    alignItems: 'center',
  },
  squareDateDay: { color: '#fff', fontSize: 22, lineHeight: 23, fontWeight: '900' },
  squareDateMonth: { color: 'rgba(255,255,255,0.74)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  squareBody: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    gap: 7,
  },
  squareBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  squareBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  squareTitle: { color: '#fff', fontSize: 17, lineHeight: 22, fontWeight: '900' },
  squareMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  squareMetaText: { color: 'rgba(255,255,255,0.84)', fontSize: 12, fontWeight: '700', flex: 1 },

  // Event Card
  eventCard: {
    flexDirection: 'row', alignItems: 'center', gap: 0,
    borderRadius: 20, borderWidth: 1, overflow: 'hidden',
  },
  dateCol: {
    width: 80, paddingVertical: 20, alignItems: 'center',
    justifyContent: 'center', borderRightWidth: 1, gap: 2,
  },
  dateDay: { fontSize: 28, fontWeight: '900', lineHeight: 30 },
  dateMonth: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  details: { flex: 1, padding: 16, gap: 8 },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  categoryBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  eventTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, fontWeight: '500', maxWidth: 160 },
  actionBtn: {
    width: 52, alignSelf: 'stretch', alignItems: 'center',
    justifyContent: 'center', borderLeftWidth: 1,
  },

  // Empty
  emptyState: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },

  // More
  moreBtn: { alignItems: 'center', paddingVertical: 12 },
  moreBtnText: { fontSize: 11, fontWeight: '800', letterSpacing: 2 },

  // Footer
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap',
    gap: 8, paddingTop: 20, borderTopWidth: 1,
  },
  footerText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
});
