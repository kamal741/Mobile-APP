/**
 * brokerApi.ts
 *
 * All broker-related API calls, types, query keys, and React Query hooks.
 * Uses the shared `api` axios instance (./api.ts) which automatically
 * attaches the Bearer token from SecureStore on every request.
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from './api';
import { queryClient } from './queryClient';
import { API_GLOBAL_PATHS, brokerAgentClientsPath, brokerAgentStatsPath } from './apiGlobalPaths';
import { getApiErrorMessage } from './apiErrors';

// ─── Types ────────────────────────────────────────────────────────────────────

/** GET /api/broker/v1/broker/session/me */
export interface BrokerSession {
  platformUserId: string;
  brokerTenantId: string;
  authMethod:     string;
  email:          string;
  displayName:    string;
  phoneE164:      string | null;
}

/** GET /api/broker/v1/broker/settings  &  PUT response */
export interface BrokerSettings {
  id:           string;
  name:         string;
  firstName:    string | null;
  contactEmail: string;
  contactPhone: string | null;
  website:      string | null;
  status:       string | null;
  settings:     Record<string, unknown> | null;
}

/** Branding sub-object sent in UpdateBrokerSettingsPayload */
export interface BrokerBranding {
  logoUrl:        string | null;
  primaryColor:   string | null;
  secondaryColor: string | null;
  theme:          string | null;
  emailFooter:    string | null;
  faviconUrl:     string | null;
  showBrokerName: boolean | null;
}

/** PUT /api/broker/v1/broker/settings — request body */
export interface UpdateBrokerSettingsPayload {
  name:         string;
  contactEmail: string;
  contactPhone: string | null;
  website:      string | null;
  branding:     Partial<BrokerBranding>;
}

/** POST /api/broker/v1/broker/settings/logo/upload-url — request body */
export interface BrokerLogoUploadRequest {
  contentType: string;
  fileName:    string;
  fileSizeMb:  number;
}

/** POST /api/broker/v1/broker/settings/logo/upload-url — response body */
export interface BrokerLogoUploadResponse {
  uploadUrl: string;
  fileUrl:   string;
  status:    string;
  fileName:  string;
}

/** Single agent — GET /api/broker/v1/broker/agents (content[]) */
export interface BrokerAgent {
  id:           number;
  referralCode: string;
  displayName:  string;
  email:        string;
  phoneE164:    string | null;
  dateOfBirth:  string | null;   // ISO date "YYYY-MM-DD"
  status:       string;          // "ACTIVE" | "INACTIVE" | "PENDING"
  createdAt:    string;          // ISO datetime
}

/** Paginated wrapper from GET /api/broker/v1/broker/agents */
export interface BrokerAgentsPage {
  content:       BrokerAgent[];
  totalElements: number;
  number:        number;   // 0-indexed current page
  size:          number;
  totalPages:    number;
  first:         boolean;
  last:          boolean;
  empty:         boolean;
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

const brokerSessionMeUrl = `${API_GLOBAL_PATHS.brokerSession}/me` as const;

export function buildBrokerAgentsUrl(options?: { page?: number; size?: number }): string {
  const page = options?.page ?? 0;
  const size = options?.size ?? 50;
  return `${API_GLOBAL_PATHS.brokerAgents}?page=${page}&size=${size}`;
}

// ─── React Query keys ─────────────────────────────────────────────────────────

export const brokerQueryKeys = {
  session:  ['broker-session-me']             as const,
  settings: [API_GLOBAL_PATHS.brokerSettings] as const,
  agents:   (page = 0, size = 50) => ['broker-agents', { page, size }] as const,
  stats:    [API_GLOBAL_PATHS.brokerStats]    as const,
  agentStats: (agentId: number | string, pipelineWindowDays = 30, timezone?: string) =>
    ['broker-agent-stats', agentId, { pipelineWindowDays, timezone }] as const,
};

// ─── Raw API functions ────────────────────────────────────────────────────────

/** GET /api/broker/v1/broker/session/me */
export function fetchBrokerSession(): Promise<BrokerSession> {
  return api.get<BrokerSession>(brokerSessionMeUrl).then((r) => r.data);
}

/** GET /api/broker/v1/broker/settings */
export function fetchBrokerSettings(): Promise<BrokerSettings> {
  return api.get<BrokerSettings>(API_GLOBAL_PATHS.brokerSettings).then((r) => r.data);
}

/** PUT /api/broker/v1/broker/settings */
export function updateBrokerSettings(
  payload: UpdateBrokerSettingsPayload,
): Promise<BrokerSettings> {
  return api
    .put<BrokerSettings>(API_GLOBAL_PATHS.brokerSettings, payload)
    .then((r) => r.data);
}

/** POST /api/broker/v1/broker/settings/logo/upload-url */
export function generateBrokerLogoUploadUrl(
  payload: BrokerLogoUploadRequest,
): Promise<BrokerLogoUploadResponse> {
  return api
    .post<BrokerLogoUploadResponse>(
      API_GLOBAL_PATHS.brokerSettingsLogoUploadUrl,
      payload,
    )
    .then((r) => r.data);
}

/** PUT :uploadUrl — upload raw logo bytes directly to the signed GCS URL. */
export async function uploadBrokerLogoFile(
  uploadUrl: string,
  file: Blob | File,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Logo upload failed: ${xhr.status} ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => reject(new Error('Logo upload network error'));
    xhr.send(file);
  });
}

