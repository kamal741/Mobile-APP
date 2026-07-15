/**
 * clientApi.ts
 *
 * All client-related API calls, types, query keys, and React Query hooks.
 * Uses the shared `api` axios instance (./api.ts) which automatically
 * attaches the Bearer token from SecureStore on every request.
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "./api";
import { queryClient } from "./queryClient";
import { API_GLOBAL_PATHS } from "./apiGlobalPaths";
import type { TourRequestFeedback } from "./tourRequestFeedback";
import {
  catalogPropertyPath,
  clientOfferPath,
  clientRatingPath,
  clientRatingsListPath,
  clientShortlistPath,
  clientShowingRequestPath,
  clientPropertyMediaPath,
  clientAllPropertiesMediaPath,
} from "./apiGlobalPaths";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClientPreferencesTier =
  | "must_have"
  | "important"
  | "low_priority"
  | "not_important";

export interface ClientPreferenceCompleteness {
  percent: number;
  setCount: number;
  totalCount: number;
}

export interface ClientStatsPropertySeen {
  liked: number;
  rejected: number;
  total: number;
}

export interface ClientPreferenceItemValue {
  amount?: number;
  min?: number;
  max?: number;
  [key: string]: unknown;
}

export interface ClientPreferenceItem {
  key: string;
  tier: ClientPreferencesTier;
  value: ClientPreferenceItemValue;
  source: string;
  sortOrder: number;
}

export interface ClientPreferenceSection {
  tier: ClientPreferencesTier;
  items: ClientPreferenceItem[];
}

export interface ClientPreferences {
  clientProfileId: number;
  version: number;
  completeness: ClientPreferenceCompleteness;
  sections: ClientPreferenceSection[];
  catalogVersion: string;
}

export interface SaveClientPreferencesPayload {
  version: number;
  replaceAll: boolean;
  items: ClientPreferenceItem[];
}

/** POST /api/client/v1/client/profile/upload-url — request body */
export interface ClientProfileImageUploadRequest {
  contentType: string;
  fileName: string;
  fileSizeMb: number;
}

/** POST /api/client/v1/client/profile/upload-url — response body */
export interface ClientProfileImageUploadResponse {
  uploadUrl: string;
  fileUrl: string;
  status: string;
  fileName: string;
}

// ─── Client Stats Types ───────────────────────────────────────────────────────

export interface ClientStatsTours {
  scheduled: number;
  completed: number;
  rejected: number;
  total: number;
}

export interface ClientStatsShowingRequests {
  pending: number;
  accepted: number;
  declined: number;
  total: number;
}

// ─── Client Showing Request Types ────────────────────────────────────────────

export type ClientShowingRequestStatus = "pending" | "accepted" | "declined";

export interface ClientShowingRequestProperty {
  id: string;
  requestId: string;
  masterPropertyId: number;
}

export interface ClientShowingRequest {
  id: string;
  clientProfileId: number;
  agentId: number;
  groupId: string | null;
  preferredDate: string | null;
  preferredTime: string;
  timezone: string | null;
  status: ClientShowingRequestStatus;
  notes: TourRequestFeedback | string | null;
  createdAt: string;
  updatedAt: string;
  requestedProperties: ClientShowingRequestProperty[];
  propertyIds: number[];
}

export interface ClientStatsOffers {
  pending: number;
  accepted: number;
  rejected: number;
  withdrawn: number;
  total: number;
}

export interface ClientStats {
  clientProfileId: number;
  timezone?: string;
  tours: ClientStatsTours;
  shortlistedProperties: number;
  showingRequests: ClientStatsShowingRequests;
  offers: ClientStatsOffers;
  propertySeen: ClientStatsPropertySeen; // ← add this
}

// ─── Client Tour Types ────────────────────────────────────────────────────────

export type ClientTourStatus = "scheduled" | "completed" | "cancelled";

