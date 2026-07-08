import { MMKV } from 'react-native-mmkv';
import { StateStorage } from 'zustand/middleware';

/**
 * Global MMKV storage instance.
 * MMKV is a high-performance key-value storage framework designed for mobile.
 */
export const storage = new MMKV({
  id: 'womens-health-storage',
});

/**
 * Adapter for Zustand's persist middleware to use MMKV storage.
 * Ensures synchronous read/writes and ultra-fast performance.
 */
export const zustandStorage: StateStorage = {
  setItem: (name, value) => {
    storage.set(name, value);
  },
  getItem: (name) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name) => {
    storage.delete(name);
  },
};
