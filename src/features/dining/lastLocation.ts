import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'dining:lastLocationId';

/** The dining location picked last on this device (a convenience, not synced). */
export async function readLastLocation(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function saveLastLocation(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, id);
  } catch {
    // Not important enough to surface.
  }
}
