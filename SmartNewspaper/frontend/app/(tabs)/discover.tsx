import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
type ViewFilter = 'today' | 'week' | 'month' | 'calendar';

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
  const [calendarStart, setCalendarStart] = useState(toDateInputValue(new Date()));
  const [calendarEnd, setCalendarEnd] = useState(toDateInputValue(addDays(new Date(), 30)));
  const [appliedCalendarStart, setAppliedCalendarStart] = useState(toDateInputValue(new Date()));
  const [appliedCalendarEnd, setAppliedCalendarEnd] = useState(toDateInputValue(addDays(new Date(), 30)));
  const [selectedConcert, setSelectedConcert] = useState<ConcertEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [calendarError, setCalendarError] = useState<string>('');
  const [categoryNotifications, setCategoryNotifications] = useState<Record<FilterCat, boolean>>({
    tumu: false,
    akademik: true,
    sosyal: true,
    konser: true,
    tiyatro: true,
    'stand-up': true,
    'son-tarih': true,
    sinav: true,
    genel: true,
  });

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

  const handleApplyCalendarDates = () => {
    const startFallback = startOfDay(new Date());
    const endFallback = endOfDay(addDays(new Date(), 30));
    let start = parseDateInput(calendarStart, startFallback);
    let end = parseDateInput(calendarEnd, endFallback, true);
    
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setCalendarError('Geçersiz tarih formatı. YYYY-AA-GG formatını kullanın.');
      return;
    }

    if (start.getTime() > end.getTime()) {
      setCalendarError('Başlangıç tarihi bitiş tarihinden sonra olamaz.');
      return;
    }

    setAppliedCalendarStart(calendarStart);
    setAppliedCalendarEnd(calendarEnd);
    setCalendarError('');
  };

  const filteredEvents = filterCat === 'tumu'
    ? events
    : events.filter((e) => e.category === filterCat);

  const filteredConcerts =
    filterCat === 'tumu'
      ? concerts
      : ['konser', 'tiyatro', 'stand-up'].includes(filterCat)
      ? concerts.filter((c) => c.category === filterCat)
      : [];

  const getDateRange = (): { start: Date; end: Date } => {
    const today = new Date();
    if (viewFilter === 'today') {
      return { start: startOfDay(today), end: endOfDay(today) };
    }
    if (viewFilter === 'week') {
      return { start: startOfDay(today), end: endOfDay(addDays(today, 7)) };
    }
    if (viewFilter === 'month') {
      return { start: startOfDay(today), end: endOfMonth(today) };
    }

    const startFallback = startOfDay(today);
    const endFallback = endOfDay(addDays(today, 30));
    let start = parseDateInput(appliedCalendarStart, startFallback);
    let end = parseDateInput(appliedCalendarEnd, endFallback, true);
    if (start.getTime() > end.getTime()) {
      [start, end] = [startOfDay(end), endOfDay(start)];
    }
    return { start, end };
  };

  const selectedRange = getDateRange();

  const allItems = [
    ...filteredEvents.map((e) => ({ ...e, _type: 'event' as const })),
    ...filteredConcerts.map((c) => ({ ...c, _type: 'concert' as const })),
  ]
    .filter((item) => {
      const itemDate = new Date(item.date);
      return itemDate >= selectedRange.start && itemDate <= selectedRange.end;
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
            style={[styles.viewBtn, viewFilter === 'today' && { backgroundColor: colors.accent }, { backgroundColor: viewFilter === 'today' ? colors.accent : colors.surface, borderColor: colors.borderSubtle, borderWidth: 1 }]}
            onPress={() => setViewFilter('today')}
          >
            <Text style={[styles.viewBtnText, { color: viewFilter === 'today' ? '#fff' : colors.textMuted }]}>
              Bugün
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.viewBtn,
              {
                backgroundColor: viewFilter === 'week' ? colors.accent : colors.surface,
                borderColor: viewFilter === 'week' ? colors.accent : colors.borderSubtle,
              },
            ]}
            onPress={() => setViewFilter('week')}
          >
            <Text style={[styles.viewBtnText, { color: viewFilter === 'week' ? '#fff' : colors.textMuted }]}>
              Bu Hafta
            </Text>
          </Pressable>
          <Pressable
            style={[styles.viewBtn, viewFilter === 'month' && { backgroundColor: colors.accent }, { backgroundColor: viewFilter === 'month' ? colors.accent : colors.surface, borderColor: colors.borderSubtle, borderWidth: 1 }]}
            onPress={() => setViewFilter('month')}
          >
            <Text style={[styles.viewBtnText, { color: viewFilter === 'month' ? '#fff' : colors.textMuted }]}>
              Bu Ay
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
              <View key={f.key} style={styles.categoryChipContainer}>
                <Pressable
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
              </View>
            ))}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {CATEGORY_FILTERS.map((f) => (
              <View key={f.key} style={styles.categoryChipContainer}>
                <Pressable
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
              </View>
            ))}
          </ScrollView>
        )}
      </Animated.View>

      {/* ── Event List ── */}
      {viewFilter === 'calendar' && (
        <Animated.View
          style={[
            styles.calendarPanel,
            { opacity: headerFade, backgroundColor: colors.surface, borderColor: colors.borderSubtle },
          ]}
        >
          <View style={styles.calendarPanelHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.calendarPanelTitle, { color: colors.textPrimary }]}>Takvim Aralığı</Text>
              <Text style={[styles.calendarPanelHint, { color: colors.textMuted }]}>
                Tarih aralığını ve yukarıdaki kategoriyi seçerek etkinlikleri filtreleyin.
              </Text>
            </View>
            <Ionicons name="calendar-outline" size={20} color={colors.accent} />
          </View>

          <View style={styles.dateInputRow}>
            <View style={styles.dateInputGroup}>
              <Text style={[styles.dateInputLabel, { color: colors.textMuted }]}>Başlangıç</Text>
              <TextInput
                value={calendarStart}
                onChangeText={(val) => {
                  setCalendarStart(val);
                  setCalendarError('');
                }}
                placeholder="YYYY-AA-GG"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.dateInput,
                  { 
                    color: colors.textPrimary, 
                    borderColor: calendarError ? '#ef4444' : colors.borderSubtle, 
                    backgroundColor: colors.surfaceHigh,
                    borderWidth: calendarError ? 2 : 1,
                  },
                ]}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.dateInputGroup}>
              <Text style={[styles.dateInputLabel, { color: colors.textMuted }]}>Bitiş</Text>
              <TextInput
                value={calendarEnd}
                onChangeText={(val) => {
                  setCalendarEnd(val);
                  setCalendarError('');
                }}
                placeholder="YYYY-AA-GG"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.dateInput,
                  { 
                    color: colors.textPrimary, 
                    borderColor: calendarError ? '#ef4444' : colors.borderSubtle, 
                    backgroundColor: colors.surfaceHigh,
                    borderWidth: calendarError ? 2 : 1,
                  },
                ]}
                autoCapitalize="none"
              />
            </View>
          </View>

          {calendarError && (
            <View style={[styles.errorMessage, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
              <Text style={[styles.errorText, { color: '#ef4444' }]}>{calendarError}</Text>
            </View>
          )}

          <View style={styles.quickRangeRow}>
            {[
              ['Bugün', 0],
              ['7 Gün', 7],
              ['30 Gün', 30],
            ].map(([label, days]) => (
              <Pressable
                key={String(label)}
                style={[styles.quickRangeBtn, { backgroundColor: colors.surfaceHigh, borderColor: colors.borderSubtle }]}
                onPress={() => {
                  const now = new Date();
                  setCalendarStart(toDateInputValue(now));
                  setCalendarEnd(toDateInputValue(addDays(now, Number(days))));
                  setCalendarError('');
                }}
              >
                <Text style={[styles.quickRangeText, { color: colors.textPrimary }]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.applyButton, { backgroundColor: colors.accent }]}
            onPress={handleApplyCalendarDates}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
            <Text style={styles.applyButtonText}>Tarihleri Onayla</Text>
          </Pressable>

          {appliedCalendarStart !== toDateInputValue(new Date()) && (
            <View style={[styles.appliedInfo, { backgroundColor: `${colors.accent}15`, borderColor: colors.accent }]}>
              <Ionicons name="checkmark" size={14} color={colors.accent} />
              <Text style={[styles.appliedInfoText, { color: colors.accent }]}>
                Filtre uygulandı: {appliedCalendarStart} ile {appliedCalendarEnd}
              </Text>
            </View>
          )}
        </Animated.View>
      )}

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

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function endOfMonth(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function parseDateInput(value: string, fallback: Date, end = false): Date {
  const parsed = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}`);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed;
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
  viewFilters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  viewBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
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

  // Calendar Range
  calendarPanel: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  calendarPanelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  calendarPanelTitle: { fontSize: 16, fontWeight: '900' },
  calendarPanelHint: { fontSize: 12, lineHeight: 17, marginTop: 4, fontWeight: '500' },
  dateInputRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dateInputGroup: {
    flex: 1,
    minWidth: 150,
    gap: 6,
  },
  dateInputLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  dateInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '700',
  },
  quickRangeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickRangeBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  quickRangeText: { fontSize: 11, fontWeight: '800' },
  
  // Apply Button
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  applyButtonText: { 
    fontSize: 13, 
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.4,
  },

  // Error and Applied Info
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  appliedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  appliedInfoText: {
    fontSize: 12,
    fontWeight: '600',
  },

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