export interface ClientTour {
  id: string;
  agentId: number;
  clientProfileId: number;
  groupId: number;
  scheduledDate: string;
  startTime: string;
  endTime: string | null;
  status: ClientTourStatus;
  totalDistance: number;
  estimatedDurationMinutes: number | null;
  actualDurationMinutes: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Client Offer Types ───────────────────────────────────────────────────────

export type ClientOfferStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn";

export interface ClientOffer {
  id: string;
  masterPropertyId: number;
  clientProfileId: number;
  agentId: number;
  amount: number;
  status: ClientOfferStatus;
  rejectionReason: string | null;
  submittedAt: string;
  respondedAt: string | null;
  notes: string | null;
}

// ─── Client Shortlist (Saved Property) Types ─────────────────────────────────

export interface ClientShortlist {
  id: string;
  masterPropertyId: number;
  createdAt: string;
}

export interface SavePropertyPayload {
  masterPropertyId: number;
}

// ─── Catalog Property Types ───────────────────────────────────────────────────

// export interface CatalogProperty {
//   id:            number;
//   address:       string;
//   city:          string;
//   province:      string;
//   price:         number;
//   bedrooms:      number;
//   bathrooms:     number;
//   squareFootage: number | null;
//   imageUrl:      string | null;
//   mlsNumber:     string | null;
//   propertyType:  string | null;
//   description:   string | null;
//   yearBuilt:     number | null;
//   lotSize:       number | null;
//   features:      string[];
// }

export interface CatalogPropertyPhoto {
  id: string;
  url: string;
  caption: string | null;
  displayOrder: number;
  mediaCategory: string;
  isPreferred: boolean;
}

export interface CatalogProperty {
  id: number;
  address: string;
  city: string;
  province: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number | null;
  imageUrl: string | null;
  mlsNumber: string | null;
  propertyType: string | null;
  description: string | null;
  yearBuilt: number | null;
  lotSize: number | null;
  features: string[];
  photos: CatalogPropertyPhoto[]; // ← add this
}

export interface ClientOffersPage {
  content: ClientOffer[];
  totalElements: number;
  number: number;
  size: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface FetchClientOffersParams {
  page?: number;
  size?: number;
  status?: ClientOfferStatus;
}

// ─── Client Property Media Types ─────────────────────────────────────────────

/** Single media item returned inside a client property media response. */
export interface ClientPropertyMediaItem {
  id: number;
  propertyId: number;
  mediaType: "IMAGE" | "VIDEO";
  url: string;
  thumbnailUrl: string | null;
  contentType: string;
  fileSizeMb: number;
  displayOrder: number;
  cover: boolean;
}

/** Media grouped by type for a single property — returned by both client media endpoints. */
export interface ClientPropertyMediaResponse {
  propertyId: number;
  images: ClientPropertyMediaItem[];
  videos: ClientPropertyMediaItem[];
}

// ─── Client Rating Types ──────────────────────────────────────────────────────

export type ClientRatingFeedbackCategory =
  | "offer_now"
  | "hold_later"
  | "reject";

export interface RatingChecklist {
  mustHave?: {
    budgetWithinRange?: boolean;
    preferredArea?: boolean;
    minimumBedroomsMet?: boolean;
    requiredBathroomsMet?: boolean;
    [key: string]: boolean | undefined;
  };
  importantPreferences?: {
    parkingRequirementMet?: boolean;
    backyardRequirementMet?: boolean;
    [key: string]: boolean | undefined;
  };
}

export interface RatingFeedback {
  checklist?: RatingChecklist;
  decision?: string;
  rejectionReasons?: string[];
  liked?: string;
  disliked?: string;
  [key: string]: unknown;
}

export interface ClientRating {
  id: string;
  masterPropertyId: number;
  tourId: string;
  clientProfileId: number;
  rating: number;
  feedbackCategory: ClientRatingFeedbackCategory;
  reason: string | null;
  notes: string | null;
  remindLater: boolean;
  remindedAt: string | null;
  feedback: RatingFeedback;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientRatingPayload {
  masterPropertyId: number;
  tourId: string;
  rating: number;
  feedbackCategory: ClientRatingFeedbackCategory;
  reason: string | null;
  notes?: string | null;
  remindLater?: boolean;
  remindedAt?: string | null;
  feedback?: RatingFeedback;
}

export interface UpdateClientRatingPayload extends CreateClientRatingPayload {}

export interface FetchClientRatingsParams {
  masterPropertyId?: string | number;
  tourId?: string;
}

export interface UnreviewedCompletedTour {
  tourEndTime: string;
  tourUpdatedAt: string;
  tourId: string;
  tourScheduledDate: string;
  tourStatus: string;
  tourStopOrder: number;
  masterPropertyId: number;
  visitedAt: string | null;
}

export interface ClientRatingsSummary {
  ratings: ClientRating[];
  unreviewedCompletedTours: UnreviewedCompletedTour[];
}

// ─── Preference Catalog Types ─────────────────────────────────────────────────

export type PreferenceCatalogValueType =
  | "MIN_PLUS_INT"
  | "MAX_PLUS_INT"
  | "STRING_LIST"
  | "RANGE";

export type PreferenceCatalogScoringDimension =
  | "BUDGET"
  | "TYPE"
  | "SIZE"
  | "LOCATION"
  | "AMENITY"
  | "CONDITION";

export interface PreferenceCatalogEntry {
  key: string;
  label: string;
  category: string;
  valueType: PreferenceCatalogValueType;
  scoringDimension: PreferenceCatalogScoringDimension;
  defaultTier: ClientPreferencesTier;
  defaultTierLabel: string;
  optionLabels: string[];
}

export interface PreferenceCatalogSection {
  tier: ClientPreferencesTier;
  tierLabel: string;
  entries: PreferenceCatalogEntry[];
}

export interface PreferencesCatalog {
  catalogVersion: string;
  totalCount: number;
  /** Entries grouped by tier — use for rendering section headers. */
  sections: PreferenceCatalogSection[];
  /** Flat list of all entries — convenient for key-based lookups. */
  entries: PreferenceCatalogEntry[];
}

// ─── React Query keys ────────────────────────────────────────────────────────

export const clientQueryKeys = {
  preferences: [API_GLOBAL_PATHS.clientPreferences] as const,
  preferencesCatalog: [API_GLOBAL_PATHS.clientPreferencesCatalog] as const,
  stats: [API_GLOBAL_PATHS.clientStats] as const,
  tours: [API_GLOBAL_PATHS.clientTours] as const,
  offers: [API_GLOBAL_PATHS.clientOffers] as const,
  offer: (offerId: string) => [API_GLOBAL_PATHS.clientOffers, offerId] as const,
  catalogProperty: (propertyId: number) =>
    [API_GLOBAL_PATHS.catalogProperties, propertyId] as const,
  showingRequests: [API_GLOBAL_PATHS.clientShowingRequests] as const,
  showingRequest: (showingRequestId: string) =>
    [API_GLOBAL_PATHS.clientShowingRequests, showingRequestId] as const,
  ratings: (params?: FetchClientRatingsParams) =>
    params
      ? ([API_GLOBAL_PATHS.clientRatings, params] as const)
      : ([API_GLOBAL_PATHS.clientRatings] as const),
  rating: (ratingId: string) =>
    [API_GLOBAL_PATHS.clientRatings, ratingId] as const,
  ratingsSummary: [API_GLOBAL_PATHS.clientRatingsSummary] as const,
  shortlists: [API_GLOBAL_PATHS.clientShortlists] as const,
  propertyMedia: (propertyId: string | number) =>
    ["client-property-media", String(propertyId)] as const,
  /** Shared media for all agent-shared properties. */
  allPropertiesMedia: ["client-all-properties-media"] as const,
} as const;

// ─── Raw API functions ────────────────────────────────────────────────────────

export function fetchClientPreferences(): Promise<ClientPreferences> {
  return api
    .get<ClientPreferences>(API_GLOBAL_PATHS.clientPreferences)
    .then((r) => r.data);
}

export function saveClientPreferences(
  payload: SaveClientPreferencesPayload,
): Promise<ClientPreferences> {
  return api
    .put<ClientPreferences>(API_GLOBAL_PATHS.clientPreferences, payload)
    .then((r) => r.data);
}

/** POST /api/client/v1/client/profile/upload-url */
export function generateClientProfileImageUploadUrl(
  payload: ClientProfileImageUploadRequest,
): Promise<ClientProfileImageUploadResponse> {
  return api
    .post<ClientProfileImageUploadResponse>(
      API_GLOBAL_PATHS.clientProfileImageUploadUrl,
      payload,
    )
    .then((r) => r.data);
}

/** PUT :uploadUrl — upload raw profile image bytes directly to the signed GCS URL. */
export async function uploadClientProfileImageFile(
  uploadUrl: string,
  file: Blob | File,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Profile image upload failed: ${xhr.status} ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => reject(new Error("Profile image upload network error"));
    xhr.send(file);
  });
}

// ─── Cache invalidation ───────────────────────────────────────────────────────

export function invalidateClientPreferencesCache(): void {
  void queryClient.invalidateQueries({ queryKey: clientQueryKeys.preferences });
}

// ─── React Query hooks ────────────────────────────────────────────────────────

export function useClientPreferences(options?: { enabled?: boolean }) {
  return useQuery<ClientPreferences, Error>({
    queryKey: clientQueryKeys.preferences,
    queryFn: fetchClientPreferences,
    staleTime: 1000 * 60 * 5,
    enabled: options?.enabled ?? true,
  });
}

export function useSaveClientPreferences() {
  return useMutation<ClientPreferences, Error, SaveClientPreferencesPayload>({
    mutationFn: saveClientPreferences,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: clientQueryKeys.preferences,
      });
    },
  });
}

