import { AxiosError } from 'axios';

/** Best-effort message from Spring / axios error bodies */
export function getApiErrorMessage(error: unknown, fallback = 'Request failed'): string {
  if (error instanceof AxiosError) {
    const d = error.response?.data;
    if (typeof d === 'string' && d.trim()) return d;
    if (d && typeof d === 'object') {
      const o = d as Record<string, unknown>;
      if (typeof o.message === 'string' && o.message.trim()) return o.message;
      if (typeof o.detail === 'string' && o.detail.trim()) return o.detail;
      if (typeof o.title === 'string' && o.title.trim()) return o.title;
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
