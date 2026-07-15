/**
 * agentRoutePlanningAPI.ts — Agent showing-request & route-planning API.
 *
 * Endpoints:
 *  - GET    /api/agent/v1/agent/showing-requests/:requestId
 *  - POST   /api/agent/v1/agent/showing-requests/:requestId/route-plans/calculate
 *  - PATCH  /api/agent/v1/agent/showing-requests/:requestId/route/start
 *  - DELETE /api/agent/v1/agent/showing-requests/:requestId/properties/:requestedPropertyId
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from './api';
import { API_GLOBAL_PATHS } from './apiGlobalPaths';
import { queryClient } from './queryClient';

// ─── Path helpers ─────────────────────────────────────────────────────────────

const agentShowingRequestsBasePath = () =>
  `/api/agent/v1/agent/showing-requests` as const;

const agentShowingRequestPath = (requestId: string) =>
  `/api/agent/v1/agent/showing-requests/${requestId}` as const;

const agentRoutePlanCalculatePath = (requestId: string) =>
  `/api/agent/v1/agent/showing-requests/${requestId}/route-plans/calculate` as const;

const agentRouteStartPath = (requestId: string) =>
  `/api/agent/v1/agent/showing-requests/${requestId}/route/start` as const;

const agentRouteStopsPath = (requestId: string) =>
  `/api/agent/v1/agent/showing-requests/${requestId}/route/stops` as const;

const agentShowingRequestPropertyPath = (
  requestId: string,
  requestedPropertyId: string,
) =>
  `/api/agent/v1/agent/showing-requests/${requestId}/properties/${requestedPropertyId}` as const;

const clientRoutePlanPath = (tourId: string) =>
  `/api/agent/v1/client/tours/${tourId}/route` as const;

// ─── Showing request types ────────────────────────────────────────────────────

export interface ShowingRequestNotes {
  intent:    string;
  version:   number;
  comments:  string;
  timeline:  string;
  priorities: string[];
}

export interface ShowingRequestedProperty {
  id:                string;
  requestId:         string;
  masterPropertyId:  number;
}

/** GET /api/agent/v1/agent/showing-requests/:requestId */
export interface AgentShowingRequest {
  id:                  string;
  clientProfileId:     number;
  agentId:             number;
  groupId:             string | null;
  preferredDate:       string;
  preferredTime:       string;
  timezone:            string | null;
  status:              string;
  notes:               ShowingRequestNotes;
  createdAt:           string;
  updatedAt:           string;
  clientName:          string;
  requestedProperties: ShowingRequestedProperty[];
  propertyIds:         number[];
}

// ─── Create showing-request types ────────────────────────────────────────────

/** POST /api/agent/v1/agent/showing-requests */
export interface CreateShowingRequestPayload {
  /** IDs of the properties to include in the showing request. */
  propertyIds:   number[];
  /** ISO-8601 preferred date/time, e.g. "2026-06-01T14:00:00Z". */
  preferredDate: string;
  /** Time-of-day preference, e.g. "morning" | "afternoon" | "evening". */
  preferredTime: string;
  /** IANA timezone reported by the app, e.g. "America/Toronto". */
  timezone:      string;
  /** Profile ID of the client this request is created on behalf of. */
  clientId:      number;
}

/** A single entry in `requestedProperties` of the create response. */
export interface CreatedShowingRequestedProperty {
  requestId:        string;
  masterPropertyId: number;
}

/** Response from POST /api/agent/v1/agent/showing-requests */
export interface CreateShowingRequestResponse {
  id:                  string;
  clientProfileId:     number;
  agentId:             number;
  groupId:             string | null;
  preferredDate:       string;
  preferredTime:       string;
  timezone:            string | null;
  status:              string;
  notes:               ShowingRequestNotes | null;
  createdAt:           string;
  updatedAt:           string;
  clientName:          string;
  requestedProperties: CreatedShowingRequestedProperty[];
}

// ─── Request types ────────────────────────────────────────────────────────────