/** Uploads the current client's profile image through a signed URL. */
export function useUploadClientProfileImage() {
  return useMutation<
    ClientProfileImageUploadResponse,
    Error,
    ClientProfileImageUploadRequest & { file: Blob | File }
  >({
    mutationFn: async ({ file, contentType, fileName, fileSizeMb }) => {
      const upload = await generateClientProfileImageUploadUrl({
        contentType,
        fileName,
        fileSizeMb,
      });
      await uploadClientProfileImageFile(upload.uploadUrl, file);
      return upload;
    },
  });
}

export function fetchPreferencesCatalog(): Promise<PreferencesCatalog> {
  return api
    .get<PreferencesCatalog>(API_GLOBAL_PATHS.clientPreferencesCatalog)
    .then((r) => r.data);
}

// ─── Raw API functions ─ (stats) ──────────────────────────────────────────────

function getAppTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function fetchClientStats(timezone = getAppTimezone()): Promise<ClientStats> {
  return api
    .get<ClientStats>(API_GLOBAL_PATHS.clientStats, { params: { timezone } })
    .then((r) => r.data);
}

// ─── React Query hooks ─ (catalog) ──────────────────────────────────────────

export function usePreferencesCatalog(options?: { enabled?: boolean }) {
  return useQuery<PreferencesCatalog, Error>({
    queryKey: clientQueryKeys.preferencesCatalog,
    queryFn: fetchPreferencesCatalog,
    // Catalog rarely changes — cache for the lifetime of the session.
    staleTime: Infinity,
    enabled: options?.enabled ?? true,
  });
}