/** GET /api/broker/v1/broker/agents?page=&size= */
export function fetchBrokerAgents(options?: {
  page?: number;
  size?: number;
}): Promise<BrokerAgentsPage> {
  return api
    .get<BrokerAgentsPage>(buildBrokerAgentsUrl(options))
    .then((r) => r.data);
}

/** GET /api/broker/v1/broker/stats */
export function fetchBrokerStats(): Promise<BrokerStats> {
  return api.get<BrokerStats>(API_GLOBAL_PATHS.brokerStats).then((r) => r.data);
}

export function fetchBrokerAgentStats(
  agentId: number | string,
  options?: { pipelineWindowDays?: number; timezone?: string },
): Promise<BrokerAgentStats> {
  return api
    .get<BrokerAgentStats>(brokerAgentStatsPath(agentId), {
      params: {
        pipelineWindowDays: options?.pipelineWindowDays ?? 30,
        timezone: options?.timezone,
      },
    })
    .then((r) => r.data);
}

// ─── Cache invalidation ───────────────────────────────────────────────────────

export function invalidateBrokerCaches(): void {
  void queryClient.invalidateQueries({ queryKey: brokerQueryKeys.session });
  void queryClient.invalidateQueries({ queryKey: brokerQueryKeys.settings });
  void queryClient.invalidateQueries({ queryKey: ['broker-agents'] });
  void queryClient.invalidateQueries({ queryKey: brokerQueryKeys.stats });
}

// ─── React Query hooks ────────────────────────────────────────────────────────

/** Fetches the authenticated broker's identity (displayName, email, phone). */
export function useBrokerSession() {
  return useQuery<BrokerSession, Error>({
    queryKey: brokerQueryKeys.session,
    queryFn:  fetchBrokerSession,
    staleTime: 1000 * 60 * 10, // 10 min — identity rarely changes
  });
}

