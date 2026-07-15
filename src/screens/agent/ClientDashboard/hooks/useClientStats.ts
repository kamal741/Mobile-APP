import { useMemo } from 'react';
import { Client } from '../types/client.types';

export interface ClientStats {
  totalClients:      number;
  buyerCount:        number;
  renterCount:       number;
  totalOffersCount:  number;
}

export function useClientStats(
  clients: Client[],
  totalOffersCountOverride?: number,
): ClientStats {
  return useMemo(() => ({
    totalClients:      clients.length,
    buyerCount:        clients.filter((c) => c.clientType === 'buyer').length,
    renterCount:       clients.filter((c) => c.clientType === 'renter').length,
    totalOffersCount: typeof totalOffersCountOverride === 'number'
      ? totalOffersCountOverride
      : clients.reduce((sum, c) => sum + (c.offersCount ?? 0), 0),
  }), [clients, totalOffersCountOverride]);
}
