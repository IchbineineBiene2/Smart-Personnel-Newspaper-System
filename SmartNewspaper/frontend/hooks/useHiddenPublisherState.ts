import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type ReactionKind = 'like' | 'insightful' | 'important';

type ReactionMap = Record<string, ReactionKind | undefined>;

const FOLLOW_KEY = 'hidden-followed-publishers';
const REACTION_KEY = 'hidden-article-reactions';

export function useHiddenPublisherState() {
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [reactions, setReactions] = useState<ReactionMap>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [storedFollow, storedReactions] = await Promise.all([
        AsyncStorage.getItem(FOLLOW_KEY),
        AsyncStorage.getItem(REACTION_KEY),
      ]);

      setFollowedIds(storedFollow ? (JSON.parse(storedFollow) as string[]) : []);
      setReactions(storedReactions ? (JSON.parse(storedReactions) as ReactionMap) : {});
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

      setFollowedIds(next);
      await AsyncStorage.setItem(FOLLOW_KEY, JSON.stringify(next));
    },
    [followedIds]
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
    reactions,
    toggleFollow,
    setReaction,
  };
}
