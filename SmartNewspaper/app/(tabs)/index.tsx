
import { StyleSheet, FlatList, TouchableOpacity, Modal, Pressable, Platform, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';


import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography, Colors } from '@/constants/theme';
import { useState } from 'react';

export default function TabOneScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles(colors).container]}>
      <Text style={styles(colors).title}>Ana Sayfa</Text>
      <View style={[styles(colors).separator]} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <EditScreenInfo path="app/(tabs)/index.tsx" />
    </View>
  );
}

// styles fonksiyonu en üste taşındı
const styles = (colors: any) => StyleSheet.create({
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sortButton: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 18,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sortButtonActive: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent,
  },
  sortButtonText: {
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  sortButtonTextActive: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: Colors.background,
    paddingTop: 40,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  filterButton: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterButtonActive: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent,
  },
  filterButtonText: {
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  filterButtonTextActive: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
  },
  newsCard: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: Colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  newsTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 4,
    color: Colors.textPrimary,
  },
  newsSummary: {
    color: Colors.textMuted,
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSummary: {
    color: Colors.textMuted,
    marginBottom: 12,
    textAlign: 'center',
  },
  pdfButton: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  pdfButtonText: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.md,
  },
  closeButton: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  closeButtonText: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    fontSize: Typography.fontSize.base,
  },
});

// Daha fazla örnek haber verisi
const newsData = [
  {
    id: '1',
    title: 'Yapay Zeka Gazeteciliği Değiştiriyor',
    summary: 'Yapay zeka, haber üretim süreçlerinde devrim yaratıyor.',
    source: 'TeknoHaber',
    date: '2026-03-21',
    category: 'Teknoloji',
    popularity: 5,
  },
  {
    id: '2',
    title: 'Spor Dünyasında Yeni Rekor',
    summary: 'Atletizmde yeni dünya rekoru kırıldı.',
    source: 'SporX',
    date: '2026-03-22',
    category: 'Spor',
    popularity: 8,
  },
  {
    id: '3',
    title: 'Ekonomi Gündemi: Enflasyon',
    summary: 'Enflasyon oranları beklentilerin üzerinde geldi.',
    source: 'EkonomiTürk',
    date: '2026-03-20',
    category: 'Ekonomi',
    popularity: 7,
  },
  {
    id: '4',
    title: 'Uzay Turizmi Başladı',
    summary: 'İlk ticari uzay turizmi uçuşu başarıyla tamamlandı.',
    source: 'BilimDergi',
    date: '2026-03-19',
    category: 'Teknoloji',
    popularity: 9,
  },
  {
    id: '5',
    title: 'Futbol Ligi Şampiyonu Belli Oldu',
    summary: 'Süper Lig’de sezonun şampiyonu belli oldu.',
    source: 'FutbolGazetesi',
    date: '2026-03-18',
    category: 'Spor',
    popularity: 6,
  },
  {
    id: '6',
    title: 'Borsa Yükselişte',
    summary: 'Borsa İstanbul haftaya yükselişle başladı.',
    source: 'FinansHaber',
    date: '2026-03-17',
    category: 'Ekonomi',
    popularity: 7,
  },
  {
    id: '7',
    title: 'Yenilenebilir Enerji Yatırımları Artıyor',
    summary: 'Türkiye’de yenilenebilir enerji yatırımlarında büyük artış yaşanıyor.',
    source: 'EnerjiGünlüğü',
    date: '2026-03-16',
    category: 'Ekonomi',
    popularity: 8,
  },
  {
    id: '8',
    title: 'Basketbol Milli Takımı Avrupa’da',
    summary: 'Basketbol milli takımı Avrupa Şampiyonası’nda yarı finale yükseldi.',
    source: 'BasketDünya',
    date: '2026-03-15',
    category: 'Spor',
    popularity: 7,
  },
  {
    id: '9',
    title: 'Yerli Akıllı Telefon Tanıtıldı',
    summary: 'Türkiye’nin ilk yerli akıllı telefonu tanıtıldı.',
    source: 'TeknoHaber',
    date: '2026-03-14',
    category: 'Teknoloji',
    popularity: 6,
  },
  {
    id: '10',
    title: 'Kripto Para Piyasasında Dalgalanma',
    summary: 'Kripto para piyasasında sert dalgalanmalar yaşanıyor.',
    source: 'KriptoFinans',
    date: '2026-03-13',
    category: 'Ekonomi',
    popularity: 5,
  },
];


