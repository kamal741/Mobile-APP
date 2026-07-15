/** Returns true when `d` is a valid ISO date string (YYYY-MM-DD). */
export const isValidDate = (d: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d));

/** Returns true when `t` is a valid HH:MM time string. */
export const isValidTime = (t: string): boolean =>
  /^\d{2}:\d{2}$/.test(t);

/** Formats a price number as a US-locale dollar string. */
export const formatPrice = (price: number): string =>
  `$${Number(price).toLocaleString()}`;

/**
 * Formats a YYYY-MM-DD date string to a human-readable label.
 * Example: "Mon, January 6, 2025"
 */
export const formatTourDate = (dateStr: string): string =>
  new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });
