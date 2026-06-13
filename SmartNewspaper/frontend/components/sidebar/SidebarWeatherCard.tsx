import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/useTheme';
import { LocationPickerModal, LocationData } from './LocationPickerModal';

const WMO_CODES: Record<number, { desc: string; icon: any }> = {
  0: { desc: 'Açık', icon: 'sunny' },
  1: { desc: 'Çoğunlukla Açık', icon: 'partly-sunny' },
  2: { desc: 'Kısmen Bulutlu', icon: 'partly-sunny' },
  3: { desc: 'Kapalı', icon: 'cloudy' },
  45: { desc: 'Sisli', icon: 'cloud' },
  48: { desc: 'Sisli', icon: 'cloud' },
  51: { desc: 'Hafif Çiseleme', icon: 'rainy' },
  53: { desc: 'Çiseleme', icon: 'rainy' },
  55: { desc: 'Yoğun Çiseleme', icon: 'rainy' },
  61: { desc: 'Hafif Yağmur', icon: 'rainy' },
  63: { desc: 'Yağmurlu', icon: 'rainy' },
  65: { desc: 'Şiddetli Yağmur', icon: 'rainy' },
  71: { desc: 'Hafif Kar', icon: 'snow' },
  73: { desc: 'Kar Yağışlı', icon: 'snow' },
  75: { desc: 'Yoğun Kar', icon: 'snow' },
  95: { desc: 'Fırtına', icon: 'thunderstorm' },
};

const DEFAULT_LOCATION: LocationData = {
  name: 'İstanbul',
  lat: 41.0082,
  lon: 28.9784,
  timezone: 'Europe/Istanbul'
};

const STORAGE_KEY = 'sidebar_weather_location';

export function SidebarWeatherCard() {
  const { colors } = useTheme();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [weather, setWeather] = useState<{ temp: number; desc: string; icon: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    loadSavedLocation();
  }, []);

  useEffect(() => {
    if (location) {
      fetchWeather(location);
      updateDate(location);
      const timer = setInterval(() => updateDate(location), 60000);
      return () => clearInterval(timer);
    }
  }, [location]);

  const loadSavedLocation = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setLocation(JSON.parse(saved));
      } else {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const loc = {
                name: 'Mevcut Konum',
                lat: pos.coords.latitude,
                lon: pos.coords.longitude,
                timezone: 'auto'
              };
              setLocation(loc);
              AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
            },
            () => {
              setLocation(DEFAULT_LOCATION);
            }
          );
        } else {
          setLocation(DEFAULT_LOCATION);
        }
      }
    } catch {
      setLocation(DEFAULT_LOCATION);
    }
  };

  const fetchWeather = async (loc: LocationData) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,weather_code,is_day&timezone=${loc.timezone === 'auto' ? 'auto' : encodeURIComponent(loc.timezone)}`);
      const data = await res.json();
      
      const current = data.current;
      const code = current.weather_code;
      const isDay = current.is_day === 1;
      
      let wmo = WMO_CODES[code] || { desc: 'Bilinmiyor', icon: 'partly-sunny' };
      let icon = wmo.icon;
      if (!isDay) {
        if (icon === 'sunny') icon = 'moon';
        else if (icon === 'partly-sunny') icon = 'cloudy-night';
      }

      setWeather({
        temp: Math.round(current.temperature_2m),
        desc: wmo.desc,
        icon
      });
      
      if (loc.timezone === 'auto' && data.timezone) {
        loc.timezone = data.timezone;
        updateDate(loc);
      }
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const updateDate = (loc: LocationData) => {
    try {
      const tz = loc.timezone === 'auto' ? undefined : loc.timezone;
      const formatter = new Intl.DateTimeFormat('tr-TR', {
        dateStyle: 'full',
        timeZone: tz
      });
      setDateStr(formatter.format(new Date()));
    } catch {
      const formatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'full' });
      setDateStr(formatter.format(new Date()));
    }
  };

  const handleSelectLocation = (loc: LocationData) => {
    setLocation(loc);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    setModalVisible(false);
  };

  return (
    <>
      <Pressable 
        style={({ pressed }) => [
          styles.card, 
          { backgroundColor: colors.accent + '0A', borderColor: colors.accent + '30' },
          pressed && { opacity: 0.8 }
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.dateText, { color: colors.accent }]}>{dateStr || 'Tarih hesaplanıyor...'}</Text>
        
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.accent} style={styles.loader} />
          ) : error || !weather ? (
            <Text style={[styles.errorText, { color: colors.textMuted }]}>Hava durumu alınamadı</Text>
          ) : (
            <>
              <View style={styles.weatherInfo}>
                <Ionicons name={weather.icon} size={28} color={colors.textPrimary} style={styles.icon} />
                <View>
                  <Text style={[styles.temp, { color: colors.textPrimary }]}>{weather.temp}°C</Text>
                  <Text style={[styles.desc, { color: colors.textMuted }]}>{weather.desc}</Text>
                </View>
              </View>
              <View style={[styles.locationTag, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons name="location" size={10} color={colors.accent} />
                <Text style={[styles.locationName, { color: colors.accent }]} numberOfLines={1}>
                  {location?.name}
                </Text>
              </View>
            </>
          )}
        </View>
      </Pressable>

      <LocationPickerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={handleSelectLocation}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  dateText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 38,
  },
  loader: {
    paddingVertical: 10,
    flex: 1,
    alignItems: 'flex-start',
  },
  weatherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  icon: {
    marginTop: -2,
  },
  temp: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -1,
  },
  desc: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: -2,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 90,
    flexShrink: 0,
  },
  locationName: {
    fontSize: 10,
    fontWeight: '800',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
    paddingVertical: 10,
  }
});
