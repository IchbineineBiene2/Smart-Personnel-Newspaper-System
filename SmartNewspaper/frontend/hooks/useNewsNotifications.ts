import { useEffect, useRef } from 'react';
import { useNotification } from '@/contexts/NotificationContext';
import { useNews } from './useNews';
import { useRouter } from 'expo-router';

export function useNewsNotifications() {
  const { showNotification } = useNotification();
  const { news } = useNews();
  const router = useRouter();
  const previousIdsRef = useRef<Set<string>>(new Set());
  const isInitialRef = useRef(true);

  useEffect(() => {
    if (!news || news.length === 0) return;

    const currentIds = new Set(news.map(n => n.id));

    // İlk yükleme - haberler cache'e alınsın, notification gösterme
    if (isInitialRef.current) {
      previousIdsRef.current = currentIds;
      isInitialRef.current = false;
      return;
    }

    // Yeni haberler var mı kontrol et (mevcut ID'ler içinde öncekiler yok mu?)
    for (const article of news) {
      if (!previousIdsRef.current.has(article.id)) {
        // Bu yeni bir haber!
        showNotification({
          title: '📰 Yeni Haber',
          description: article.title,
          duration: 10000, // 10 saniye
          onPress: () => {
            // Haber detayına yönlendir
            router.push(`/news/${article.id}`);
          },
        });
        // Sadece ilkini göster, loop'u kır
        break;
      }
    }

    // Önceki ID'leri güncelle
    previousIdsRef.current = currentIds;
  }, [news, showNotification, router]);
}
