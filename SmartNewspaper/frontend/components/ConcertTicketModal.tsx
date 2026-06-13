import React from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ConcertEvent, getTicketUrl } from '@/hooks/useConcerts';
import { TicketSource } from '@/services/eventsApi';

interface ConcertTicketModalProps {
  concert: ConcertEvent | null;
  isVisible: boolean;
  onClose: () => void;
  colors: any;
}

const CATEGORY_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  konser: { label: 'Konser', icon: 'musical-notes', color: '#F59E0B' },
  tiyatro: { label: 'Tiyatro', icon: 'sparkles', color: '#EC4899' },
  'stand-up': { label: 'Stand-up', icon: 'mic', color: '#8B5CF6' },
};

const SOURCE_LABELS: Record<TicketSource, string> = {
  ticketmaster: 'Ticketmaster',
  biletix: 'Biletix',
  bubilet: 'BuBilet',
  passo: 'Passo',
};

const SOURCE_COLORS: Record<TicketSource, string> = {
  ticketmaster: '#E60B00',
  biletix: '#FF6B00',
  bubilet: '#2563EB',
  passo: '#7C3AED',
};

function formatDate(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return { day: 'Tarih', date: isoDate, time: '' };
  }

  return {
    day: date.toLocaleDateString('tr-TR', { weekday: 'long' }),
    date: date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
    time: date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
  };
}

