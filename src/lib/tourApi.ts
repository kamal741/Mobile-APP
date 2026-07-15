import { api } from './api';
import { API_GLOBAL_PATHS } from './apiGlobalPaths';
import { queryClient } from './queryClient';


import { useQuery } from '@tanstack/react-query';
import { agentTourRoutePath } from './apiGlobalPaths';
import type { RoutePlanResponse } from './agentRoutePlanningAPI';


export function buildAgentToursListUrl(options?: { status?: string; clientProfileId?: number }): string {
  let path = API_GLOBAL_PATHS.agentTours;
  const params: string[] = [];
  if (options?.status && options.status !== 'all') {
    params.push(`status=${encodeURIComponent(options.status)}`);
  }
  if (options?.clientProfileId != null) {
    params.push(`clientProfileId=${options.clientProfileId}`);
  }
  if (params.length) {
    path += `?${params.join('&')}`;
  }
  return path;
}

export function clientTourUrl(tourId: string) {
  return `${API_GLOBAL_PATHS.clientTours}/${tourId}`;
}

export function agentTourUrl(tourId: string) {
  return `${API_GLOBAL_PATHS.agentTours}/${tourId}`;
}

export function clientTourPropertiesUrl(tourId: string) {
  return `${API_GLOBAL_PATHS.clientTours}/${tourId}/properties`;
}

export function agentTourPropertiesUrl(tourId: string) {
  return `${API_GLOBAL_PATHS.agentTours}/${tourId}/properties`;
}

export function agentCompleteTourUrl(tourId: string) {
  return `${API_GLOBAL_PATHS.agentTours}/${tourId}/complete`;
}

export function agentCalculateRouteDistanceUrl(tourId: string) {
  return `${API_GLOBAL_PATHS.agentTours}/${tourId}/calculate-route-distance`;
}

export function agentClientHistoryUrl(clientId: string | number) {
  return `/api/agent/v1/agent/clients/${clientId}/history`;
}

/** React Query key for a single tour (use with `queryFn` that calls client vs agent URL by role). */
export function tourDetailQueryKey(userRole: 'agent' | 'client', tourId: string) {
  return ['tour-detail', userRole, tourId] as const;
}

export function tourPropertiesQueryKey(userRole: 'agent' | 'client', tourId: string) {
  return ['tour-properties', userRole, tourId] as const;
}

/**
 * @see com.estateflow.web.dto.tour.CreateTourRequest (estateflow-brokerage-agent-service)
 */
export function buildCreateTourRequestBody(params: {
  clientProfileId: number;
  groupId?: number | null;
  scheduledDate: Date;
  startTime: Date;
  endTime?: Date | null;
  notes?: string | null;
  estimatedDurationMinutes?: number | null;
  timezone?: string | null;
  masterPropertyIds: number[];
}): Record<string, unknown> {
  const fmt = (d: Date) => d.toISOString();
  const endTime = params.endTime == null ? null : fmt(params.endTime);
  return {
    clientProfileId: params.clientProfileId,
    groupId: params.groupId ?? null,
    scheduledDate: fmt(params.scheduledDate),
    startTime: fmt(params.startTime),
    endTime,
    timezone: params.timezone ?? null,
    notes: params.notes ?? null,
    estimatedDurationMinutes: params.estimatedDurationMinutes ?? null,
    masterPropertyIds: params.masterPropertyIds,
  };
}

export function invalidateTourListCaches() {
  void queryClient.invalidateQueries({ queryKey: [API_GLOBAL_PATHS.clientTours] });
  void queryClient.invalidateQueries({ queryKey: [API_GLOBAL_PATHS.agentTours] });
}

export function invalidateSingleTourQueries(
  userRole: 'agent' | 'client',
  tourId: string
) {
  void queryClient.invalidateQueries({ queryKey: tourDetailQueryKey(userRole, tourId) });
  void queryClient.invalidateQueries({ queryKey: tourPropertiesQueryKey(userRole, tourId) });
  invalidateTourListCaches();
}

export function fetchClientTourList() {
  return api.get(API_GLOBAL_PATHS.clientTours).then((r) => r.data);
}

export function fetchAgentTourList(url?: string) {
  return api.get(url ?? API_GLOBAL_PATHS.agentTours).then((r) => r.data);
}


// ─── Tour Route ───────────────────────────────────────────────────────────────

export function tourRouteQueryKey(tourId: string) {
  return ['tour-route', tourId] as const;
}

/** GET /api/agent/v1/agent/tours/:tourId/route */
export function fetchTourRoute(tourId: string): Promise<RoutePlanResponse> {
  return api.get<RoutePlanResponse>(agentTourRoutePath(tourId)).then((r) => r.data);
}

/** GET /api/agent/v1/agent/tours/:tourId/route */
export function useTourRoute(tourId: string) {
  return useQuery<RoutePlanResponse, Error>({
    queryKey: tourRouteQueryKey(tourId),
    queryFn:  () => fetchTourRoute(tourId),
    enabled:  Boolean(tourId),
  });
}
