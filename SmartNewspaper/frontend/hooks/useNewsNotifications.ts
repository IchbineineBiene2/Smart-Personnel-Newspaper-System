import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';

import { useNotification } from '@/contexts/NotificationContext';
import { getPublisherIdFromSourceName } from '@/services/publisherProfiles';
import { usePublisherState } from './usePublisherState';
import { useApiNews } from './useNews';

export function useNewsNotifications() {
  const { showNotification } = useNotification();
  const { articles } = useApiNews();
  const { followedIds, notificationEnabledIds } = usePublisherState();
  const router = useRouter();
  const previousIdsRef = useRef<Set<string>>(new Set());
  const isInitialRef = useRef(true);

  useEffect(() => {
    if (!articles || articles.length === 0) return;

    const enabledPublisherIds = new Set(
      notificationEnabledIds.filter((id) => followedIds.includes(id))
    );

    const notificationArticles = articles.filter((article) =>
      enabledPublisherIds.has(getPublisherIdFromSourceName(article.source.name))
    );

    const currentIds = new Set(notificationArticles.map((article) => article.id));

    if (isInitialRef.current) {
      previousIdsRef.current = currentIds;
      isInitialRef.current = false;
      return;
    }

    for (const article of notificationArticles) {
      if (!previousIdsRef.current.has(article.id)) {
        const publisherId = getPublisherIdFromSourceName(article.source.name);
        showNotification({
          title: article.source.name,
          description: article.title,
          duration: 10000,
          onPress: () => router.push(`/publisherprofile?id=${publisherId}` as any),
        });
        break;
      }
    }

    previousIdsRef.current = currentIds;
  }, [articles, followedIds, notificationEnabledIds, router, showNotification]);
}
