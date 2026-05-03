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

  const sourceLabels: Record<TicketSource, string> = {
    biletix: '🎫 Biletix',
    bubilet: '🎪 BuBilet',
    passo: '🎭 Passo',
  };

  const sourceColors: Record<TicketSource, string> = {
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
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Bilet Seçenekleri
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          {/* Concert Image */}
          {concert.imageUrl && (
            <Image
              source={{ uri: concert.imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          )}

          {/* Concert Info */}
          <View style={styles.infoBox}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {concert.title}
            </Text>
            
            {concert.artist && (
              <Text style={[styles.artist, { color: colors.textMuted }]}>
                🎤 {concert.artist}
              </Text>
            )}

            <View style={styles.detailRow}>
              <Ionicons name="calendar" size={16} color={colors.accent} />
              <Text style={[styles.detail, { color: colors.textPrimary }]}>
                {date} • {time}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location" size={16} color={colors.accent} />
              <Text style={[styles.detail, { color: colors.textPrimary }]}>
                {concert.venue}
              </Text>
            </View>

            {concert.description && (
              <Text style={[styles.description, { color: colors.textMuted }]}>
                {concert.description}
              </Text>
            )}
          </View>

          {/* Ticket Sources */}
          <View style={styles.sourcesContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Bilet Satın Alma
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
              Aşağıdaki platformlardan bilet satın alabilirsiniz:
            </Text>

            {concert.ticketOptions && concert.ticketOptions.length > 0 ? (
              concert.ticketOptions.map((option, idx) => (
                <Pressable
                  key={idx}
                  style={({ pressed }) => [
                    styles.sourceButton,
                    {
                      backgroundColor: sourceColors[option.source],
                      opacity: pressed ? 0.8 : 1,
                      borderColor: sourceColors[option.source],
                    },
                  ]}
                  onPress={() => handleBuyTickets(option.source)}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.sourceButtonText}>
                        {sourceLabels[option.source]}
                      </Text>
                      {option.price && (
                        <Text style={styles.sourcePrice}>{option.price}</Text>
                      )}
                    </>
                  )}
                </Pressable>
              ))
            ) : (
              <Text style={[styles.noTickets, { color: colors.textMuted }]}>
                Şu anda bilet satıcı bulunamadı
              </Text>
            )}
          </View>

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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingBottom: 32,
  },
  image: {
    width: '100%',
    height: 220,
    backgroundColor: '#e5e7eb',
  },
  infoBox: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  artist: {
    fontSize: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detail: {
    fontSize: 13,
    flex: 1,
  },
  description: {
    fontSize: 12,
    marginTop: 4,
  },
  sourcesContainer: {
    paddingHorizontal: 16,
    gap: 12,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 12,
  },
  sourceButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  sourceButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  sourcePrice: {
    color: '#fff',
    fontSize: 11,
    marginTop: 4,
  },
  noTickets: {
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 13,
  },
  closeButton: {
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  closeButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