/** POST …/showing-requests/:requestId/route-plans/calculate */
export interface CalculateRoutePlanPayload {
  /** Optimisation mode, e.g. "FASTEST" or "SHORTEST". */
  sortMode:               string;
  /** Origin type, e.g. "CURRENT_LOCATION" or "CUSTOM". */
  startType:              string;
  /** Human-readable label for the start location. */
  startLabel:             string;
  /** Full formatted address text of the start location. */
  startAddressText:       string;
  /** Raw address components string. */
  startAddressComponents: string;
  startLatitude:          number;
  startLongitude:         number;
  /** GPS accuracy in metres. */
  startAccuracyM:         number;
  /** ISO-8601 timestamp when the start coordinates were captured. */
  startCapturedAt:        string;
  liveTrafficEnabled:     boolean;
  /** IANA timezone identifier, e.g. "America/Toronto". */
  timezone:               string;
  /** ISO-8601 requested departure time. */
  departureTime:          string;
}

/** PATCH …/showing-requests/:requestId/route/start */
export interface UpdateRouteStartPayload {
  /** Origin type, e.g. "CURRENT_LOCATION" or "CUSTOM". */
  type:    string;
  /** Human-readable label for the start location. */
  label:   string;
  /** Full formatted address text. */
  addressText: string;
  address: {
    street:     string;
    unit:       string;
    city:       string;
    province:   string;
    postalCode: string;
    country:    string;
  };
  /** Only present for CURRENT_LOCATION; omitted for custom_address. */
  latitude?:          number;
  longitude?:         number;
  /** GPS accuracy in metres. Only present for CURRENT_LOCATION. */
  accuracyM?:         number;
  /** ISO-8601 timestamp when the coordinates were captured. Only present for CURRENT_LOCATION. */
  capturedAt?:        string;
  liveTrafficEnabled: boolean;
  /** IANA timezone identifier, e.g. "America/Toronto". */
  timezone:           string;
  /** When `true` the server recalculates the route after updating the start. */
  recalculate:        boolean;
  /** Only present for CURRENT_LOCATION. */
  sortMode?:          string;
  /** ISO-8601 requested departure time. Only present for CURRENT_LOCATION. */
  departureTime?:     string;
}


/** A single stop entry for PATCH …/route/stops */
// export interface RouteStopUpdate {
//   requestedPropertyId:    string;
//   routeOrder:             number;
//   /** Display time string, e.g. "12:10 PM". */
//   scheduledStartTime:     string;
//   viewingDurationMinutes: number;
// }


export interface RouteStopUpdate {
  requestedPropertyId:    string;
  routeOrder:             number;
  /** ISO-8601 UTC datetime, e.g. "2026-06-29T14:45:00Z". */
  scheduledStartAt:       string;
  viewingDurationMinutes: number;
}
/** PATCH …/showing-requests/:requestId/route/stops */
export interface UpdateRouteStopsPayload {
  stops:       RouteStopUpdate[];
  recalculate: boolean;
  /** e.g. "Distance" | "Time" */
  sortMode:    string;
}

/** Response from PATCH …/showing-requests/:requestId/route/stops */
export interface UpdateRouteStopsResponse {
  requestId:             string;
  /** `true` when the existing route plan is now out of date. */
  routeStale:            boolean;
  latestRoutePlanId:     string;
  /** e.g. "stale" | "active" */
  latestRoutePlanStatus: string;
}
// ─── Delete property types ────────────────────────────────────────────────────

/**
 * Query params for DELETE …/showing-requests/:requestId/properties/:requestedPropertyId.
 * `recalculate=true` asks the server to rebuild the route plan immediately after removal.
 */
export interface DeleteShowingRequestPropertyParams {
  recalculate?: boolean;
}

/** Response from DELETE …/showing-requests/:requestId/properties/:requestedPropertyId */
export interface DeleteShowingRequestPropertyResponse {
  requestId:              string;
  /** `true` when the existing route plan is now out of date. */
  routeStale:             boolean;
  latestRoutePlanId:      string;
  /** e.g. "stale" | "active" */
  latestRoutePlanStatus:  string;
  activePropertyCount:    number;
  showingRequestId:       string;
}

