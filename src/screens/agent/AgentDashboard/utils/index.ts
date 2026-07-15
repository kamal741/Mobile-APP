import type { RequestDetail, RequestDetailProperty, Tour } from '../types';

// ─── Request Detail Helpers ────────────────────────────────────────────────────

export function propertyRowsFromRequestDetail(
  d: RequestDetail,
): RequestDetailProperty[] {
  if (d.properties && d.properties.length > 0) return d.properties;
  const ids =
    d.propertyIds ??
    d.requestedProperties?.map((x) => x.masterPropertyId) ??
    [];
  return ids.map((id) => ({
    id: String(id),
    address: `Listing #${id}`,
  }));
}

// ─── Tour Helpers ──────────────────────────────────────────────────────────────

export function tourClientLabel(tour: Tour): string {
  return tour.clientDisplayName || tour.clientName || 'Client';
}

export function isToday(dateString: string): boolean {
  const today = new Date().toDateString();
  const tourDate = new Date(dateString).toDateString();
  return today === tourDate;
}

export function formatDistance(totalDistance?: number | string | null): string {
  if (totalDistance != null && Number(totalDistance) > 0) {
    return `${Number(totalDistance).toFixed(1)} km`;
  }
  return '—';
}

export function formatShortDate(dateString: string): string {
  return new Date(dateString).toISOString().slice(0, 10);
}

export function formatLongDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatShortMonthDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}


