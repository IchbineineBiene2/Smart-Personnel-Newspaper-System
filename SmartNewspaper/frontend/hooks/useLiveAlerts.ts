import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useNotification } from '@/contexts/NotificationContext';
import { useApiNews } from './useNews';
import { Platform } from 'react-native';

const API_BASE =
  Platform.OS === 'web'
    ? 'http://localhost:3000'
    : Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';

export function useLiveAlerts() {
  const { showNotification } = useNotification();
  const { articles } = useApiNews();
  const router = useRouter();
  
  const previousRatesRef = useRef<Record<string, { value: string; change: string }>>({});
  const previousNewsIdsRef = useRef<Set<string>>(new Set());
  const isInitialRatesRef = useRef(true);
  const isInitialNewsRef = useRef(true);

  // Monitor live breaking news
  useEffect(() => {
    if (!articles || articles.length === 0) return;

    const currentIds = new Set(articles.map((a) => a.id));

    if (isInitialNewsRef.current) {
      previousNewsIdsRef.current = currentIds;
      isInitialNewsRef.current = false;
      return;
    }

    for (const article of articles) {
      if (!previousNewsIdsRef.current.has(article.id)) {
        // Trigger a Flaş Haber notification!
        showNotification({
          title: `SON DAKİKA: ${article.source.name}`,
          description: article.title,
          imageUrl: article.imageUrl,
          duration: 12000,
          type: 'breaking',
          onPress: () => router.push(`/news/${article.id}` as any),
        });
        break; // Show one alert at a time to prevent spam
      }
    }

    previousNewsIdsRef.current = currentIds;
  }, [articles, router, showNotification]);

  // Monitor live currency swing changes
  useEffect(() => {
    const checkRates = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/news/market-rates`);
        if (!response.ok) return;

        const data = await response.json();
        if (!data || !Array.isArray(data.rates)) return;

        const nextRates: Record<string, { value: string; change: string }> = {};
        for (const r of data.rates) {
          nextRates[r.name] = { value: r.value, change: r.change };
        }

        if (isInitialRatesRef.current) {
          previousRatesRef.current = nextRates;
          isInitialRatesRef.current = false;
          return;
        }

        // Compare and detect changes
        for (const name of Object.keys(nextRates)) {
          const prev = previousRatesRef.current[name];
          const curr = nextRates[name];

          if (prev && (prev.value !== curr.value || prev.change !== curr.change)) {
            const isUp = curr.change.startsWith('+');
            const directionText = isUp ? 'yükselişte 📈' : 'düşüşte 📉';
            
            // Trigger a beautiful glowing Piyasa Alarmı!
            showNotification({
              title: `PİYASA HAREKETLİLİĞİ: ${name}`,
              description: `${name} şu anda ${curr.value} seviyesinde ${directionText} (${curr.change})`,
              duration: 10000,
              type: 'market',
              onPress: () => router.push('/' as any), // Navigate to homepage to view dashboard
            });
            break; // Show one swing notification at a time
          }
        }

        previousRatesRef.current = nextRates;
      } catch (err) {
        console.warn('[useLiveAlerts] failed to fetch rates for alert checking:', err);
      }
    };

    // Check immediately and poll every 15 seconds
    checkRates();
    const interval = setInterval(checkRates, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [router, showNotification]);
}
