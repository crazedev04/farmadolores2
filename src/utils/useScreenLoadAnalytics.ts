import { useEffect, useRef } from 'react';
import { logEvent } from '../services/analytics';

export const useScreenLoadAnalytics = (
  screenName: string,
  loading: boolean
) => {
  const startRef = useRef<number | null>(null);
  const sentRef = useRef(false);

  useEffect(() => {
    if (startRef.current == null) {
      startRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    if (sentRef.current) return;
    if (loading) return;
    const start = startRef.current ?? Date.now();
    const durationMs = Math.max(0, Date.now() - start);
    sentRef.current = true;
    logEvent('screen_load', { screen: screenName, ms: durationMs });
  }, [loading, screenName]);
};