/** Fetches editable brokerage settings (name, contactEmail, phone, website, logoUrl, status). */
export function useBrokerSettings() {
  return useQuery<BrokerSettings, Error>({
    queryKey: brokerQueryKeys.settings,
    queryFn:  fetchBrokerSettings,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetches the paginated list of agents under this brokerage.
 *
 * @param page 0-indexed page number (default 0)
 * @param size items per page (default 50)
 */
export function useBrokerAgents(page = 0, size = 50) {
  return useQuery<BrokerAgentsPage, Error>({
    queryKey: brokerQueryKeys.agents(page, size),
    queryFn:  () => fetchBrokerAgents({ page, size }),
    staleTime: 1000 * 60 * 2,
  });
}

/** Fetches brokerage-level dashboard KPIs (active/completed/cancelled listings, agents, clients, distance, travel time). */
export function useBrokerStats() {
  return useQuery<BrokerStats, Error>({
    queryKey: brokerQueryKeys.stats,
    queryFn:  fetchBrokerStats,
    staleTime: 1000 * 60 * 5,
  });
}

export function useBrokerAgentStats(
  agentId: number | string | undefined,
  options?: { pipelineWindowDays?: number; timezone?: string },
) {
  const pipelineWindowDays = options?.pipelineWindowDays ?? 30;
  return useQuery<BrokerAgentStats, Error>({
    queryKey: brokerQueryKeys.agentStats(agentId ?? 'none', pipelineWindowDays, options?.timezone),
    queryFn: () => fetchBrokerAgentStats(agentId!, { pipelineWindowDays, timezone: options?.timezone }),
    staleTime: 1000 * 60 * 3,
    enabled: !!agentId,
  });
}

/**
 * Mutation to PUT /api/broker/v1/broker/settings.
 *
 * On success the settings cache is invalidated so the UI re-fetches the
 * latest data from the server automatically.
 */
export function useUpdateBrokerSettings() {
  return useMutation<BrokerSettings, Error, UpdateBrokerSettingsPayload>({
    mutationFn: updateBrokerSettings,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: brokerQueryKeys.settings });
    },
  });
}

/** Uploads a broker branding logo and invalidates settings so GET settings returns the new logoUrl. */
export function useUploadBrokerLogo() {
  return useMutation<
    BrokerLogoUploadResponse,
    Error,
    BrokerLogoUploadRequest & { file: Blob | File }
  >({
    mutationFn: async ({ file, contentType, fileName, fileSizeMb }) => {
      const upload = await generateBrokerLogoUploadUrl({
        contentType,
        fileName,
        fileSizeMb,
      });
      await uploadBrokerLogoFile(upload.uploadUrl, file);
      return upload;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: brokerQueryKeys.settings });
    },
  });
}

// ─── Broker Stats Types ───────────────────────────────────────────────────────

/** GET /api/broker/v1/broker/stats */
export interface BrokerStats {
  pipelineWindowDays: number;
  totalTravelTime:    number;
  completedListings:  number;
  totalDistance:      number;
  activeListings:     number;
  totalClients:       number;
  totalAgents:        number;
  cancelledListings:  number;
  totalOffers?:       number;
  overview?: {
    totalAgents:       number;
    totalClients:      number;
    activeListings:    number;
    completedListings: number;
    cancelledListings: number;
  };
  activity?: {
    scheduledToursWindow: number;
    completedToursWindow: number;
    cancelledToursWindow: number;
    newAgentsWindow:      number;
    newClientsWindow:     number;
    completionRate:       number;
    cancellationRate:     number;
  };
  offersPipeline?: {
    pending:        number;
    accepted:       number;
    rejected:       number;
    withdrawn:      number;
    total:          number;
    acceptanceRate: number;
  };
  showingRequests?: {
    pending:   number;
    approved:  number;
    rejected:  number;
    scheduled: number;
    total:     number;
  };
  clientEngagement?: {
    clientsWithPreferences:    number;
    clientsWithoutPreferences: number;
    avgPreferenceCompleteness: number;
    recentPreferenceChanges:   number;
  };
  teamPerformance?: {
    avgClientsPerAgent:    number;
    avgToursPerAgent:      number;
    agentsWithoutActivity: number;
    topAgentsByTours: Array<{
      agentId:         number;
      agentName:       string;
      completedTours:  number;
      activeClients:   number;
      totalDistanceKm: number;
    }>;
  };
  efficiency?: {
    totalDistanceKm:             number;
    totalTravelTimeMinutes:      number;
    avgDistancePerTourKm:        number;
    avgTravelTimePerTourMinutes: number;
  };
}

export interface BrokerAgentOffersPipeline {
  pending: number;
  accepted: number;
  rejected: number;
  total: number;
}