/** Variables passed to `useDeleteShowingRequestProperty`. */
export interface DeleteShowingRequestPropertyVariables {
  requestedPropertyId: string;
  recalculate?:        boolean;
}

// ─── Response types ───────────────────────────────────────────────────────────

/** Showing-request summary embedded in a RoutePlanResponse. */
export interface RoutePlanShowingRequest {
  id:                   string;
  clientName:           string;
  /** ISO-8601 preferred date. */
  preferredDate:        string;
  preferredStartTime:   string;
  status:               string;
  bufferMinutesPerStop: number;
}

/** Start-location summary embedded in a RoutePlanResponse. */
export interface RoutePlanStart {
  type:        string;
  label:       string;
  addressText: string;
  latitude:    number;
  longitude:   number;
  timezone:    string;
}

/** High-level statistics for the whole route. */
export interface RoutePlanSummary {
  stopCount:                  number;
  totalDistanceMeters:        number;
  totalDriveDurationSeconds:  number;
  totalViewingDurationSeconds: number;
  totalDurationSeconds:       number;
  conflictCount:              number;
  liveTrafficEnabled:         boolean;
  isOptimized:                boolean;
  /** Encoded Google Maps polyline for the full route. */
  overviewPolyline:           string;
  /** Serialised viewport bounds, e.g. a JSON string or lat/lng box. */
  viewport:                   string;
}

/** A single stop within a route plan. */
export interface RoutePlanStop {
  id:                              string;
  requestedPropertyId:             string;
  masterPropertyId:                number;
  /** 1-based display order in the route. */
  order:                           number;
  address:                         string;
  latitude:                        number;
  longitude:                       number;
  /** ISO-8601 estimated time of arrival. */
  etaAt:                           string;
  /** ISO-8601 scheduled viewing start. */
  scheduledStartAt:                string;
  /** ISO-8601 scheduled viewing end. */
  scheduledEndAt:                  string;
  viewingDurationMinutes:          number;
  driveDistanceMetersFromPrevious: number;
  driveDurationSecondsFromPrevious: number;
  /** Human-readable distance label, e.g. "3.2 km". */
  distanceLabelFromPrevious:       string;
  /** UI badges to display on this stop, e.g. ["CONFLICT", "OPTIMIZED"]. */
  badges:                          string[];
}

/** A single route-plan warning or advisory. */
export interface RoutePlanWarning {
  type:            string;
  severity:        string;
  message:         string;
  suggestedAction: string;
}

/** POST …/showing-requests/:requestId/route-plans/calculate */
export interface RoutePlanResponse {
  routePlanId: string;
  request:     RoutePlanShowingRequest;
  start:       RoutePlanStart;
  summary:     RoutePlanSummary;
  stops:       RoutePlanStop[];
  warnings:    RoutePlanWarning[];
}

// ─── React Query keys ─────────────────────────────────────────────────────────

export const routePlanningQueryKeys = {
  showingRequest: (requestId: string) => ['agent-showing-request', requestId] as const,
  routePlan:      (requestId: string) => ['agent-route-plan',      requestId] as const,
  clientRoutePlan: (tourId: string)   => ['client-route-plan',     tourId]    as const,
} as const;

// ─── Raw API functions ────────────────────────────────────────────────────────

/** GET /api/agent/v1/agent/showing-requests/:requestId */
export function fetchAgentShowingRequest(requestId: string): Promise<AgentShowingRequest> {
  return api
    .get<AgentShowingRequest>(agentShowingRequestPath(requestId))
    .then((r) => r.data);
}

/** POST /api/agent/v1/agent/showing-requests */
export function createShowingRequest(
  payload: CreateShowingRequestPayload,
): Promise<CreateShowingRequestResponse> {
  return api
    .post<CreateShowingRequestResponse>(agentShowingRequestsBasePath(), payload)
    .then((r) => r.data);
}

