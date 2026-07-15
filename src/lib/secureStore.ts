import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOUR_CART_STORAGE_KEY } from './persistedStorageKeys';

// Use AsyncStorage for token storage - more reliable across all platforms
// In production, you can replace this with expo-secure-store for hardware-backed storage
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const TOKEN_EXPIRES_AT_KEY = 'auth_token_expires_at';
const REFRESH_TOKEN_EXPIRES_AT_KEY = 'auth_refresh_token_expires_at';
const SESSION_EMAIL_KEY = 'estateflow_session_email';
const SESSION_KIND_KEY = 'estateflow_session_kind';

const SESSION_STORAGE_KEYS = [
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  TOKEN_EXPIRES_AT_KEY,
  REFRESH_TOKEN_EXPIRES_AT_KEY,
  SESSION_EMAIL_KEY,
  SESSION_KIND_KEY,
  TOUR_CART_STORAGE_KEY,
] as const;

export type SessionKind = 'client' | 'agent' | 'broker_owner';

export const secureStorage = {
  async getToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      return token || null;
    } catch (error) {
      console.error('Failed to retrieve token:', error);
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      if (!token || typeof token !== 'string') {
        throw new Error('Token must be a non-empty string');
      }
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store token:', error);
      throw error;
    }
  },

  /** Clears JWT, session metadata, and other user-scoped persisted app data. */
  async clearSession(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([...SESSION_STORAGE_KEYS]);
    } catch (error) {
      console.error('Failed to clear session storage:', error);
    }
  },

  /** @deprecated Prefer {@link clearSession} */
  async clearToken(): Promise<void> {
    await this.clearSession();
  },

  async getSessionEmail(): Promise<string | null> {
    try {
      return (await AsyncStorage.getItem(SESSION_EMAIL_KEY)) || null;
    } catch {
      return null;
    }
  },

  async setSessionEmail(email: string): Promise<void> {
    try {
      await AsyncStorage.setItem(SESSION_EMAIL_KEY, email.trim());
    } catch (error) {
      console.error('Failed to store session email:', error);
    }
  },

  async getSessionKind(): Promise<SessionKind | null> {
    try {
      const v = await AsyncStorage.getItem(SESSION_KIND_KEY);
      if (v === 'client' || v === 'agent' || v === 'broker_owner') return v;
      return null;
    } catch {
      return null;
    }
  },

  async setSessionKind(kind: SessionKind): Promise<void> {
    try {
      await AsyncStorage.setItem(SESSION_KIND_KEY, kind);
    } catch (error) {
      console.error('Failed to store session kind:', error);
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return (await AsyncStorage.getItem(REFRESH_TOKEN_KEY)) || null;
    } catch (error) {
      console.error('Failed to retrieve refresh token:', error);
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    try {
      if (!token || typeof token !== 'string') {
        throw new Error('Refresh token must be a non-empty string');
      }
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store refresh token:', error);
      throw error;
    }
  },

  async getTokenExpiresAt(): Promise<number | null> {
    try {
      const value = await AsyncStorage.getItem(TOKEN_EXPIRES_AT_KEY);
      return value ? parseInt(value, 10) : null;
    } catch (error) {
      console.error('Failed to retrieve token expiry:', error);
      return null;
    }
  },

  async setTokenExpiresAt(expiresAtMs: number): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(expiresAtMs));
    } catch (error) {
      console.error('Failed to store token expiry:', error);
    }
  },

  async getRefreshTokenExpiresAt(): Promise<number | null> {
    try {
      const value = await AsyncStorage.getItem(REFRESH_TOKEN_EXPIRES_AT_KEY);
      return value ? parseInt(value, 10) : null;
    } catch (error) {
      console.error('Failed to retrieve refresh token expiry:', error);
      return null;
    }
  },

  async setRefreshTokenExpiresAt(expiresAtMs: number): Promise<void> {
    try {
      await AsyncStorage.setItem(REFRESH_TOKEN_EXPIRES_AT_KEY, String(expiresAtMs));
    } catch (error) {
      console.error('Failed to store refresh token expiry:', error);
    }
  },
};
