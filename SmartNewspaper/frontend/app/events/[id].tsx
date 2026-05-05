import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Linking, Image, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { useEvents } from '@/hooks/useEvents';
import { useConcerts, getTicketUrl } from '@/hooks/useConcerts';
import { EVENTS } from '@/services/content';
import { Radius, Spacing, Typography } from '@/constants/theme';

export default function EventDetailPage() {
  const { colors } = useTheme();
  const { id, type } = useLocalSearchParams<{ id: string; type?: string }>();
  const { events } = useEvents();
  const { concerts } = useConcerts();

  let item: any = null;

  if (type === 'concert') {
    item = concerts.find((concert) => concert.id === id);
  } else {
    item = events.find((event) => event.id === id);
    if (!item) {
      item = EVENTS.find((event) => event.id === id);
    }
  }

  if (!item) {
    return (
      <View style={[styles(colors).notFoundContainer]}>
        <Text style={styles(colors).notFoundTitle}>
          {type === 'concert' ? 'Konser' : 'Etkinlik'} bulunamadi
        </Text>
        <Text style={styles(colors).notFoundBody}>Lutfen listesinden tekrar deneyin.</Text>
      </View>
    );
  }

  return (
    <View style={[styles(colors).container]}>
      <ScrollView contentContainerStyle={styles(colors).content}>
        <View style={styles(colors).wrapper}>
          {/* Hero Image - Left Side */}
          {item.imageUrl && (
            <View style={styles(colors).imageContainer}>
              <Image
                source={{ uri: item.imageUrl }}
                style={styles(colors).heroImage}
              />
            </View>
          )}

          {/* Content - Right Side */}
          <View style={[styles(colors).contentCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            {/* Title */}
            <Text style={[styles(colors).title, { color: colors.textPrimary }]}>{item.title}</Text>

            {/* Artist if concert */}
            {item.artist && (
              <Text style={[styles(colors).artist, { color: colors.accent }]}>
                {item.artist}
              </Text>
            )}

            {/* Meta Information */}
            <View style={styles(colors).metaSection}>
              <View style={styles(colors).metaItem}>
                <Ionicons name="calendar" size={16} color={colors.accent} />
                <Text style={[styles(colors).metaText, { color: colors.textMuted }]}>
                  {item.date}
                </Text>
              </View>

              <View style={styles(colors).metaItem}>
                <Ionicons name="location" size={16} color={colors.accent} />
                <Text style={[styles(colors).metaText, { color: colors.textMuted }]}>
                  {item.venue || item.location || 'Bilinmiyor'}
                </Text>
              </View>

              {item.category && (
                <View style={styles(colors).metaItem}>
                  <Ionicons name="tag" size={16} color={colors.accent} />
                  <Text style={[styles(colors).metaText, { color: colors.textMuted }]}>
                    {item.category}
                  </Text>
                </View>
              )}
            </View>

            {/* Description */}
            {item.description && (
              <View style={styles(colors).descriptionSection}>
                <Text style={[styles(colors).sectionTitle, { color: colors.textPrimary }]}>
                  Hakkında
                </Text>
                <Text style={[styles(colors).description, { color: colors.textMuted }]}>
                  {item.description}
                </Text>
              </View>
            )}

            {/* Ticket Button */}
            {item.ticketOptions && item.ticketOptions.length > 0 && (
              <TouchableOpacity
                style={[styles(colors).ticketButton, { backgroundColor: colors.accent }]}
                onPress={() => {
                  const url = type === 'concert' ? getTicketUrl(item) : (item.ticketOptions?.[0]?.url || 'https://www.biletix.com');
                  Linking.openURL(url);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="ticket" size={18} color="#fff" />
                <Text style={styles(colors).ticketButtonText}>Bilet Al</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
  },
  content: {
    paddingBottom: Spacing.xl,
    flexGrow: 1,
  },
  wrapper: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 0,
    padding: 0,
    alignItems: 'stretch',
    width: '100%',
    flex: 1,
  },
  imageContainer: {
    flex: Platform.OS === 'web' ? 1 : undefined,
    width: Platform.OS === 'web' ? '50%' : '100%',
    height: Platform.OS === 'web' ? 'auto' : 250,
    minHeight: Platform.OS === 'web' ? 600 : 250,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  contentCard: {
    flex: Platform.OS === 'web' ? 1 : undefined,
    width: Platform.OS === 'web' ? '50%' : '100%',
    borderRadius: 0,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 0,
  },
  title: {
    color: colors.textPrimary,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  artist: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
  },
  metaSection: {
    gap: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  metaText: {
    fontSize: Typography.fontSize.base,
    flex: 1,
  },
  metaCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  descriptionSection: {
    gap: Spacing.sm,
  },
  descriptionCard: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  description: {
    color: colors.textSecondary,
    fontSize: Typography.fontSize.base,
    lineHeight: 22,
  },
  ticketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  ticketButtonText: {
    color: '#fff',
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  notFoundContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  notFoundTitle: {
    color: colors.textPrimary,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  notFoundBody: {
    color: colors.textSecondary,
    fontSize: Typography.fontSize.base,
  },
});
