import { Platform } from 'react-native';
import * as Location from 'expo-location';

/**
 * Browser geolocation can sit on the permission prompt for a long time; do not use a separate
 * Promise timeout that resolves null before the user clicks "Allow" (that caused null on web).
 */
const WEB_GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 60_000,
  timeout: 120_000,
};

/** `GeolocationPositionError` / DOM: user blocked or dismissed location for this origin. */
function isBrowserGeolocationDenied(err: unknown): boolean {
  if (err == null || typeof err !== 'object') {
    return false;
  }
  const e = err as { code?: number };
  return e.code === 1;
}

/**
 * Current device coordinates for tour flows (start → maps, end tour).
 *
 * **Web:** uses `navigator.geolocation` first. If the user **denies** location, we return `null`
 * and **do not** call Expo again (same browser API — a second call only repeats the denial / noise).
 *
 * **Native:** `expo-location` foreground permission + current position.
 *
 * Geolocation on web requires a **secure context** (HTTPS), except **localhost**.
 */
/**
 * Same as {@link getTourForegroundCoordinates} but returns `null` if nothing resolves within
 * `timeoutMs`. Prevents "End tour" (and similar) from appearing stuck when GPS or the browser
 * geolocation prompt stalls.
 */
export async function getTourForegroundCoordinatesWithTimeout(
  timeoutMs: number
): Promise<{ latitude: number; longitude: number } | null> {
  return Promise.race([
    getTourForegroundCoordinates(),
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    }),
  ]);
}

export async function getTourForegroundCoordinates(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  if (Platform.OS === 'web') {
    return getWebCoordinatesWithFallback();
  }
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };
  } catch (error) {
    if (isBrowserGeolocationDenied(error)) {
      return null;
    }
    // eslint-disable-next-line no-console
    console.warn('[tourGeolocation] Native location failed:', error);
    return null;
  }
}

async function getWebCoordinatesWithFallback(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  const { coords, denied } = await getWebGeolocationPosition();
  if (coords) {
    return coords;
  }
  if (denied) {
    return null;
  }
  try {
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch {
      // Safari: expo may throw if `navigator.permissions.query` is missing.
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };
  } catch (error) {
    if (isBrowserGeolocationDenied(error)) {
      return null;
    }
    // eslint-disable-next-line no-console
    console.warn('[tourGeolocation] Web fallback location failed:', error);
    return null;
  }
}

function getWebGeolocationPosition(): Promise<{
  coords: { latitude: number; longitude: number } | null;
  denied: boolean;
}> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve({ coords: null, denied: false });
  }
  const win = globalThis.window;
  if (win != null && !win.isSecureContext) {
    const host = win.location?.hostname ?? '';
    if (host !== 'localhost' && host !== '127.0.0.1') {
      // eslint-disable-next-line no-console
      console.warn(
        '[tourGeolocation] Geolocation needs HTTPS (or localhost). Current origin is not a secure context.'
      );
    }
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          coords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          },
          denied: false,
        });
      },
      (err) => {
        resolve({
          coords: null,
          denied: isBrowserGeolocationDenied(err),
        });
      },
      WEB_GEO_OPTIONS
    );
  });
}