/** POST /api/agent/v1/agent/showing-requests/:requestId/route-plans/calculate */
export function calculateRoutePlan(
  requestId: string,
  payload: CalculateRoutePlanPayload,
): Promise<RoutePlanResponse> {
  return api
    .post<RoutePlanResponse>(agentRoutePlanCalculatePath(requestId), payload)
    .then((r) => r.data);
}

/** PATCH /api/agent/v1/agent/showing-requests/:requestId/route/start */
export function updateRouteStart(
  requestId: string,
  payload: UpdateRouteStartPayload,
): Promise<void> {
  return api
    .patch<void>(agentRouteStartPath(requestId), payload)
    .then((r) => r.data);
}


/** PATCH /api/agent/v1/agent/showing-requests/:requestId/route/stops */
export function updateRouteStops(
  requestId: string,
  payload: UpdateRouteStopsPayload,
): Promise<UpdateRouteStopsResponse> {
  return api
    .patch<UpdateRouteStopsResponse>(agentRouteStopsPath(requestId), payload)
    .then((r) => r.data);
}

/**
 * DELETE /api/agent/v1/agent/showing-requests/:requestId/properties/:requestedPropertyId
 *
 * Pass `recalculate: true` to have the server rebuild the route plan immediately
 * after removing the property (saves a separate calculate call).
 */
export function deleteShowingRequestProperty(
  requestId: string,
  requestedPropertyId: string,
  params: DeleteShowingRequestPropertyParams = {},
): Promise<DeleteShowingRequestPropertyResponse> {
  const { recalculate = false } = params;
  return api
    .delete<DeleteShowingRequestPropertyResponse>(
      agentShowingRequestPropertyPath(requestId, requestedPropertyId),
      { params: { recalculate } },
    )
    .then((r) => r.data);
}

// ─── React Query hooks ────────────────────────────────────────────────────────

/** GET /api/agent/v1/agent/showing-requests/:requestId */
export function useAgentShowingRequest(requestId: string) {
  return useQuery<AgentShowingRequest, Error>({
    queryKey: routePlanningQueryKeys.showingRequest(requestId),
    queryFn:  () => fetchAgentShowingRequest(requestId),
    enabled:  Boolean(requestId),
  });
}

/**
 * POST /api/agent/v1/agent/showing-requests
 *
 * Creates a new showing request for the given client and properties.
 * On success the showing-requests list cache is invalidated so any
 * upstream screens reflect the newly created request immediately.
 *
 * Usage:
 * ```ts
 * const { mutate: createRequest, isPending } = useCreateShowingRequest();
 *
 * createRequest(
 *   {
 *     propertyIds:   [1, 2],
 *     preferredDate: '2026-06-01',
 *     preferredTime: '02:00 PM',
 *     timezone:      'America/Toronto',
 *     clientId:      1,
 *   },
 *   {
 *     onSuccess: (data) => {
 *       // data.id → new showing request ID, navigate to route planning screen
 *     },
 *     onError: (err) => { ... },
 *   },
 * );
 * ```
 */
export function useCreateShowingRequest() {
  return useMutation<CreateShowingRequestResponse, Error, CreateShowingRequestPayload>({
    mutationFn: (payload) => createShowingRequest(payload),
    onSuccess: (data) => {
      // Seed the cache for the newly created request so the route-planning
      // screen can read it without an extra network round-trip.
      void queryClient.invalidateQueries({
        queryKey: routePlanningQueryKeys.showingRequest(data.id),
      });
    },
  });
}

/** POST …/route-plans/calculate — invalidates route plan cache on success. */
export function useCalculateRoutePlan(requestId: string) {
  return useMutation<RoutePlanResponse, Error, CalculateRoutePlanPayload>({
    mutationFn: (payload) => calculateRoutePlan(requestId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: routePlanningQueryKeys.routePlan(requestId),
      });
    },
  });
}

/** PATCH …/route/start — pass `recalculate: true` to rebuild the route after update. */
export function useUpdateRouteStart(requestId: string) {
  return useMutation<void, Error, UpdateRouteStartPayload>({
    mutationFn: (payload) => updateRouteStart(requestId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: routePlanningQueryKeys.routePlan(requestId),
      });
    },
  });
}