export default function PersonalizedNewsScreen() {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<string | null>(null);
  const [sortType, setSortType] = useState<'date' | 'popularity'>('date');
  const [selectedNews, setSelectedNews] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Filtrelenmiş haberler
  let filteredNews = filter
    ? newsData.filter((item) => item.category === filter)
    : newsData;

  // Sıralama
  filteredNews = [...filteredNews].sort((a, b) => {
    if (sortType === 'date') {
      return b.date.localeCompare(a.date); // yeni → eski
    } else {
      return b.popularity - a.popularity; // popüler → az popüler
    }
  });

  // PDF butonu (şimdilik bilgi mesajı)
  const handleDownloadPDF = () => {
    if (Platform.OS === 'web') {
      alert('PDF olarak indirme özelliği yakında eklenecek!');
    } else {
      Alert.alert('PDF olarak indirme özelliği yakında eklenecek!');
    }
  };

  return (
    <View style={styles(colors).container}>
      <Text style={styles(colors).title}>Kişisel Gazete</Text>
      <View style={styles(colors).sortRow}>
        <TouchableOpacity
          style={[styles(colors).sortButton, sortType === 'date' && styles(colors).sortButtonActive]}
          onPress={() => setSortType('date')}
        >
          <Text style={[styles(colors).sortButtonText, sortType === 'date' && styles(colors).sortButtonTextActive]}>En Yeni</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles(colors).sortButton, sortType === 'popularity' && styles(colors).sortButtonActive]}
          onPress={() => setSortType('popularity')}
        >
          <Text style={[styles(colors).sortButtonText, sortType === 'popularity' && styles(colors).sortButtonTextActive]}>En Popüler</Text>
        </TouchableOpacity>
      </View>
      <View style={styles(colors).filterRow}>
        {[
          { label: 'Tümü', value: null },
          { label: 'Teknoloji', value: 'Teknoloji' },
          { label: 'Spor', value: 'Spor' },
          { label: 'Ekonomi', value: 'Ekonomi' },
        ].map((btn) => (
          <TouchableOpacity
            key={btn.label}
            onPress={() => setFilter(btn.value)}
            style={[styles(colors).filterButton, filter === btn.value && styles(colors).filterButtonActive]}
          >
            <Text style={[styles(colors).filterButtonText, filter === btn.value && styles(colors).filterButtonTextActive]}>
              {btn.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filteredNews}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => { setSelectedNews(item); setModalVisible(true); }}>
            <View style={styles(colors).newsCard}>
              <Text style={styles(colors).newsTitle}>{item.title}</Text>
              <Text style={styles(colors).newsSummary}>{item.summary}</Text>
              <Text style={styles(colors).meta}>{item.source} | {item.date}</Text>
            </View>
          </TouchableOpacity>
        )}
        style={{ width: '100%' }}
      />

      {/* Açılır Pencere */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles(colors).modalOverlay}>
          <View style={styles(colors).modalContent}>
            <Text style={styles(colors).modalTitle}>{selectedNews?.title}</Text>
            <Text style={styles(colors).modalSummary}>{selectedNews?.summary}</Text>
            <Text style={styles(colors).meta}>{selectedNews?.source} | {selectedNews?.date}</Text>
            <Pressable style={styles(colors).pdfButton} onPress={handleDownloadPDF}>
              <Text style={styles(colors).pdfButtonText}>PDF olarak indir</Text>
            </Pressable>
            <Pressable style={styles(colors).closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles(colors).closeButtonText}>Kapat</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}