// ─── React Query hooks ─ (stats) ─────────────────────────────────────────────

export function useClientStats(options?: { enabled?: boolean }) {
  const timezone = getAppTimezone();

  return useQuery<ClientStats, Error>({
    queryKey: [...clientQueryKeys.stats, timezone],
    queryFn: () => fetchClientStats(timezone),
    staleTime: 1000 * 60 * 5,
    enabled: options?.enabled ?? true,
  });
}

// ─── Raw API functions ─ (tours) ──────────────────────────────────────────────

export function fetchClientTours(): Promise<ClientTour[]> {
  return api
    .get<ClientTour[]>(API_GLOBAL_PATHS.clientTours)
    .then((r) => r.data);
}

// ─── React Query hooks ─ (tours) ─────────────────────────────────────────────

export function useClientTours(options?: { enabled?: boolean }) {
  return useQuery<ClientTour[], Error>({
    queryKey: clientQueryKeys.tours,
    queryFn: fetchClientTours,
    staleTime: 1000 * 60 * 2,
    enabled: options?.enabled ?? true,
  });
}

// ─── Raw API functions ─ (offers) ─────────────────────────────────────────────

export function fetchClientOffers(
  params: FetchClientOffersParams = {},
): Promise<ClientOffersPage> {
  const { page = 0, size = 50, status } = params;
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) query.set("status", status);
  return api
    .get<ClientOffersPage>(
      `${API_GLOBAL_PATHS.clientOffers}?${query.toString()}`,
    )
    .then((r) => r.data);
}

export function fetchClientOffer(offerId: string): Promise<ClientOffer> {
  return api.get<ClientOffer>(clientOfferPath(offerId)).then((r) => r.data);
}

// ─── React Query hooks ─ (offers) ────────────────────────────────────────────

export function useClientOffers(
  params: FetchClientOffersParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery<ClientOffersPage, Error>({
    queryKey: [...clientQueryKeys.offers, params],
    queryFn: () => fetchClientOffers(params),
    staleTime: 1000 * 60 * 2,
    enabled: options?.enabled ?? true,
  });
}

export function useClientOffer(
  offerId: string,
  options?: { enabled?: boolean },
) {
  return useQuery<ClientOffer, Error>({
    queryKey: clientQueryKeys.offer(offerId),
    queryFn: () => fetchClientOffer(offerId),
    staleTime: 1000 * 60 * 2,
    enabled: (options?.enabled ?? true) && Boolean(offerId),
  });
}

// ─── Raw API functions ─ (catalog property) ───────────────────────────────────

