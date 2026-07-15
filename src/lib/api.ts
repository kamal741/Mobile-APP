import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { notifySessionExpired } from './authSession';
import { secureStorage } from './secureStore';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * When EXPO_PUBLIC_API_URL is unset in __DEV__, pick a host that can reach Docker/nginx on your machine:
 * - iOS Simulator / Expo Web: localhost
 * - Android Emulator: 10.0.2.2 (emulator alias for host loopback — localhost would hit the emulator itself → ERR_CONNECTION_REFUSED)
 * Physical devices: always set EXPO_PUBLIC_API_URL (e.g. http://192.168.1.5) in .env
 */
function devDefaultApiOrigin(): string {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2';
  }
  return 'http://localhost';
}

/**
 * API origin only (scheme + host [+ port]). Paths include /api/client/v1/... etc.
 * @see EstateFlow-Service nginx routing and README.
 */
const API_BASE_URL = stripTrailingSlash(
  (process.env.EXPO_PUBLIC_API_URL || '').trim() ||
    (__DEV__ ? devDefaultApiOrigin() : '')
);

const PORTAL_REFRESH_PATH = '/api/portal/v1/public/session/auth/refresh';

if (!API_BASE_URL && !__DEV__) {
  console.warn(
    '[estateflow] Set EXPO_PUBLIC_API_URL to your API origin (e.g. https://api.example.com)'
  );
}

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  refreshExpiresInSeconds: number;
}

// Flag to prevent refresh loops — only one refresh in progress at a time
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token?: string) {
  failedQueue.forEach((pendingRequest) => {
    if (error || !token) {
      pendingRequest.reject(error);
    } else {
      pendingRequest.resolve(token);
    }
  });
  failedQueue = [];
}

export const api = axios.create({
  baseURL: API_BASE_URL || undefined,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await secureStorage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request to retry after refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              void api(originalRequest).then(resolve).catch(reject);
            },
            reject,
          });
        });
      }

      isRefreshing = true;
      originalRequest._retry = true;

      try {
        const refreshToken = await secureStorage.getRefreshToken();
        if (!refreshToken) {
          processQueue(error);
          console.warn('No refresh token available — notifying session expired');
          notifySessionExpired();
          return Promise.reject(error);
        }

        // Call portal refresh endpoint
        const refreshResponse = await axios.post<RefreshTokenResponse>(
          `${API_BASE_URL}${PORTAL_REFRESH_PATH}`,
          { refreshToken },
          { timeout: 10000 }
        );

        const { accessToken, refreshToken: newRefreshToken, expiresInSeconds, refreshExpiresInSeconds } = refreshResponse.data;

        // Update stored tokens
        await secureStorage.setToken(accessToken);
        await secureStorage.setRefreshToken(newRefreshToken);

        // Update expiry times
        if (expiresInSeconds) {
          const expiresAtMs = Date.now() + expiresInSeconds * 1000;
          await secureStorage.setTokenExpiresAt(expiresAtMs);
        }
        if (refreshExpiresInSeconds) {
          const expiresAtMs = Date.now() + refreshExpiresInSeconds * 1000;
          await secureStorage.setRefreshTokenExpiresAt(expiresAtMs);
        }

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);

        return api(originalRequest);
      } catch (refreshError) {
        const refreshAxiosError = refreshError as AxiosError;
        const refreshStatus = refreshAxiosError.response?.status;
        const refreshBody = refreshAxiosError.response?.data;
        console.error('Token refresh failed', {
          status: refreshStatus,
          code: refreshAxiosError.code,
          message: refreshAxiosError.message,
          body: refreshBody,
        });
        processQueue(refreshError);
        // Only force logout on authentication failures; transient network/server failures
        // should not clear session state immediately.
        if (refreshStatus === 400 || refreshStatus === 401 || refreshStatus === 403) {
          notifySessionExpired();
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
    } else if (!error.response) {
      console.error(
        'Network error — check EXPO_PUBLIC_API_URL (e.g. http://localhost for simulator, http://10.0.2.2 for Android emulator)'
      );
    }

    return Promise.reject(error);
  }
);

export const apiRequest = async <T = unknown>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  data?: unknown
): Promise<T> => {
  const response = await api({
    method,
    url,
    data,
  });
  return response.data;
};

export const getApiBaseUrl = () => API_BASE_URL;
