import { Client, ClientHistory, ClientProfileStats } from '../types/client.types';

/** Derive summary stats shown at the top of the profile screen. */
export function buildProfileStats(
  clientHistory: ClientHistory | undefined,
  shortlistsLength: number,
): ClientProfileStats {
  return {
    totalTours:      clientHistory?.summary?.totalTours  ?? 0,
    totalShortlists: shortlistsLength,
    totalOffers:     clientHistory?.summary?.totalOffers ?? 0,
  };
}

/** Returns the two-letter initials for the profile avatar. */
export function getProfileInitials(client: Client): string {
  return `${client.firstName?.[0] ?? ''}${client.lastName?.[0] ?? ''}`.toUpperCase();
}