/** PATCH …/route/stops — invalidates route plan cache on success. */
export function useUpdateRouteStops(requestId: string) {
  return useMutation<UpdateRouteStopsResponse, Error, UpdateRouteStopsPayload>({
    mutationFn: (payload) => updateRouteStops(requestId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: routePlanningQueryKeys.routePlan(requestId),
      });
    },
  });
}


/**
 * DELETE …/showing-requests/:requestId/properties/:requestedPropertyId
 *
 * Invalidates both the showing-request and route-plan caches on success so
 * the UI reflects the reduced property count and stale route status.
 *
 * Usage:
 * ```ts
 * const { mutate: deleteProperty, isPending } = useDeleteShowingRequestProperty(showingRequestId);
 *
 * deleteProperty(
 *   { requestedPropertyId: property.requestId, recalculate: false },
 *   {
 *     onSuccess: (data) => {
 *       // data.routeStale === true → prompt user to recalculate
 *     },
 *     onError: (err) => { ... },
 *   },
 * );
 * ```
 */
export function useDeleteShowingRequestProperty(requestId: string) {
  return useMutation<
    DeleteShowingRequestPropertyResponse,
    Error,
    DeleteShowingRequestPropertyVariables
  >({
    mutationFn: ({ requestedPropertyId, recalculate = false }) =>
      deleteShowingRequestProperty(requestId, requestedPropertyId, { recalculate }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: routePlanningQueryKeys.showingRequest(requestId),
      });
      void queryClient.invalidateQueries({
        queryKey: routePlanningQueryKeys.routePlan(requestId),
      });
    },
  });
}

// ─── Client route plan ───────────────────────────────────────────────────────

/** GET /api/agent/v1/client/tours/:tourId/route */
export function fetchClientRoutePlan(tourId: string): Promise<RoutePlanResponse> {
  return api
    .get<RoutePlanResponse>(clientRoutePlanPath(tourId))
    .then((r) => r.data);
}

/**
 * GET /api/agent/v1/client/tours/:tourId/route
 *
 * Fetches the approved route plan for a client tour. The response shape is
 * identical to the agent-side `RoutePlanResponse` so all existing types
 * (stops, summary, warnings, etc.) are reused.
 *
 * Usage:
 * ```ts
 * const { data: routePlan, isLoading } = useClientRoutePlan(tourId);
 * ```
 */
export function useClientRoutePlan(tourId: string) {
  return useQuery<RoutePlanResponse, Error>({
    queryKey: routePlanningQueryKeys.clientRoutePlan(tourId),
    queryFn:  () => fetchClientRoutePlan(tourId),
    enabled:  Boolean(tourId),
  });
}

// ─── Move property ────────────────────────────────────────────────────────────

const agentShowingRequestPropertyMovePath = (
  requestId: string,
  requestedPropertyId: string,
) =>
  `/api/agent/v1/agent/showing-requests/${requestId}/properties/${requestedPropertyId}/move` as const;

/** PATCH …/showing-requests/:requestId/properties/:requestedPropertyId/move */
export interface MoveShowingRequestPropertyPayload {
  /** When `true` the server recalculates the route after moving the property. */
  recalculate: boolean;
}

/** Response from PATCH …/showing-requests/:requestId/properties/:requestedPropertyId/move */
export interface MoveShowingRequestPropertyResponse {
  requestId:              string;
  /** `true` when the existing route plan is now out of date. */
  routeStale:             boolean;
  latestRoutePlanId:      string;
  /** e.g. "stale" | "active" */
  latestRoutePlanStatus:  string;
  /** The ID of the showing request the property was moved to. */
  movedToRequestId:       string;
  /** The new requestedPropertyId in the destination showing request. */
  newRequestedPropertyId: string;
}

/** Variables passed to `useMoveShowingRequestProperty`. */
export interface MoveShowingRequestPropertyVariables {
  requestedPropertyId: string;
  recalculate?:        boolean;
}

