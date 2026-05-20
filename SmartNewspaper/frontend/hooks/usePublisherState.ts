import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type ReactionKind = 'like' | 'insightful' | 'important';

type ReactionMap = Record<string, ReactionKind | undefined>;

const FOLLOW_KEY = 'followed-publishers';
const REACTION_KEY = 'article-reactions';
const NOTIFICATION_KEY = 'publisher-notifications';
const LEGACY_FOLLOW_KEY = 'hidden-followed-publishers';
const LEGACY_REACTION_KEY = 'hidden-article-reactions';
const LEGACY_NOTIFICATION_KEY = 'hidden-publisher-notifications';

async function readMigratedArray(key: string, legacyKey: string): Promise<string[]> {
  const stored = await AsyncStorage.getItem(key);
  if (stored) return JSON.parse(stored) as string[];

  const legacy = await AsyncStorage.getItem(legacyKey);
  if (!legacy) return [];

  await AsyncStorage.setItem(key, legacy);
  return JSON.parse(legacy) as string[];
}

export function usePublisherState() {
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [notificationEnabledIds, setNotificationEnabledIds] = useState<string[]>([]);
  const [reactions, setReactions] = useState<ReactionMap>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [storedFollow, storedNotifications, storedReactions, legacyReactions] = await Promise.all([
        readMigratedArray(FOLLOW_KEY, LEGACY_FOLLOW_KEY),
        readMigratedArray(NOTIFICATION_KEY, LEGACY_NOTIFICATION_KEY),
        AsyncStorage.getItem(REACTION_KEY),
        AsyncStorage.getItem(LEGACY_REACTION_KEY),
      ]);

      setFollowedIds(storedFollow);
      setNotificationEnabledIds(storedNotifications);

      if (storedReactions) {
        setReactions(JSON.parse(storedReactions) as ReactionMap);
      } else if (legacyReactions) {
        await AsyncStorage.setItem(REACTION_KEY, legacyReactions);
        setReactions(JSON.parse(legacyReactions) as ReactionMap);
      } else {
        setReactions({});
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFollow = useCallback(
    async (publisherId: string) => {
      const next = followedIds.includes(publisherId)
        ? followedIds.filter((id) => id !== publisherId)
        : [...followedIds, publisherId];
      const nextNotifications = next.includes(publisherId)
        ? notificationEnabledIds
        : notificationEnabledIds.filter((id) => id !== publisherId);

      setFollowedIds(next);
      setNotificationEnabledIds(nextNotifications);
      await AsyncStorage.setItem(FOLLOW_KEY, JSON.stringify(next));
      await AsyncStorage.setItem(NOTIFICATION_KEY, JSON.stringify(nextNotifications));
    },
    [followedIds, notificationEnabledIds]
  );

  const togglePublisherNotifications = useCallback(
    async (publisherId: string) => {
      const next = notificationEnabledIds.includes(publisherId)
        ? notificationEnabledIds.filter((id) => id !== publisherId)
        : [...notificationEnabledIds, publisherId];

      setNotificationEnabledIds(next);
      await AsyncStorage.setItem(NOTIFICATION_KEY, JSON.stringify(next));
    },
    [notificationEnabledIds]
  );

  const setReaction = useCallback(
    async (articleId: string, kind: ReactionKind) => {
      const current = reactions[articleId];
      const next: ReactionMap = {
        ...reactions,
        [articleId]: current === kind ? undefined : kind,
      };

      setReactions(next);
      await AsyncStorage.setItem(REACTION_KEY, JSON.stringify(next));
    },
    [reactions]
  );

  return {
    loading,
    followedIds,
    notificationEnabledIds,
    reactions,
    toggleFollow,
    togglePublisherNotifications,
    setReaction,
    reload: load,
  };
}