export function fetchCatalogProperty(
  propertyId: number,
): Promise<CatalogProperty> {
  return api
    .get<CatalogProperty>(catalogPropertyPath(propertyId))
    .then((r) => r.data);
}

// ─── React Query hooks ─ (catalog property) ──────────────────────────────────

export function useCatalogProperty(
  propertyId: number,
  options?: { enabled?: boolean },
) {
  return useQuery<CatalogProperty, Error>({
    queryKey: clientQueryKeys.catalogProperty(propertyId),
    queryFn: () => fetchCatalogProperty(propertyId),
    staleTime: 1000 * 60 * 10, // property details rarely change — cache for 10 min
    enabled: (options?.enabled ?? true) && Boolean(propertyId),
  });
}

// ─── Raw API functions ─ (showing requests) ──────────────────────────────────

export function fetchClientShowingRequest(
  showingRequestId: string,
): Promise<ClientShowingRequest> {
  return api
    .get<ClientShowingRequest>(clientShowingRequestPath(showingRequestId))
    .then((r) => r.data);
}

// ─── React Query hooks ─ (showing requests) ──────────────────────────────────

export function useClientShowingRequest(
  showingRequestId: string,
  options?: { enabled?: boolean },
) {
  return useQuery<ClientShowingRequest, Error>({
    queryKey: clientQueryKeys.showingRequest(showingRequestId),
    queryFn: () => fetchClientShowingRequest(showingRequestId),
    staleTime: 1000 * 60 * 2,
    enabled: (options?.enabled ?? true) && Boolean(showingRequestId),
  });
}

// ─── Raw API functions ─ (ratings) ───────────────────────────────────────────

export function createClientRating(
  payload: CreateClientRatingPayload,
): Promise<ClientRating> {
  return api
    .post<ClientRating>(API_GLOBAL_PATHS.clientRatings, {
      reason: "Testing", // ← default
      ...payload, // ← caller can still override it
    })
    .then((r) => r.data);
}

export function fetchClientRatings(
  params: FetchClientRatingsParams = {},
): Promise<ClientRating[]> {
  return api
    .get<ClientRating[]>(clientRatingsListPath(params))
    .then((r) => r.data);
}

export function fetchClientRatingsSummary(): Promise<ClientRatingsSummary> {
  return api
    .get<ClientRatingsSummary>(API_GLOBAL_PATHS.clientRatingsSummary)
    .then((r) => r.data);
}

export function fetchClientRating(ratingId: string): Promise<ClientRating> {
  return api.get<ClientRating>(clientRatingPath(ratingId)).then((r) => r.data);
}

export function updateClientRating(
  ratingId: string,
  payload: UpdateClientRatingPayload,
): Promise<ClientRating> {
  return api
    .put<ClientRating>(clientRatingPath(ratingId), payload)
    .then((r) => r.data);
}

// ─── React Query hooks ─ (ratings) ───────────────────────────────────────────

export function useClientRatings(
  params: FetchClientRatingsParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery<ClientRating[], Error>({
    queryKey: clientQueryKeys.ratings(params),
    queryFn: () => fetchClientRatings(params),
    staleTime: 1000 * 60 * 2,
    enabled: options?.enabled ?? true,
  });
}

export function useClientRatingsSummary(options?: { enabled?: boolean }) {
  return useQuery<ClientRatingsSummary, Error>({
    queryKey: clientQueryKeys.ratingsSummary,
    queryFn: fetchClientRatingsSummary,
    staleTime: 1000 * 60 * 2,
    enabled: options?.enabled ?? true,
  });
}

export function useClientRating(
  ratingId: string,
  options?: { enabled?: boolean },
) {
  return useQuery<ClientRating, Error>({
    queryKey: clientQueryKeys.rating(ratingId),
    queryFn: () => fetchClientRating(ratingId),
    staleTime: 1000 * 60 * 2,
    enabled: (options?.enabled ?? true) && Boolean(ratingId),
  });
}

export function useCreateClientRating() {
  return useMutation<ClientRating, Error, CreateClientRatingPayload>({
    mutationFn: createClientRating,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: clientQueryKeys.ratings(),
      });
      void queryClient.invalidateQueries({
        queryKey: clientQueryKeys.ratingsSummary,
      });
    },
  });
}

