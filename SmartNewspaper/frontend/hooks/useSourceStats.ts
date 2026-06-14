import { Platform } from 'react-native';
import { useEffect, useState } from 'react';

const API_BASE =
  Platform.OS === 'web'
    ? 'http://localhost:3000'
    : Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';

export interface SourceStats {
  article_count: number;
  reader_count: number;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export function useSourceStats(sourceName: string | undefined) {
  const [stats, setStats] = useState<{ articleCount: string; readerCount: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sourceName) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setStats(null);

    fetch(`${API_BASE}/api/news/source-stats?source=${encodeURIComponent(sourceName)}`)
      .then((res) => res.json())
      .then((data: SourceStats) => {
        setStats({
          articleCount: formatCompact(data.article_count),
          readerCount: formatCompact(data.reader_count),
        });
      })
      .catch(() => {
        setStats(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [sourceName]);

  return { stats, loading };
}