export interface BrokerAgentStats {
  timezone?: string;
  todayTours: number;
  activeClients: number;
  pendingRequests: number;
  weeklyDistance: number;
  timeInvestedHours: number;
  offersPipeline: BrokerAgentOffersPipeline;
  avgPreferenceCompleteness?: number;
  avgScopeFitScore: number;
  exceptionsCount: number;
  recentChanges: number;
  pipelineWindowDays?: number;
  showingsWindow?: number;
  offersPipelineWindow?: BrokerAgentOffersPipeline;
  offersMadeWindow?: number;
}

// ─── Agent Clients Types ───────────────────────────────────────────────────────

/** Single client of an agent — GET /api/broker/v1/broker/agents/:agentId/clients */
export interface BrokerAgentClient {
  id:         number;
  email:      string;
  phoneE164:  string | null;
  firstName:  string;
  lastName:   string;
  clientType: 'BUYER' | 'RENTER' | null;
  createdAt:  string;  // ISO datetime
}

/** Paginated wrapper for agent clients */
export interface BrokerAgentClientsPage {
  content:       BrokerAgentClient[];
  totalElements: number;
  number:        number;
  size:          number;
  totalPages:    number;
  first:         boolean;
  last:          boolean;
  empty:         boolean;
}

// ─── Agent Clients API ────────────────────────────────────────────────────────

// export function buildAgentClientsUrl(
//   agentId: number | string,
//   options?: { page?: number; size?: number },
// ): string {
//   const page = options?.page ?? 0;
//   const size = options?.size ?? 50;
//   return `${API_GLOBAL_PATHS.brokerAgents}/${agentId}/clients?page=${page}&size=${size}`;
// }

export function buildAgentClientsUrl(
  agentId: number | string,
  options?: { page?: number; size?: number },
): string {
  return brokerAgentClientsPath(agentId, options?.page ?? 0, options?.size ?? 50);
}

export function agentClientsQueryKey(agentId: number | string, page = 0, size = 50) {
  return ['broker-agent-clients', agentId, { page, size }] as const;
}

export function fetchAgentClients(
  agentId: number | string,
  options?: { page?: number; size?: number },
): Promise<BrokerAgentClientsPage> {
  return api
    .get<BrokerAgentClientsPage>(buildAgentClientsUrl(agentId, options))
    .then((r) => r.data);
}

/**
 * Fetches the paginated list of clients belonging to a specific agent.
 * @param agentId  The agent's numeric id
 * @param page     0-indexed page (default 0)
 * @param size     Items per page (default 50)
 */
export function useAgentClients(agentId: number | string, page = 0, size = 50) {
  return useQuery<BrokerAgentClientsPage, Error>({
    queryKey: agentClientsQueryKey(agentId, page, size),
    queryFn:  () => fetchAgentClients(agentId, { page, size }),
    staleTime: 1000 * 60 * 2,
    enabled:   !!agentId,
  });
}








// /**
//  * brokerApi.ts
//  *
//  * All broker-related API calls, types, query keys, and React Query hooks.
//  * Uses the shared `api` axios instance (./api.ts) which automatically
//  * attaches the Bearer token from SecureStore on every request.
//  */

// import { useQuery, useMutation } from '@tanstack/react-query';
// import { api } from './api';
// import { queryClient } from './queryClient';
// import { API_GLOBAL_PATHS, brokerAgentClientsPath } from './apiGlobalPaths';
// import { getApiErrorMessage } from './apiErrors';

// // ─── Types ────────────────────────────────────────────────────────────────────

// /** GET /api/broker/v1/broker/session/me */
// export interface BrokerSession {
//   platformUserId: string;
//   brokerTenantId: string;
//   authMethod:     string;
//   email:          string;
//   displayName:    string;
//   phoneE164:      string | null;
// }

// /** GET /api/broker/v1/broker/settings  &  PUT response */
// export interface BrokerSettings {
//   id:           string;
//   name:         string;
//   firstName:    string | null;
//   contactEmail: string;
//   contactPhone: string | null;
//   website:      string | null;
//   status:       string | null;
//   settings:     Record<string, unknown> | null;
// }