export function moveShowingRequestProperty(
  requestId: string,
  requestedPropertyId: string,
  payload: MoveShowingRequestPropertyPayload,
): Promise<MoveShowingRequestPropertyResponse> {
  return api
    .post<MoveShowingRequestPropertyResponse>(
      agentShowingRequestPropertyMovePath(requestId, requestedPropertyId),
      payload,
    )
    .then((r) => r.data);
}

/**
 * PATCH …/showing-requests/:requestId/properties/:requestedPropertyId/move
 *
 * Invalidates both the showing-request and route-plan caches on success so
 * the UI reflects the updated property list and stale route status.
 *
 * Usage:
 * ```ts
 * const { mutate: moveProperty, isPending } = useMoveShowingRequestProperty(showingRequestId);
 *
 * moveProperty(
 *   { requestedPropertyId: property.requestId, recalculate: false },
 *   {
 *     onSuccess: (data) => {
 *       // data.routeStale === true → prompt user to recalculate
 *       // data.movedToRequestId   → destination showing request
 *       // data.newRequestedPropertyId → new property ID in destination
 *     },
 *     onError: (err) => { ... },
 *   },
 * );
 * ```
 */
export function useMoveShowingRequestProperty(requestId: string) {
  return useMutation<
    MoveShowingRequestPropertyResponse,
    Error,
    MoveShowingRequestPropertyVariables
  >({
    mutationFn: ({ requestedPropertyId, recalculate = false }) =>
      moveShowingRequestProperty(requestId, requestedPropertyId, { recalculate }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: routePlanningQueryKeys.showingRequest(requestId),
      });
      void queryClient.invalidateQueries({
        queryKey: routePlanningQueryKeys.routePlan(requestId),
      });
    },
  });
}

// ─── Update showing-request status ───────────────────────────────────────────

const agentShowingRequestStatusPath = (requestId: string) =>
  `/api/agent/v1/agent/showing-requests/${requestId}/status` as const;

/** PATCH …/showing-requests/:requestId/status */
export interface UpdateShowingRequestStatusPayload {
  status:        string;
  preferredDate: string;
  preferredTime: string;
  /** IANA timezone reported by the app, e.g. "America/Toronto". */
  timezone:      string;
}

/** PATCH …/showing-requests/:requestId/status */
export interface UpdateShowingRequestStatusResponse {
  id:              string;
  clientProfileId: number;
  agentId:         number;
  preferredDate:   string;
  preferredTime:   string;
  status:          string;
  createdAt:       string;
  updatedAt:       string;
}

export function updateShowingRequestStatus(
  requestId: string,
  payload: UpdateShowingRequestStatusPayload,
): Promise<UpdateShowingRequestStatusResponse> {
  return api
    .patch<UpdateShowingRequestStatusResponse>(
      agentShowingRequestStatusPath(requestId),
      payload,
    )
    .then((r) => r.data);
}

/**
 * Refresh every screen affected by a showing-request status change.
 *
 * Approving a request creates a tour and changes dashboard aggregates, so
 * invalidating only the request detail leaves both screens displaying stale
 * data until their five-minute stale time expires.
 */
async function invalidateShowingRequestStatusCaches(requestId: string) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: routePlanningQueryKeys.showingRequest(requestId),
      refetchType: 'all',
    }),
    queryClient.invalidateQueries({
      queryKey: [API_GLOBAL_PATHS.agentShowingRequests],
      refetchType: 'all',
    }),
    queryClient.invalidateQueries({
      queryKey: [API_GLOBAL_PATHS.agentTours],
      refetchType: 'all',
    }),
    queryClient.invalidateQueries({
      queryKey: [API_GLOBAL_PATHS.agentStats],
      refetchType: 'all',
    }),
  ]);
}

/** PATCH …/showing-requests/:requestId/status — refreshes all affected agent data on success. */
export function useUpdateShowingRequestStatus(requestId: string) {
  return useMutation<
    UpdateShowingRequestStatusResponse,
    Error,
    UpdateShowingRequestStatusPayload
  >({
    mutationFn: (payload) => updateShowingRequestStatus(requestId, payload),
    onSuccess: () => invalidateShowingRequestStatusCaches(requestId),
  });
}