export const ConcertTicketModal: React.FC<ConcertTicketModalProps> = ({
  concert,
  isVisible,
  onClose,
  colors,
}) => {
  const [loadingSource, setLoadingSource] = React.useState<TicketSource | null>(null);
  const entrance = React.useRef(new Animated.Value(0)).current;
  const pulse = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!isVisible) {
      entrance.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.spring(entrance, {
        toValue: 1,
        friction: 8,
        tension: 72,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, [entrance, isVisible, pulse]);

  if (!concert) return null;

  const categoryInfo = CATEGORY_META[concert.category] ?? CATEGORY_META.konser;
  const dateInfo = formatDate(concert.date);
  const ticketSources = concert.ticketOptions.length > 0
    ? Array.from(new Set(concert.ticketOptions.map((ticket) => ticket.source)))
    : (['ticketmaster'] as TicketSource[]);

  const animatedPanel = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [36, 0],
        }),
      },
      {
        scale: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [0.94, 1],
        }),
      },
    ],
  };

  const pulseStyle = {
    opacity: pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.18, 0.42],
    }),
    transform: [
      {
        scale: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.08],
        }),
      },
    ],
  };

  const handleBuyTickets = async (source: TicketSource) => {
    try {
      setLoadingSource(source);
      await Linking.openURL(getTicketUrl(concert, source));
    } catch (err) {
      console.error('Bilet linki acilamadi:', err);
    } finally {
      setLoadingSource(null);
    }
  };

  return (
    <Modal visible={isVisible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.panel,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
            },
            animatedPanel,
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[styles.glow, { backgroundColor: categoryInfo.color }, pulseStyle]}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Etkinlik penceresini kapat"
            onPress={onClose}
            style={styles.iconClose}
          >
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </Pressable>

          <View style={styles.content}>
            <View style={[styles.mediaColumn, { backgroundColor: colors.background }]}>
              <View style={[styles.poster, { borderColor: categoryInfo.color }]}>
                {concert.imageUrl ? (
                  <Image source={{ uri: concert.imageUrl }} style={styles.posterImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.posterFallback, { backgroundColor: `${categoryInfo.color}22` }]}>
                    <Ionicons name={categoryInfo.icon} size={52} color={categoryInfo.color} />
                  </View>
                )}
                <View style={styles.posterShade} />
                <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.color }]}>
                  <Ionicons name={categoryInfo.icon} size={15} color="#080A12" />
                  <Text style={styles.categoryText}>{categoryInfo.label}</Text>
                </View>
              </View>

              <View style={styles.quickRow}>
                <MiniStat colors={colors} icon="calendar-outline" value={dateInfo.date} accent={categoryInfo.color} />
                <MiniStat colors={colors} icon="time-outline" value={dateInfo.time} accent={categoryInfo.color} />
              </View>
            </View>

            <ScrollView
              style={styles.detailColumn}
              contentContainerStyle={styles.detailContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.heroText}>
                <Text style={[styles.dayText, { color: categoryInfo.color }]}>{dateInfo.day}</Text>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{concert.title}</Text>
                {!!concert.artist && (
                  <Text style={[styles.artist, { color: colors.textSecondary }]}>{concert.artist}</Text>
                )}
              </View>

              <View style={styles.infoGrid}>
                <InfoTile colors={colors} icon="location" label="Mekan" value={concert.venue || concert.location} accent={categoryInfo.color} />
                <InfoTile colors={colors} icon="pin" label="Şehir" value={concert.location || 'Belirtilmedi'} accent={categoryInfo.color} />
              </View>

              {!!concert.description && (
                <View style={[styles.descriptionBox, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Kısa Bakış</Text>
                  <Text style={[styles.description, { color: colors.textSecondary }]}>{concert.description}</Text>
                </View>
              )}

              <View style={styles.ticketSection}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Bilet Seçenekleri</Text>
                <View style={styles.ticketGrid}>
                  {ticketSources.map((source) => (
                    <Pressable
                      key={source}
                      accessibilityRole="button"
                      onPress={() => handleBuyTickets(source)}
                      disabled={loadingSource !== null}
                      style={({ pressed }) => [
                        styles.ticketButton,
                        {
                          backgroundColor: SOURCE_COLORS[source] ?? categoryInfo.color,
                          opacity: pressed ? 0.86 : 1,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        },
                      ]}
                    >
                      {loadingSource === source ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="ticket" size={17} color="#fff" />
                          <Text style={styles.ticketButtonText}>{SOURCE_LABELS[source] ?? 'Bilet Al'}</Text>
                          <Ionicons name="open-outline" size={15} color="#fff" />
                        </>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.closeButton,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.borderSubtle,
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}
              >
                <Ionicons name="arrow-back" size={17} color={colors.textPrimary} />
                <Text style={[styles.closeButtonText, { color: colors.textPrimary }]}>Etkinliklere Dön</Text>
              </Pressable>
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

function MiniStat({
  colors,
  icon,
  value,
  accent,
}: {
  colors: any;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  accent: string;
}) {
  return (
    <View style={[styles.miniStat, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
      <Ionicons name={icon} size={15} color={accent} />
      <Text style={[styles.miniStatText, { color: colors.textPrimary }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function InfoTile({
  colors,
  icon,
  label,
  value,
  accent,
}: {
  colors: any;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <View style={[styles.infoTile, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
      <View style={[styles.infoIcon, { backgroundColor: `${accent}22` }]}>
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.textPrimary }]} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.74)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Platform.OS === 'web' ? 28 : 14,
  },
  panel: {
    width: '100%',
    maxWidth: 1040,
    maxHeight: Platform.OS === 'web' ? 690 : '92%',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.42,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 20 },
    elevation: 20,
  },
  glow: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    right: -120,
    top: -170,
  },
  iconClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,10,18,0.66)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  content: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    minHeight: Platform.OS === 'web' ? 560 : undefined,
  },
  mediaColumn: {
    width: Platform.OS === 'web' ? 360 : '100%',
    padding: 18,
    gap: 12,
  },
  poster: {
    height: Platform.OS === 'web' ? 405 : 230,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  categoryBadge: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  categoryText: {
    color: '#080A12',
    fontSize: 12,
    fontWeight: '900',
  },
  quickRow: {
    flexDirection: Platform.OS === 'web' ? 'column' : 'row',
    gap: 10,
  },
  miniStat: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniStatText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  detailColumn: {
    flex: 1,
  },
  detailContent: {
    padding: Platform.OS === 'web' ? 32 : 18,
    paddingRight: Platform.OS === 'web' ? 58 : 18,
    gap: 18,
  },
  heroText: {
    gap: 6,
    paddingRight: 28,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: Platform.OS === 'web' ? 31 : 24,
    lineHeight: Platform.OS === 'web' ? 37 : 30,
    fontWeight: '900',
  },
  artist: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  infoGrid: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 10,
  },
  infoTile: {
    flex: 1,
    minHeight: 78,
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    flexDirection: 'row',
    gap: 10,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: {
    flex: 1,
    gap: 3,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  descriptionBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  ticketSection: {
    gap: 10,
  },
  ticketGrid: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: 10,
  },
  ticketButton: {
    minHeight: 48,
    borderRadius: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexGrow: 1,
  },
  ticketButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  closeButton: {
    minHeight: 46,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
