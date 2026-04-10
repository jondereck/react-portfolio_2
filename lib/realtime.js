import { mutate } from 'swr';

export const PUBLIC_DATA_KEYS = ['/api/portfolio', '/api/certificates', '/api/experience', '/api/skills', '/api/site-content', '/api/site-config'];

export const REALTIME_SIGNAL_KEY = '__portfolio_revalidate__';
export const REALTIME_EVENT = 'portfolio-data-updated';

export const revalidatePublicData = async () => Promise.all(PUBLIC_DATA_KEYS.map((key) => mutate(key)));

export const notifyRealtimeUpdate = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(REALTIME_EVENT));
  window.localStorage.setItem(REALTIME_SIGNAL_KEY, String(Date.now()));
};
