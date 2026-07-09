import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateStorage } from 'zustand/middleware';

let storage: any = null;
let useAsyncStorageFallback = false;

try {
  const { MMKV } = require('react-native-mmkv');
  storage = new MMKV({
    id: 'womens-health-storage',
  });
  
  // Try a dry run to detect if the native module is actually loaded.
  // Sometimes instantiating doesn't throw, but accessing property does.
  storage.set('__test_key__', '1');
  storage.delete('__test_key__');
} catch (e) {
  console.warn(
    'MMKV failed to initialize (TurboModules not enabled or module missing). Falling back to AsyncStorage.',
    e
  );
  useAsyncStorageFallback = true;
}

/**
 * Adapter for Zustand's persist middleware with safe fallback storage support.
 * Directs read/writes to AsyncStorage if MMKV fails to load.
 */
export const zustandStorage: StateStorage = {
  setItem: async (name, value) => {
    if (useAsyncStorageFallback) {
      await AsyncStorage.setItem(name, value);
    } else {
      storage.set(name, value);
    }
  },
  getItem: async (name) => {
    if (useAsyncStorageFallback) {
      return await AsyncStorage.getItem(name);
    } else {
      try {
        const value = storage.getString(name);
        return value ?? null;
      } catch (err) {
        // Safe check in case runtime issues happen on property access
        return await AsyncStorage.getItem(name);
      }
    }
  },
  removeItem: async (name) => {
    if (useAsyncStorageFallback) {
      await AsyncStorage.removeItem(name);
    } else {
      storage.delete(name);
    }
  },
};
