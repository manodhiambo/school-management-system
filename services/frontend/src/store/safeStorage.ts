/**
 * Safe localStorage wrapper — falls back to in-memory storage when the browser's
 * tracking prevention (Edge, Firefox, Safari ITP) blocks storage access.
 */

const memoryFallback = new Map<string, string>();

function isStorageAvailable(): boolean {
  try {
    const test = '__skulmanager_test__';
    localStorage.setItem(test, '1');
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryFallback.get(key) ?? null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      memoryFallback.set(key, value);
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      memoryFallback.delete(key);
    }
  },
};

export const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return memoryFallback.get(`ss:${key}`) ?? null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      memoryFallback.set(`ss:${key}`, value);
    }
  },
  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch {
      memoryFallback.delete(`ss:${key}`);
    }
  },
};

/** Zustand-compatible storage engine that never throws. */
export const zustandSafeStorage = {
  getItem: (name: string): string | null => safeLocalStorage.getItem(name),
  setItem: (name: string, value: string): void => safeLocalStorage.setItem(name, value),
  removeItem: (name: string): void => safeLocalStorage.removeItem(name),
};