// /** Branding sub-object sent in UpdateBrokerSettingsPayload */
// export interface BrokerBranding {
//   logoUrl:        string | null;
//   primaryColor:   string | null;
//   secondaryColor: string | null;
//   theme:          string | null;
//   emailFooter:    string | null;
//   faviconUrl:     string | null;
//   showBrokerName: boolean | null;
// }

// /** PUT /api/broker/v1/broker/settings — request body */
// export interface UpdateBrokerSettingsPayload {
//   name:         string;
//   contactEmail: string;
//   contactPhone: string | null;
//   website:      string | null;
//   branding:     Partial<BrokerBranding>;
// }

// /** Single agent — GET /api/broker/v1/broker/agents (content[]) */
// export interface BrokerAgent {
//   id:           number;
//   referralCode: string;
//   displayName:  string;
//   email:        string;
//   phoneE164:    string | null;
//   dateOfBirth:  string | null;   // ISO date "YYYY-MM-DD"
//   status:       string;          // "ACTIVE" | "INACTIVE" | "PENDING"
//   createdAt:    string;          // ISO datetime
// }

// /** Paginated wrapper from GET /api/broker/v1/broker/agents */
// export interface BrokerAgentsPage {
//   content:       BrokerAgent[];
//   totalElements: number;
//   number:        number;   // 0-indexed current page
//   size:          number;
//   totalPages:    number;
//   first:         boolean;
//   last:          boolean;
//   empty:         boolean;
// }

// // ─── URL helpers ──────────────────────────────────────────────────────────────

// const brokerSessionMeUrl = `${API_GLOBAL_PATHS.brokerSession}/me` as const;

// export function buildBrokerAgentsUrl(options?: { page?: number; size?: number }): string {
//   const page = options?.page ?? 0;
//   const size = options?.size ?? 50;
//   return `${API_GLOBAL_PATHS.brokerAgents}?page=${page}&size=${size}`;
// }

// // ─── React Query keys ─────────────────────────────────────────────────────────

// export const brokerQueryKeys = {
//   session:  ['broker-session-me']             as const,
//   settings: [API_GLOBAL_PATHS.brokerSettings] as const,
//   agents:   (page = 0, size = 50) => ['broker-agents', { page, size }] as const,
// };

// // ─── Raw API functions ────────────────────────────────────────────────────────

// /** GET /api/broker/v1/broker/session/me */
// export function fetchBrokerSession(): Promise<BrokerSession> {
//   return api.get<BrokerSession>(brokerSessionMeUrl).then((r) => r.data);
// }

// /** GET /api/broker/v1/broker/settings */
// export function fetchBrokerSettings(): Promise<BrokerSettings> {
//   return api.get<BrokerSettings>(API_GLOBAL_PATHS.brokerSettings).then((r) => r.data);
// }

// /** PUT /api/broker/v1/broker/settings */
// export function updateBrokerSettings(
//   payload: UpdateBrokerSettingsPayload,
// ): Promise<BrokerSettings> {
//   return api
//     .put<BrokerSettings>(API_GLOBAL_PATHS.brokerSettings, payload)
//     .then((r) => r.data);
// }

// /** GET /api/broker/v1/broker/agents?page=&size= */
// export function fetchBrokerAgents(options?: {
//   page?: number;
//   size?: number;
// }): Promise<BrokerAgentsPage> {
//   return api
//     .get<BrokerAgentsPage>(buildBrokerAgentsUrl(options))
//     .then((r) => r.data);
// }

// // ─── Cache invalidation ───────────────────────────────────────────────────────

// export function invalidateBrokerCaches(): void {
//   void queryClient.invalidateQueries({ queryKey: brokerQueryKeys.session });
//   void queryClient.invalidateQueries({ queryKey: brokerQueryKeys.settings });
//   void queryClient.invalidateQueries({ queryKey: ['broker-agents'] });
// }

// // ─── React Query hooks ────────────────────────────────────────────────────────

// /** Fetches the authenticated broker's identity (displayName, email, phone). */
// export function useBrokerSession() {
//   return useQuery<BrokerSession, Error>({
//     queryKey: brokerQueryKeys.session,
//     queryFn:  fetchBrokerSession,
//     staleTime: 1000 * 60 * 10, // 10 min — identity rarely changes
//   });
// }

