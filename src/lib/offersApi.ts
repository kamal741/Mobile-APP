/**
 * offersApi.ts
 *
 * All functions use the shared `api` axios instance (./api.ts).
 * That instance automatically attaches the Bearer token from SecureStore
 * on every request via its request interceptor — no extra auth setup needed here.
 */

import { api } from './api';
import { queryClient } from './queryClient';
import { API_GLOBAL_PATHS } from './apiGlobalPaths';


// ─── Types ─────────────────────────────────────────────────────────────────────

export type OfferStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'countered'
  | string;

/** Shape returned by GET /api/agent/v1/agent/offers?... (each item in `content[]`) */
// export interface AgentOffer {
//   id: string;
//   masterPropertyId: number;
//   clientProfileId: number;
//   agentId: number;
//   amount: number;
//   status: OfferStatus;
//   rejectionReason: string | null;
//   submittedAt: string | null;   // ISO datetime
//   respondedAt: string | null;   // ISO datetime
//   notes: string | null;
// }


export interface AgentOffer {
  id: string;
  masterPropertyId: number;
  clientProfileId: number;
  agentId: number;
  amount: number;
  status: string;
  rejectionReason: string | null;
  submittedAt: string | null;
  respondedAt: string | null;
  notes: string | null;
  clientDisplayName: string | null;   // ← add
  property: {                          // ← add
    id: number;
    address: string;
    bedrooms: number;
    bathrooms: number;
    price: number;
    imageUrl: string | null;
  } | null;
}

/** Paginated wrapper returned by the list endpoint */
export interface AgentOffersPage {
  content: AgentOffer[];
  totalElements: number;
  number: number;       // current page (0-indexed)
  size: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

/** Body for POST /api/agent/v1/agent/offers */
export interface CreateOfferRequest {
  masterPropertyId: number;
  clientProfileId: number;
  amount: number;
  notes?: string | null;
}

// ─── Client History Types ──────────────────────────────────────────────────────

/** A single property as returned inside a tour in the client history response */
export interface ClientHistoryProperty {
  id: number;
  imageUrl: string;
  address: string;
  city?: string;
  province?: string;
  propertyType?: string;
  bedrooms: number;
  bathrooms: number;
  price: number | null;
  rating: number | null;
  media: {
    totalCount: number;
    photos: string[];
    videos: string[];
  };
}

export interface ClientHistoryTour {
  id: string;
  scheduledDate: string;   // ISO datetime
  status: string;
  totalProperties: number;
  properties: ClientHistoryProperty[];
}

export interface ClientHistorySummary {
  totalTours: number;
  totalPropertiesViewed: number;
  totalRatings: number;
  totalOffers: number;
}

export interface ClientHistory {
  summary: ClientHistorySummary;
  tours: ClientHistoryTour[];
}

// ─── URL Builders ──────────────────────────────────────────────────────────────

/** Single offer URL */
export function agentOfferUrl(offerId: string): string {
  return `${API_GLOBAL_PATHS.OfferApi}/${offerId}`;
}

/**
 * Paginated offers list URL.
 * Defaults: page=0, size=50, status=pending
 */
export function buildAgentOffersListUrl(options?: {
  page?: number;
  size?: number;
  status?: OfferStatus;
}): string {
  const page = options?.page ?? 0;
  const size = options?.size ?? 50;
  const status = options?.status ?? 'pending';
  return `${API_GLOBAL_PATHS.OfferApi}?page=${page}&size=${size}&status=${encodeURIComponent(status)}`;
}

/** Client history URL */
export function clientHistoryUrl(clientProfileId: number | string): string {
  return `/api/agent/v1/agent/clients/${clientProfileId}/history`;
}

// ─── React Query Keys ──────────────────────────────────────────────────────────

export function agentOffersQueryKey(options?: {
  page?: number;
  size?: number;
  status?: OfferStatus;
}) {
  return [
    'agent-offers',
    {
      page: options?.page ?? 0,
      size: options?.size ?? 50,
      status: options?.status ?? 'pending',
    },
  ] as const;
}

export function agentOfferDetailQueryKey(offerId: string) {
  return ['agent-offer-detail', offerId] as const;
}

export function clientHistoryQueryKey(clientProfileId: number | string) {
  return ['client-history', clientProfileId] as const;
}

// ─── API Functions ─────────────────────────────────────────────────────────────

/**
 * GET /api/agent/v1/agent/offers?page=&size=&status=
 *
 * Authorization: Bearer <token>  ← injected automatically by api.ts interceptor
 *
 * Returns the full paginated page object.
 */
export function fetchAgentOffersPage(options?: {
  page?: number;
  size?: number;
  status?: OfferStatus;
}): Promise<AgentOffersPage> {
  const url = buildAgentOffersListUrl(options);
  return api.get<AgentOffersPage>(url).then((r) => r.data);
}

/**
 * GET /api/agent/v1/agent/offers/:offerId
 *
 * Authorization: Bearer <token>  ← injected automatically by api.ts interceptor
 */
export function fetchAgentOffer(offerId: string): Promise<AgentOffer> {
  return api.get<AgentOffer>(agentOfferUrl(offerId)).then((r) => r.data);
}

/**
 * POST /api/agent/v1/agent/offers
 *
 * Authorization: Bearer <token>  ← injected automatically by api.ts interceptor
 *
 * Request body: { masterPropertyId, clientProfileId, amount, notes }
 */
export function createOffer(body: CreateOfferRequest): Promise<AgentOffer> {
  return api
    .post<AgentOffer>(API_GLOBAL_PATHS.OfferApi, {
      masterPropertyId: body.masterPropertyId,
      clientProfileId: body.clientProfileId,
      amount: body.amount,
      notes: body.notes ?? null,
    })
    .then((r) => r.data);
}

/**
 * PATCH /api/agent/v1/agent/offers/:offerId/withdraw
 *
 * Authorization: Bearer <token>  ← injected automatically by api.ts interceptor
 */
export function withdrawOffer(offerId: string): Promise<AgentOffer> {
  return api
    .patch<AgentOffer>(`${agentOfferUrl(offerId)}/withdraw`)
    .then((r) => r.data);
}

/**
 * GET /api/agent/v1/agent/clients/:clientProfileId/history
 *
 * Authorization: Bearer <token>  ← injected automatically by api.ts interceptor
 *
 * Returns the client's tour history including all properties they have viewed.
 * The caller can deduplicate by property id if needed.
 */
export function fetchClientHistory(
  clientProfileId: number | string,
): Promise<ClientHistory> {
  return api
    .get<ClientHistory>(clientHistoryUrl(clientProfileId))
    .then((r) => r.data);
}

// ─── Cache Invalidation ────────────────────────────────────────────────────────

export function invalidateOfferCaches(): void {
  void queryClient.invalidateQueries({ queryKey: ['agent-offers'] });
}

export function invalidateSingleOfferQueries(offerId: string): void {
  void queryClient.invalidateQueries({
    queryKey: agentOfferDetailQueryKey(offerId),
  });
  invalidateOfferCaches();
}
