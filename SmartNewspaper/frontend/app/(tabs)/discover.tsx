import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useEvents, useAnnouncements } from '@/hooks/useEvents';
import { useTheme } from '@/hooks/useTheme';
import { EventCategory, EVENT_CATEGORY_LABELS, EVENT_CATEGORY_COLORS } from '@/services/eventsApi';
import { Radius, Spacing, Typography } from '@/constants/theme';

type FilterCat = EventCategory | 'tumu';

const CATEGORY_FILTERS: { key: FilterCat; label: string; icon: string }[] = [
  { key: 'tumu',      label: 'Tümü',      icon: 'apps-outline' },
  { key: 'akademik',  label: 'Akademik',  icon: 'school-outline' },
  { key: 'sosyal',    label: 'Sosyal',    icon: 'people-outline' },
  { key: 'son-tarih', label: 'Son Tarih', icon: 'alarm-outline' },
  { key: 'sinav',     label: 'Sınav',     icon: 'document-text-outline' },
  { key: 'genel',     label: 'Genel',     icon: 'information-circle-outline' },
];

function formatEventDate(isoDate: string) {
  const d = new Date(isoDate);
  const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return {
    day:   String(d.getDate()).padStart(2, '0'),
    month: months[d.getMonth()],
    time:  `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
  };
}

function daysUntil(isoDate: string): number {
  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatAnnDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function Discover() {
  const router   = useRouter();
  const { colors: themeColors, themeName } = useTheme();
  const colors =
    themeName === 'vincent'
      ? {
          ...themeColors,
          background: themeColors.surface,
          surfaceHigh: themeColors.surface,
          surfaceInput: themeColors.surface,
        }
      : themeColors;
  const [activeCategory, setActiveCategory] = useState<FilterCat>('tumu');

  const selectedCat = activeCategory === 'tumu' ? undefined : activeCategory;
  const { upcoming, past, loading: eventsLoading, error: eventsError } = useEvents(selectedCat);
  const { critical, normal, loading: annLoading } = useAnnouncements();

  const s = styles(colors);

  // Özet istatistikler
  const thisWeek = upcoming.filter((e) => daysUntil(e.date) <= 7);
  const important = upcoming.filter((e) => e.isImportant);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      {/* ── Özet İstatistik Satırı ── */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statNum}>{upcoming.length}</Text>
          <Text style={s.statLabel}>Yaklaşan</Text>
        </View>
        <View style={[s.statCard, s.statCardMid]}>
          <Text style={[s.statNum, { color: '#F59E0B' }]}>{thisWeek.length}</Text>
          <Text style={s.statLabel}>Bu Hafta</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statNum, { color: '#EF4444' }]}>{important.length}</Text>
          <Text style={s.statLabel}>Önemli</Text>
        </View>
      </View>

      {/* ── Kritik Duyurular ── */}
      {!annLoading && critical.length > 0 && (
        <>
          {critical.map((ann) => (
            <View key={ann.id} style={s.criticalCard}>
              <View style={s.criticalLeft}>
                <View style={s.criticalIconBox}>
                  <Ionicons name="alert-circle" size={16} color="#fff" />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.criticalTitle}>{ann.title}</Text>
                <Text style={s.criticalBody}>{ann.content}</Text>
                {ann.expiresAt && (
                  <Text style={s.criticalExpiry}>
                    Son tarih: {formatAnnDate(ann.expiresAt)}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </>
      )}

      {/* ── Kategori Filtresi ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
      >
        {CATEGORY_FILTERS.map(({ key, label, icon }) => {
          const isActive = activeCategory === key;
          const color = key === 'tumu' ? colors.accent : EVENT_CATEGORY_COLORS[key as EventCategory];
          return (
            <Pressable
              key={key}
              style={[s.chip, isActive && { backgroundColor: color, borderColor: color }]}
              onPress={() => setActiveCategory(key)}
            >
              <Ionicons
                name={icon as any}
                size={13}
                color={isActive ? '#fff' : colors.textMuted}
              />
              <Text style={[s.chipText, isActive && { color: '#fff' }]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Yükleniyor / Hata ── */}
      {eventsLoading && (
        <ActivityIndicator color={colors.accent} style={{ marginVertical: Spacing.xl }} />
      )}
      {eventsError && (
        <Text style={[s.emptyText, { color: colors.error }]}>
          Etkinlikler yüklenemedi: {eventsError}
        </Text>
      )}

      {/* ── Yaklaşan Etkinlikler ── */}
      {!eventsLoading && upcoming.length > 0 && (
        <>
          <SectionDivider
            label="Yaklaşan Etkinlikler"
            count={upcoming.length}
            dotColor={colors.accent}
            colors={colors}
          />

          {upcoming.map((event) => {
            const { day, month, time } = formatEventDate(event.date);
            const catColor = EVENT_CATEGORY_COLORS[event.category];
            const days = daysUntil(event.date);
            const countdownLabel =
              days === 0 ? 'Bugün' : days === 1 ? 'Yarın' : `${days} gün`;
            const countdownUrgent = days <= 3;

            return (
              <Pressable
                key={event.id}
                style={s.eventCard}
                onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}
              >
                {/* Sol renkli çizgi */}
                <View style={[s.cardAccent, { backgroundColor: catColor }]} />

                <View style={s.cardInner}>
                  {/* Üst satır: kategori + önemli + countdown */}
                  <View style={s.cardTopRow}>
                    <View style={[s.catPill, { backgroundColor: catColor + '22', borderColor: catColor + '55' }]}>
                      <Text style={[s.catPillText, { color: catColor }]}>
                        {EVENT_CATEGORY_LABELS[event.category]}
                      </Text>
                    </View>
                    {event.isImportant && (
                      <View style={s.starBadge}>
                        <Ionicons name="star" size={10} color="#F59E0B" />
                      </View>
                    )}
                    <View style={{ flex: 1 }} />
                    <View style={[
                      s.countdownBadge,
                      countdownUrgent
                        ? { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }
                        : { backgroundColor: colors.surfaceInput, borderColor: colors.borderSubtle },
                    ]}>
                      <Ionicons
                        name="time-outline"
                        size={11}
                        color={countdownUrgent ? '#EF4444' : colors.textMuted}
                      />
                      <Text style={[
                        s.countdownText,
                        { color: countdownUrgent ? '#EF4444' : colors.textMuted },
                      ]}>
                        {countdownLabel}
                      </Text>
                    </View>
                  </View>

                  {/* Başlık */}
                  <Text style={s.cardTitle} numberOfLines={2}>{event.title}</Text>

                  {/* Özet */}
                  <Text style={s.cardSummary} numberOfLines={2}>{event.summary}</Text>

                  {/* Alt satır: tarih + yer */}
                  <View style={s.cardMeta}>
                    {/* Tarih kutusu */}
                    <View style={[s.datePill, { borderColor: catColor + '40' }]}>
                      <Text style={[s.datePillDay, { color: catColor }]}>{day}</Text>
                      <Text style={[s.datePillMonth, { color: catColor }]}>{month}</Text>
                    </View>
                    <View style={s.cardMetaRight}>
                      <View style={s.metaRow}>
                        <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                        <Text style={s.metaText}>{time}</Text>
                      </View>
                      <View style={s.metaRow}>
                        <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                        <Text style={s.metaText} numberOfLines={1}>{event.location}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </>
      )}

      {!eventsLoading && upcoming.length === 0 && !eventsError && (
        <View style={s.emptyBox}>
          <View style={[s.emptyIconBox, { borderColor: colors.borderSubtle }]}>
            <Ionicons name="calendar-outline" size={28} color={colors.textMuted} />
          </View>
          <Text style={s.emptyTitle}>Yaklaşan etkinlik yok</Text>
          <Text style={s.emptyText}>Bu kategoride henüz etkinlik eklenmemiş.</Text>
        </View>
      )}

      {/* ── Geçmiş Etkinlikler ── */}
      {!eventsLoading && past.length > 0 && (
        <>
          <SectionDivider
            label="Geçmiş Etkinlikler"
            count={past.length}
            dotColor={colors.textMuted}
            colors={colors}
            muted
          />

          {past.map((event) => {
            const { day, month } = formatEventDate(event.date);
            return (
              <Pressable
                key={event.id}
                style={[s.eventCard, s.eventCardPast]}
                onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}
              >
                <View style={[s.cardAccent, { backgroundColor: colors.borderSubtle }]} />
                <View style={s.cardInner}>
                  <View style={s.cardTopRow}>
                    <View style={[s.catPill, { backgroundColor: colors.surfaceInput, borderColor: colors.borderSubtle }]}>
                      <Text style={[s.catPillText, { color: colors.textMuted }]}>
                        {EVENT_CATEGORY_LABELS[event.category]}
                      </Text>
                    </View>
                  </View>
                  <Text style={[s.cardTitle, { color: colors.textMuted }]} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <View style={s.cardMeta}>
                    <View style={[s.datePill, { borderColor: colors.borderSubtle }]}>
                      <Text style={[s.datePillDay, { color: colors.textMuted }]}>{day}</Text>
                      <Text style={[s.datePillMonth, { color: colors.textMuted }]}>{month}</Text>
                    </View>
                    <View style={s.metaRow}>
                      <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                      <Text style={s.metaText} numberOfLines={1}>{event.location}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </>
      )}

      {/* ── Normal Duyurular ── */}
      {!annLoading && normal.length > 0 && (
        <>
          <SectionDivider
            label="Duyurular"
            count={normal.length}
            dotColor="#10B981"
            colors={colors}
          />

          {normal.map((ann, i) => (
            <View
              key={ann.id}
              style={[s.annCard, i === normal.length - 1 && { borderBottomWidth: 0 }]}
            >
              <View style={[s.annDot, { backgroundColor: '#10B98122' }]}>
                <Ionicons name="megaphone-outline" size={15} color="#10B981" />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={s.annTitle}>{ann.title}</Text>
                <Text style={s.annBody}>{ann.content}</Text>
                <Text style={s.annDate}>{formatAnnDate(ann.publishedAt)}</Text>
              </View>
            </View>
          ))}
        </>
      )}

    </ScrollView>
  );
}

// ─── Section Divider Bileşeni ───────────────────────────────────────────────
function SectionDivider({
  label, count, dotColor, colors, muted = false,
}: {
  label: string; count: number; dotColor: string; colors: any; muted?: boolean;
}) {
  return (
    <View style={sdStyles.row}>
      <View style={[sdStyles.dot, { backgroundColor: dotColor }]} />
      <Text style={[sdStyles.label, { color: muted ? colors.textMuted : colors.textPrimary }]}>
        {label}
      </Text>
      <View style={[sdStyles.line, { backgroundColor: colors.borderSubtle }]} />
      <View style={[sdStyles.badge, { backgroundColor: colors.surfaceInput }]}>
        <Text style={[sdStyles.badgeText, { color: colors.textMuted }]}>{count}</Text>
      </View>
    </View>
  );
}

const sdStyles = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  dot:       { width: 7, height: 7, borderRadius: 4 },
  label:     { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  line:      { flex: 1, height: 1 },
  badge:     { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content:   { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },

    // İstatistik satırı
    statsRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      gap: 2,
    },
    statCardMid: {
      borderColor: '#F59E0B44',
    },
    statNum: {
      fontSize: Typography.fontSize.xl,
      fontWeight: '800',
      color: colors.accent,
    },
    statLabel: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
      fontWeight: Typography.fontWeight.medium,
    },

    // Kritik duyuru kartı
    criticalCard: {
      flexDirection: 'row',
      backgroundColor: '#FEF2F2',
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: '#FECACA',
      overflow: 'hidden',
      gap: Spacing.sm,
      padding: Spacing.md,
    },
    criticalLeft: { justifyContent: 'flex-start', paddingTop: 1 },
    criticalIconBox: {
      width: 28,
      height: 28,
      borderRadius: Radius.md,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
    },
    criticalTitle: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold,
      color: '#991B1B',
      marginBottom: 3,
    },
    criticalBody: {
      fontSize: Typography.fontSize.sm,
      color: '#7F1D1D',
      lineHeight: 18,
    },
    criticalExpiry: {
      fontSize: Typography.fontSize.xs,
      color: '#EF4444',
      marginTop: 5,
      fontWeight: Typography.fontWeight.medium,
    },

    // Kategori filtresi
    filterRow: { gap: Spacing.sm, paddingVertical: Spacing.xs },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: Spacing.md,
      paddingVertical: 7,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
      color: colors.textSecondary,
    },

    // Etkinlik kartı
    eventCard: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      overflow: 'hidden',
    },
    eventCardPast: { opacity: 0.6 },
    cardAccent: { width: 4 },
    cardInner: {
      flex: 1,
      padding: Spacing.md,
      gap: 6,
    },

    // Kart üst satır
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    catPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: Radius.full,
      borderWidth: 1,
    },
    catPillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
    starBadge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#FEF3C7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    countdownBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: Radius.full,
      borderWidth: 1,
    },
    countdownText: { fontSize: 11, fontWeight: '700' },

    // Kart başlık / özet
    cardTitle: {
      fontSize: Typography.fontSize.base,
      fontWeight: '700',
      color: colors.textPrimary,
      lineHeight: 21,
    },
    cardSummary: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: 18,
    },

    // Kart alt meta
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginTop: 2,
    },
    datePill: {
      width: 38,
      paddingVertical: 4,
      borderRadius: Radius.sm,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    datePillDay:   { fontSize: 14, fontWeight: '800', lineHeight: 18 },
    datePillMonth: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    cardMetaRight: { flex: 1, gap: 3 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: Typography.fontSize.xs, color: colors.textMuted, flex: 1 },

    // Boş durum
    emptyBox: {
      alignItems: 'center',
      paddingVertical: Spacing.xxl,
      gap: Spacing.sm,
    },
    emptyIconBox: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    emptyTitle: {
      fontSize: Typography.fontSize.md,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textSecondary,
    },
    emptyText: {
      fontSize: Typography.fontSize.sm,
      color: colors.textMuted,
      textAlign: 'center',
    },

    // Duyuru kartı
    annCard: {
      flexDirection: 'row',
      gap: Spacing.md,
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
      alignItems: 'flex-start',
    },
    annDot: {
      width: 36,
      height: 36,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    annTitle: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    annBody: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    annDate: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
    },
  });