// /** Fetches editable brokerage settings (name, contactEmail, phone, website, logoUrl, status). */
// export function useBrokerSettings() {
//   return useQuery<BrokerSettings, Error>({
//     queryKey: brokerQueryKeys.settings,
//     queryFn:  fetchBrokerSettings,
//     staleTime: 1000 * 60 * 5,
//   });
// }

// /**
//  * Fetches the paginated list of agents under this brokerage.
//  *
//  * @param page 0-indexed page number (default 0)
//  * @param size items per page (default 50)
//  */
// export function useBrokerAgents(page = 0, size = 50) {
//   return useQuery<BrokerAgentsPage, Error>({
//     queryKey: brokerQueryKeys.agents(page, size),
//     queryFn:  () => fetchBrokerAgents({ page, size }),
//     staleTime: 1000 * 60 * 2,
//   });
// }

// /**
//  * Mutation to PUT /api/broker/v1/broker/settings.
//  *
//  * On success the settings cache is invalidated so the UI re-fetches the
//  * latest data from the server automatically.
//  */
// export function useUpdateBrokerSettings() {
//   return useMutation<BrokerSettings, Error, UpdateBrokerSettingsPayload>({
//     mutationFn: updateBrokerSettings,
//     onSuccess: () => {
//       void queryClient.invalidateQueries({ queryKey: brokerQueryKeys.settings });
//     },
//   });
// }

// // ─── Agent Clients Types ───────────────────────────────────────────────────────

// /** Single client of an agent — GET /api/broker/v1/broker/agents/:agentId/clients */
// export interface BrokerAgentClient {
//   id:         number;
//   email:      string;
//   phoneE164:  string | null;
//   firstName:  string;
//   lastName:   string;
//   clientType: 'BUYER' | 'RENTER' | null;
//   createdAt:  string;  // ISO datetime
// }

// /** Paginated wrapper for agent clients */
// export interface BrokerAgentClientsPage {
//   content:       BrokerAgentClient[];
//   totalElements: number;
//   number:        number;
//   size:          number;
//   totalPages:    number;
//   first:         boolean;
//   last:          boolean;
//   empty:         boolean;
// }

// // ─── Agent Clients API ────────────────────────────────────────────────────────

// // export function buildAgentClientsUrl(
// //   agentId: number | string,
// //   options?: { page?: number; size?: number },
// // ): string {
// //   const page = options?.page ?? 0;
// //   const size = options?.size ?? 50;
// //   return `${API_GLOBAL_PATHS.brokerAgents}/${agentId}/clients?page=${page}&size=${size}`;
// // }

// export function buildAgentClientsUrl(
//   agentId: number | string,
//   options?: { page?: number; size?: number },
// ): string {
//   return brokerAgentClientsPath(agentId, options?.page ?? 0, options?.size ?? 50);
// }

// export function agentClientsQueryKey(agentId: number | string, page = 0, size = 50) {
//   return ['broker-agent-clients', agentId, { page, size }] as const;
// }

// export function fetchAgentClients(
//   agentId: number | string,
//   options?: { page?: number; size?: number },
// ): Promise<BrokerAgentClientsPage> {
//   return api
//     .get<BrokerAgentClientsPage>(buildAgentClientsUrl(agentId, options))
//     .then((r) => r.data);
// }

// /**
//  * Fetches the paginated list of clients belonging to a specific agent.
//  * @param agentId  The agent's numeric id
//  * @param page     0-indexed page (default 0)
//  * @param size     Items per page (default 50)
//  */
// export function useAgentClients(agentId: number | string, page = 0, size = 50) {
//   return useQuery<BrokerAgentClientsPage, Error>({
//     queryKey: agentClientsQueryKey(agentId, page, size),
//     queryFn:  () => fetchAgentClients(agentId, { page, size }),
//     staleTime: 1000 * 60 * 2,
//     enabled:   !!agentId,
//   });
// }
