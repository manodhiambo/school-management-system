// Browser storage utilities
const isBrowser = typeof window !== 'undefined';

export const storage = {
  get: <T>(key: string): T | null => {
    if (!isBrowser) return null;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },

  set: <T>(key: string, value: T): void => {
    if (!isBrowser) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage set error:', error);
    }
  },

  remove: (key: string): void => {
    if (!isBrowser) return;
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  },

  clear: (): void => {
    if (!isBrowser) return;
    try {
      window.localStorage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  }
};
