import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
  Image,
  ActivityIndicator,
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

export const ConcertTicketModal: React.FC<ConcertTicketModalProps> = ({
  concert,
  isVisible,
  onClose,
  colors,
}) => {
  const [selectedSource, setSelectedSource] = React.useState<TicketSource | null>(null);
  const [loading, setLoading] = React.useState(false);

  if (!concert) return null;

  const handleBuyTickets = async (source: TicketSource) => {
    try {
      setLoading(true);
      const url = getTicketUrl(concert, source);
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // Fallback: open in browser (React Native Linking will use web browser)
        await Linking.openURL(url);
      }
    } catch (err) {
      console.error('URL açılamadı:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return {
      date: date.toLocaleDateString('tr-TR'),
      time: date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const { date, time } = formatDate(concert.date);


  const getCategoryInfo = (category?: string) => {
    switch (category) {
      case 'stand-up':
        return { emoji: '🎤', label: 'Stand-up', color: '#8B5CF6' };
      case 'tiyatro':
        return { emoji: '🎭', label: 'Tiyatro', color: '#EC4899' };
      default:
        return { emoji: '🎵', label: 'Konser', color: '#F59E0B' };
    }
  };

  const categoryInfo = getCategoryInfo(concert.category);

  const sourceLabels: Record<TicketSource, string> = {
    ticketmaster: '🎟 Ticketmaster',
    biletix: '🎫 Biletix',
    bubilet: '🎪 BuBilet',
    passo: '🎭 Passo',
  };

  const sourceColors: Record<TicketSource, string> = {
    ticketmaster: '#E60B00',
    biletix: '#FF6B00',
    bubilet: '#2563EB',
    passo: '#7C3AED',
  };


  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>

        {/* Header with Category Badge */}

        {/* Header */}

        <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>

          <View style={styles.headerContent}>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: categoryInfo.color + '20', borderColor: categoryInfo.color },
              ]}
            >
              <Text style={[styles.categoryEmoji]}>{categoryInfo.emoji}</Text>
              <Text style={[styles.categoryLabel, { color: categoryInfo.color }]}>
                {categoryInfo.label}
              </Text>
            </View>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Main Content - Horizontal Split */}
        <View style={styles.mainContent}>
          {/* Left: Image Section */}
          <View style={styles.imageSection}>
            {concert.imageUrl ? (
              <Image
                source={{ uri: concert.imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: colors.surface }]}>
                <Ionicons name="image" size={48} color={colors.textMuted} />
              </View>
            )}
          </View>

          {/* Right: Details Section */}
          <ScrollView
            style={styles.detailsSection}
            contentContainerStyle={styles.detailsContent}
          >
            {/* Artist Name - Prominent */}
            {concert.artist && (
              <View style={styles.artistSection}>
                <Text style={[styles.artist, { color: categoryInfo.color }]}>
                  {concert.artist}
                </Text>
                <View
                  style={[
                    styles.artistUnderline,
                    { backgroundColor: categoryInfo.color },
                  ]}
                />
              </View>
            )}

            {/* Concert Title */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {concert.title}
            </Text>

            {/* Details with Icons */}
            <View style={styles.detailsWrapper}>
              <View style={styles.detailRow}>
                <View
                  style={[
                    styles.detailIcon,
                    { backgroundColor: categoryInfo.color + '20' },
                  ]}
                >
                  <Ionicons name="calendar" size={14} color={categoryInfo.color} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                    Tarih & Saat
                  </Text>
                  <Text style={[styles.detail, { color: colors.textPrimary }]}>
                    {date} • {time}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View
                  style={[
                    styles.detailIcon,
                    { backgroundColor: categoryInfo.color + '20' },
                  ]}
                >
                  <Ionicons name="location" size={14} color={categoryInfo.color} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                    Mekan
                  </Text>
                  <Text style={[styles.detail, { color: colors.textPrimary }]}>
                    {concert.venue}
                  </Text>
                </View>
              </View>
            </View>

            {/* Description */}
            {concert.description && (
              <View style={styles.descriptionSection}>
                <Text style={[styles.descriptionLabel, { color: colors.textMuted }]}>
                  Açıklama
                </Text>
                <Text style={[styles.description, { color: colors.textPrimary }]}>
                  {concert.description}
                </Text>
              </View>
            )}

            {/* Ticket Button */}
            <Pressable
              style={({ pressed }) => [
                styles.ticketButton,
                {
                  backgroundColor: '#E60B00',
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
              onPress={() => handleBuyTickets('ticketmaster')}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="ticket" size={16} color="#fff" />
                  <Text style={styles.ticketButtonText}>Ticketmaster'dan Al</Text>
                  <Ionicons name="open" size={14} color="#fff" />
                </>
              )}
            </Pressable>

            {/* Close Button */}
            <Pressable
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={onClose}
            >
              <Text style={[styles.closeButtonText, { color: colors.textPrimary }]}>
                Kapat
              </Text>
            </Pressable>
          </ScrollView>
        </View>

      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  imageSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsSection: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
  },
  detailsContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  artistSection: {
    marginBottom: 4,
  },
  artist: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  artistUnderline: {
    height: 3,
    width: '40%',
    borderRadius: 2,
    marginTop: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 8,
  },
  detailsWrapper: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detail: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  descriptionSection: {
    gap: 8,
    paddingVertical: 8,
  },
  descriptionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
  },
  ticketButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  closeButton: {
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonText: {
    fontWeight: '600',
    fontSize: 13,
  },
});
