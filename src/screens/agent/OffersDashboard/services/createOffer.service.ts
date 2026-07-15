import { api } from '../../../../lib/api';
import { API_GLOBAL_PATHS } from '../../../../lib/apiGlobalPaths';
import type { OfferClient, OfferProperty } from '../types/createOffer.types';

// ─── Clients ────────────────────────────────────────────────────────────────

export async function fetchOfferClients(): Promise<OfferClient[]> {
  const res = await api.get(`${API_GLOBAL_PATHS.agentClients}?page=0&size=200`);
  return Array.isArray(res.data) ? res.data : (res.data.content ?? []);
}

// ─── Properties ─────────────────────────────────────────────────────────────

export interface PropertiesPage {
  content: OfferProperty[];
  totalElements: number;
}
