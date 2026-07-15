// ─── Time Utilities ────────────────────────────────────────────────────────────
// Used by RouteScreen to cascade start times across properties.

/**
 * Parse a startTime string like "10:00 A" or "10:00 AM" → total minutes from midnight.
 */
export function parseToMinutes(raw: string | undefined | null): number {
  if (!raw) return 10 * 60; // default 10:00 AM
  const match = raw.match(/(\d+):(\d+)\s*([AP])/i);
  if (!match) return 10 * 60;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'A' && h === 12) h = 0;
  if (ampm === 'P' && h !== 12) h += 12;
  return h * 60 + m;
}

/**
 * Format total minutes from midnight → "H:MM AM/PM" display string.
 * e.g. 630 → "10:30 AM"
 */
export function minutesToDisplay(totalMin: number): string {
  const safeMin = ((totalMin % 1440) + 1440) % 1440; // wrap 0–1439
  const h24 = Math.floor(safeMin / 60);
  const m = safeMin % 60;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * Format total minutes → the compact storage format used in Property.startTime.
 * e.g. 630 → "10:30 A"
 */
export function minutesToStorageFormat(totalMin: number): string {
  const safeMin = ((totalMin % 1440) + 1440) % 1440;
  const h24 = Math.floor(safeMin / 60);
  const m = safeMin % 60;
  const ampmChar = h24 < 12 ? 'A' : 'P';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampmChar}`;
}

/**
 * Given a list of properties, recalculate startTime for every property
 * at index >= fromIndex based on cascading (previousStartTime + previousViewingMin).
 * Property at index 0 keeps its own startTime as the anchor.
 */
import { Property } from '../types'; // adjust path as needed in your project

export function recascadeStartTimes(
  properties: Property[],
  fromIndex: number = 0,
  bufferMinutes: number = 0,
): Property[] {
  if (properties.length === 0) return properties;

  const updated = [...properties];

  const anchor = updated[fromIndex];
  updated[fromIndex] = {
    ...anchor,
    eta: minutesToDisplay(parseToMinutes(anchor.startTime)),
  };

  for (let i = fromIndex + 1; i < updated.length; i++) {
    const prev = updated[i - 1];
    const prevStartMin = parseToMinutes(prev.startTime);
    const newStartMin =
      prevStartMin +
      (prev.viewingMin ?? 30) +
      bufferMinutes +
      (updated[i].driveMinFromPrevious ?? 0);
    updated[i] = {
      ...updated[i],
      startTime: minutesToStorageFormat(newStartMin),
      eta: minutesToDisplay(newStartMin),
    };
  }

  return updated;
}



// export function recascadeStartTimes(
//   properties: Property[],
//   fromIndex: number = 0,
// ): Property[] {
//   if (properties.length === 0) return properties;

//   const updated = [...properties];

//   // The anchor: property at fromIndex keeps its startTime unchanged.
//   // Everything after it gets recalculated.
//   for (let i = fromIndex + 1; i < updated.length; i++) {
//     const prev = updated[i - 1];
//     const prevStartMin = parseToMinutes(prev.startTime);
//     const newStartMin = prevStartMin + (prev.viewingMin ?? 30);
//     updated[i] = {
//       ...updated[i],
//       startTime: minutesToStorageFormat(newStartMin),
//       eta: minutesToDisplay(newStartMin),
//     };
//   }

//   // Also ensure the anchor's eta matches its own startTime
//   const anchor = updated[fromIndex];
//   updated[fromIndex] = {
//     ...anchor,
//     eta: minutesToDisplay(parseToMinutes(anchor.startTime)),
//   };

//   return updated;
// }
