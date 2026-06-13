import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

export interface LocationData {
  name: string;
  lat: number;
  lon: number;
  timezone: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (loc: LocationData) => void;
}

export function LocationPickerModal({ visible, onClose, onSelect }: Props) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
    }
  }, [visible]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        searchCity(query.trim());
      } else {
        setResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const searchCity = async (text: string) => {
    setLoading(true);
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(text)}&count=5&language=tr&format=json`);
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
      } else {
        setResults([]);
      }
    } catch (e) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCurrentLocation = () => {
    setLocLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          onSelect({
            name: 'Mevcut Konum',
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            timezone: 'auto'
          });
          setLocLoading(false);
        },
        () => {
          alert('Konum izni reddedildi veya alınamadı.');
          setLocLoading(false);
        }
      );
    } else {
      alert('Tarayıcınız konum özelliğini desteklemiyor.');
      setLocLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable 
          style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]} 
          onPress={e => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Konum Seç</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          <Pressable 
            style={[styles.myLocationBtn, { backgroundColor: colors.accent + '14', borderColor: colors.accent + '30' }]} 
            onPress={handleCurrentLocation}
          >
            <Ionicons name="navigate" size={18} color={colors.accent} />
            <Text style={[styles.myLocationText, { color: colors.accent }]}>
              {locLoading ? 'Konum Bulunuyor...' : 'Mevcut Konumumu Kullan'}
            </Text>
          </Pressable>

          <View style={[styles.searchBox, { backgroundColor: colors.surfaceInput, borderColor: colors.borderSubtle }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Şehir veya ülke ara..."
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            {loading && <ActivityIndicator size="small" color={colors.accent} />}
          </View>

          <FlatList
            data={results}
            keyExtractor={item => item.id.toString()}
            style={styles.list}
            renderItem={({ item }) => (
              <Pressable 
                style={({ pressed }) => [
                  styles.resultItem, 
                  { borderBottomColor: colors.borderSubtle, backgroundColor: pressed ? colors.surfaceHigh : 'transparent' }
                ]}
                onPress={() => onSelect({
                  name: item.name,
                  lat: item.latitude,
                  lon: item.longitude,
                  timezone: item.timezone || 'auto'
                })}
              >
                <Text style={[styles.resultName, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.resultSub, { color: colors.textMuted }]}>
                  {item.admin1 ? `${item.admin1}, ` : ''}{item.country}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              query.length >= 2 && !loading ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Sonuç bulunamadı.</Text>
              ) : null
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    maxHeight: '80%',
    ...Platform.select({
      web: { boxShadow: '0 10px 30px rgba(0,0,0,0.5)' } as any
    })
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 18,
    fontWeight: '800'
  },
  closeBtn: {
    padding: 4
  },
  myLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16
  },
  myLocationText: {
    fontSize: 14,
    fontWeight: '700'
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    outlineStyle: 'none' as any
  },
  list: {
    maxHeight: 300
  },
  resultItem: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: 1
  },
  resultName: {
    fontSize: 15,
    fontWeight: '700'
  },
  resultSub: {
    fontSize: 12,
    marginTop: 2
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14
  }
});
