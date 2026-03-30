import { useEffect, useRef } from 'react';
import { useNotification } from '@/contexts/NotificationContext';
import { useEvents } from './useEvents';
import { useRouter } from 'expo-router';

// Son bildirilen etkinlik ID'sini sakla
let lastNotifiedEventId: string | null = null;

export function useEventNotifications() {
  const { showNotification } = useNotification();
  const { events } = useEvents();
  const router = useRouter();
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const showNearestEvent = () => {
      if (!events || events.length === 0) return;

      const now = new Date();
      let nearestEvent = events[0];
      let minDiff = Math.abs(new Date(nearestEvent.date).getTime() - now.getTime());

      // En yakın etkinliği bul
      for (const event of events) {
        const eventDate = new Date(event.date);
        const diff = Math.abs(eventDate.getTime() - now.getTime());
        if (diff < minDiff) {
          minDiff = diff;
          nearestEvent = event;
        }
      }

      // Hiç bildirimi göstermemişsek veya farklı bir etkinlikse göster
      if (nearestEvent.id !== lastNotifiedEventId) {
        lastNotifiedEventId = nearestEvent.id;

        const eventDate = new Date(nearestEvent.date);
        const diffMs = eventDate.getTime() - now.getTime();
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        
        let timeText = '';
        if (daysLeft > 0) {
          timeText = `${daysLeft} gün sonra`;
        } else if (daysLeft === 0) {
          timeText = 'Bugün';
        } else {
          timeText = `${Math.abs(daysLeft)} gün önce`;
        }

        showNotification({
          title: '📅 Yaklaşan Etkinlik',
          description: `${nearestEvent.title} - ${timeText}`,
          duration: 10000, // 10 saniye
          onPress: () => {
            // Etkinlik detayına yönlendir
            router.push(`/events/${nearestEvent.id}`);
          },
        });
      }
    };

    // İlk olarak hemen göster
    showNearestEvent();

    // Her saat güncellensin (3600000 ms)
    refreshIntervalRef.current = setInterval(showNearestEvent, 60 * 60 * 1000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [events, showNotification, router]);
}