export function useUpdateClientRating(ratingId: string) {
  return useMutation<ClientRating, Error, UpdateClientRatingPayload>({
    mutationFn: (payload) => updateClientRating(ratingId, payload),
    onSuccess: (updated) => {
      // Update the individual rating in cache
      queryClient.setQueryData(clientQueryKeys.rating(ratingId), updated);
      // Invalidate list and summary queries so they re-fetch
      void queryClient.invalidateQueries({
        queryKey: clientQueryKeys.ratings(),
      });
      void queryClient.invalidateQueries({
        queryKey: clientQueryKeys.ratingsSummary,
      });
    },
  });
}

// ─── Raw API functions ─ (shortlists / saved properties) ─────────────────────

export function fetchClientShortlists(): Promise<ClientShortlist[]> {
  return api
    .get<ClientShortlist[]>(API_GLOBAL_PATHS.clientShortlists)
    .then((r) => r.data);
}

export function saveClientShortlist(
  payload: SavePropertyPayload,
): Promise<ClientShortlist> {
  return api
    .post<ClientShortlist>(API_GLOBAL_PATHS.clientShortlists, payload)
    .then((r) => r.data);
}

export function removeClientShortlist(masterPropertyId: number): Promise<void> {
  return api
    .delete<void>(clientShortlistPath(masterPropertyId))
    .then((r) => r.data);
}

// ─── React Query hooks ─ (shortlists / saved properties) ─────────────────────

export function useClientShortlists(options?: { enabled?: boolean }) {
  return useQuery<ClientShortlist[], Error>({
    queryKey: clientQueryKeys.shortlists,
    queryFn: fetchClientShortlists,
    staleTime: 1000 * 60 * 2,
    enabled: options?.enabled ?? true,
  });
}

export function useSaveClientShortlist() {
  return useMutation<ClientShortlist, Error, SavePropertyPayload>({
    mutationFn: saveClientShortlist,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: clientQueryKeys.shortlists,
      });
      void queryClient.invalidateQueries({ queryKey: clientQueryKeys.stats });
    },
  });
}

export function useRemoveClientShortlist() {
  return useMutation<void, Error, number>({
    mutationFn: removeClientShortlist,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: clientQueryKeys.shortlists,
      });
      void queryClient.invalidateQueries({ queryKey: clientQueryKeys.stats });
    },
  });
}

// ─── Raw API functions ─ (property media shared by agent) ────────────────────

/**
 * GET /api/client/v1/client/properties/:propertyId/media
 * Returns images and videos for a single property shared by the agent.
 */
export function fetchClientPropertyMedia(
  propertyId: string | number,
): Promise<ClientPropertyMediaResponse[]> {
  return api
    .get<ClientPropertyMediaResponse[]>(clientPropertyMediaPath(propertyId))
    .then((r) => r.data);
}

/**
 * GET /api/client/v1/client/properties/all-media
 * Returns images and videos for all properties shared by the agent.
 */
export function fetchClientAllPropertiesMedia(): Promise<
  ClientPropertyMediaResponse[]
> {
  return api
    .get<ClientPropertyMediaResponse[]>(clientAllPropertiesMediaPath)
    .then((r) => r.data);
}

// ─── React Query hooks ─ (property media shared by agent) ────────────────────

/**
 * Fetches agent-shared media for a single property using the client JWT.
 *
 * GET /api/client/v1/client/properties/:propertyId/media
 *
 * Stale time of 30 s — mirrors the agent-side media hooks.
 * Set `enabled: false` until propertyId is available.
 *
 * @example
 * const { data } = useClientPropertyMedia(propertyId);
 */
export function useClientPropertyMedia(
  propertyId: string | number,
  options?: { enabled?: boolean },
) {
  return useQuery<ClientPropertyMediaResponse[], Error>({
    queryKey: clientQueryKeys.propertyMedia(propertyId),
    queryFn: () => fetchClientPropertyMedia(propertyId),
    staleTime: 1000 * 30,
    enabled: (options?.enabled ?? true) && !!propertyId,
  });
}

/**
 * Fetches agent-shared media for ALL properties using the client JWT.
 *
 * GET /api/client/v1/client/properties/all-media
 *
 * Stale time of 30 s — mirrors the agent-side media hooks.
 *
 * @example
 * const { data } = useClientAllPropertiesMedia();
 */
export function useClientAllPropertiesMedia(options?: { enabled?: boolean }) {
  return useQuery<ClientPropertyMediaResponse[], Error>({
    queryKey: clientQueryKeys.allPropertiesMedia,
    queryFn: fetchClientAllPropertiesMedia,
    staleTime: 1000 * 30,
    enabled: options?.enabled ?? true,
  });
}
