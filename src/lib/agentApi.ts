/**
 * agentApi.ts
 *
 * All agent-related API calls, types, query keys, and React Query hooks.
 * Uses the shared `api` axios instance (./api.ts) which automatically
 * attaches the Bearer token from SecureStore on every request.
 *
 * Modelled after brokerApi.ts — same patterns, agent endpoints.
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from './api';
import { queryClient } from './queryClient';
import {
  API_GLOBAL_PATHS,
  agentOffersPath,
  agentOfferPath,
  agentClientShortlistsPath,
  agentClientPreferencesSectionPath,
  agentClientPreferencesCatalogPath,
  agentClientPreferencesPath,
  agentStatsShareWithClientPath,
  agentPropertyMediaUploadUrlPath,
  agentPropertyMediaPath,
  agentPropertyMediaConfirmPath,
  agentPropertyMediaBulkConfirmPath,
  agentPropertyMediaBulkDeletePath,
  agentPropertyMediaSharePath,
  agentPropertyMediaRevokePath,
  agentPropertyMediaShareStatusPath,
  clientRecommendationsPath,
} from './apiGlobalPaths';
import type { PreferencesCatalog } from './clientApi';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Address shape returned inside AgentMe.addresses[] */
export interface AgentAddress {
  addressType: 'HOME' | 'WORK';
  line1:       string;
  line2:       string | null;
  city:        string;
  region:      string;      // Full province name e.g. "Ontario"
  postalCode:  string;      // Stored without space e.g. "M5V3R8"
  countryCode: string;
}

/**
 * GET /api/agent/v1/agent/me
 * Full agent profile including address array.
 */
export interface AgentMe {
  agentId:         number;
  brokerId:        string;
  brokerDisplayName: string;
  authMethod:      string;
  email:           string;
  displayName:     string;
  phoneE164:       string | null;
  profileImageUrl: string | null;
  bio:             string | null;
  referralCode:    string;
  addresses:       AgentAddress[];
}

/** PUT /api/agent/v1/agent/profile — request body */
export interface UpdateAgentProfilePayload {
  displayName:              string;
  email:                    string | null;
  phoneE164:                string | null;
  bio?:                     string | null;
  profileImageUrl?:         string | null;
  profileImageBase64?:      string | null;
  profileImageContentType?: string | null;
  addresses?: Array<{
    addressType: 'HOME' | 'WORK';
    line1:       string;
    line2:       string | null;
    city:        string;
    region:      string;
    postalCode:  string;   // strip space before sending
    countryCode: string;
  }>;
}

/** GET /api/agent/v1/agent/settings/branding */
export interface AgentBrandingSettings {
  id:               string | null;
  agentId:          number;
  logoUrl:          string | null;
  primaryColor:     string | null;
  secondaryColor:   string | null;
  theme:            string | null;
  emailFooter:      string | null;
  faviconUrl:       string | null;
  showAgentName:    boolean | null;
  useOwnBranding:   boolean | null;
  agentName:        string;
  agentEmail:       string;
  brokerageName:    string;
  updatedAt:        string | null;
  updatedByAgentId: number | null;
}

/** PUT /api/agent/v1/agent/settings/branding */
export interface UpdateAgentBrandingSettingsPayload {
  logoUrl:        string | null;
  primaryColor:   string | null;
  secondaryColor: string | null;
  theme:          string | null;
  emailFooter:    string | null;
  faviconUrl:     string | null;
  showAgentName:  boolean | null;
  useOwnBranding: boolean | null;
  agentName:      string;
  agentEmail:     string;
  brokerageName:  string;
}

/** POST /api/agent/v1/agent/settings/branding/upload-url */
export interface AgentBrandingAssetUploadRequest {
  contentType: string;
  fileName:    string;
  fileSizeMb:  number;
  assetType?:  'logo' | 'favicon';
}

export interface AgentBrandingAssetUploadResponse {
  uploadUrl: string;
  fileUrl:   string;
  status:    string;
  fileName:  string;
  assetType: 'logo' | 'favicon';
}

// ─── Offer types ──────────────────────────────────────────────────────────────

/** Status values returned by the agent offers endpoint. */
export type AgentOfferStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

/** Property summary embedded in each AgentOffer. */
export interface AgentOfferProperty {
  id:        number;
  address:   string;
  bedrooms:  number;
  bathrooms: number;
  price:     number;
  imageUrl:  string | null;
}

/**
 * Single offer item returned inside AgentOffersPage.content[].
 * GET /api/agent/v1/agent/offers
 */
export interface AgentOffer {
  id:                string;
  masterPropertyId:  number;
  clientProfileId:   number;
  agentId:           number;
  amount:            number;
  status:            AgentOfferStatus;
  rejectionReason:   string | null;
  submittedAt:       string;   // ISO-8601
  respondedAt:       string | null;
  notes:             string | null;
  clientDisplayName: string;
  property:          AgentOfferProperty;
}

/** Paginated envelope returned by GET /api/agent/v1/agent/offers */
export interface AgentOffersPage {
  content:       AgentOffer[];
  totalElements: number;
  number:        number;   // zero-based page index
  size:          number;
  totalPages:    number;
  first:         boolean;
  last:          boolean;
  empty:         boolean;
}

/** Query params accepted by the agent offers list endpoint. */
export interface AgentOffersParams {
  page?:            number;
  size?:            number;
  status?:          AgentOfferStatus | string;
  clientProfileId?: string | number;
}

// ─── Agent client shortlist types ─────────────────────────────────────────────

/** Property summary embedded in each AgentClientShortlistItem. */
export interface AgentClientShortlistProperty {
  id:           number;
  imageUrl:     string | null;
  address:      string;
  city:         string;
  province:     string;
  mlsNumber:    string;
  bedrooms:     number;
  bathrooms:    number;
  price:        number;
  area:         number;
  propertyType: string;
  photos:       Array<{
    id:            string;
    url:           string;
    caption:       string | null;
    displayOrder:  number;
    mediaCategory: string;
    isPreferred:   boolean;
  }>;
}

/**
 * Single shortlist entry returned by
 * GET /api/client/v1/agent/clients/:clientProfileId/shortlists
 */
export interface AgentClientShortlistItem {
  id:               string;
  masterPropertyId: number;
  createdAt:        string;  // ISO-8601
  property:         AgentClientShortlistProperty;
}

// ─── Client Preferences types ──────────────────────────────────────────────────

/** Tier values for preference sections — ordered by priority. */
export type PreferenceTier = 'must_have' | 'important' | 'low_priority' | 'not_important';

/**
 * A single preference item value — the shape varies by key.
 * A range preference uses { min?, max? }; a multi-select uses { values: string[] }.
 */
export interface PreferenceItemValue {
  min?:    number;
  max?:    number;
  values?: string[];
}

/** A single preference entry within a tier section. */
export interface ClientPreferenceItem {
  key:       string;
  label:     string;
  category:  string;
  value:     PreferenceItemValue;
  source:    'user' | 'agent' | 'system';
  sortOrder: number;
}

/** A preference tier section grouping items by priority. */
export interface ClientPreferenceSection {
  tier:  PreferenceTier;
  items: ClientPreferenceItem[];
}

/** Completeness summary for the preference form. */
export interface PreferenceCompleteness {
  percent:    number;
  setCount:   number;
  totalCount: number;
}

/**
 * Full response shape for
 * GET /api/client/v1/agent/clients/:clientProfileId/preferences
 *
 * Agent JWT required (ROLE_AGENT).
 */
export interface AgentClientPreferences {
  clientProfileId: number;
  version:         number;
  completeness:    PreferenceCompleteness;
  sections:        ClientPreferenceSection[];
  catalogVersion:  string;
}


// ─── Save client preferences section types ────────────────────────────────────

/**
 * A single item in the PUT preferences section request body.
 * `value` shape varies by key: range ({ min?, max? }), multi-select ({ values }), or text ({ text }).
 */
export interface SavePreferenceItemPayload {
  key:       string;
  /** Required when using the full-preferences variant (`replaceAll` body). */
  tier?:     PreferenceTier;
  value:     PreferenceItemValue & { text?: string };
  source:    'user' | 'agent' | 'learned' | 'system';
  sortOrder: number;
}

/**
 * Request body for PUT …/preferences/sections/:preferenceTier
 *
 * - `version`    — optimistic-concurrency version from the last GET.
 * - `replaceAll` — when `false` the server merges; omit or set `true` to replace the whole tier.
 * - `items`      — preference entries to save.
 */
export interface SaveClientPreferencesSectionPayload {
  version:     number;
  replaceAll?: boolean;
  items:       SavePreferenceItemPayload[];
}

/**
 * Response shape returned by PUT …/preferences/sections/:preferenceTier.
 * Contains the updated section only (not the full sections array).
 */
export interface SaveClientPreferencesSectionResponse {
  clientProfileId: number;
  version:         number;
  completeness:    PreferenceCompleteness;
  section:         ClientPreferenceSection;
  catalogVersion:  string;
}

// ─── Update all client preferences types ─────────────────────────────────────

/**
 * A single item in the full-replace PUT /preferences request body.
 * `tier` is required here (unlike the per-section variant) because all tiers
 * are submitted in one flat array.
 */
export interface UpdatePreferenceItemPayload {
  key:       string;
  tier:      PreferenceTier;
  value:     PreferenceItemValue & { text?: string };
  source:    'user' | 'agent' | 'learned' | 'system';
  sortOrder: number;
}

/**
 * Request body for PUT /api/client/v1/agent/clients/:clientProfileId/preferences
 *
 * - `version`    — optimistic-concurrency version from the last GET.
 * - `replaceAll` — `true` replaces every tier; `false` merges.
 * - `items`      — flat list of all preference entries across all tiers.
 */
export interface UpdateAgentClientPreferencesPayload {
  replaceAll:  boolean;
  items:       UpdatePreferenceItemPayload[];
}

/**
 * Response shape returned by PUT …/preferences.
 * Contains the full updated preferences record (all sections).
 * Reuses AgentClientPreferences — the server returns the same shape as GET.
 */
export type UpdateAgentClientPreferencesResponse = AgentClientPreferences;

// ─── Share stats with client types ────────────────────────────────────────────

/**
 * Response shape for
 * POST /api/agent/v1/agent/stats/share-with-client
 */
export interface ShareStatsWithClientResponse {
  /** ISO-8601 timestamp of when the stats were shared. */
  sharedAt: string;
  /** Server-assigned share record ID. */
  shareId:  number;
}

// ─── Property Media types ─────────────────────────────────────────────────────

/** Single item in the POST …/media/upload-url request body. */
export interface PropertyMediaUploadRequest {
  contentType: string;   // e.g. "image/png"
  fileName:    string;
  fileSizeMb:  number;
}

/** Single item returned by POST …/media/upload-url. */
export interface PropertyMediaUploadUrlResponse {
  mediaId:   number;
  /** Pre-signed PUT URL — upload the raw binary directly to this URL. */
  uploadUrl: string;
  /** Permanent storage URL (use after confirmation). */
  fileUrl:   string;
  status:    'PENDING_UPLOAD';
  fileName:  string;
}

/** Media status values. */
export type PropertyMediaStatus = 'PENDING_UPLOAD' | 'APPROVED' | 'REJECTED';

/** Single item returned by confirm endpoints. */
export interface PropertyMediaConfirmResponse {
  mediaId: number;
  fileUrl: string;
  status:  PropertyMediaStatus;
}

/** Media type discriminator. */
export type PropertyMediaType = 'IMAGE' | 'VIDEO';

/** Single media item returned inside the list response. */
// export interface PropertyMediaItem {
//   mediaId:      number;
//   propertyId:   number;
//   mediaType:    PropertyMediaType;
//   fileUrl:      string;
//   thumbnailUrl: string | null;
//   contentType:  string;
//   fileSizeMb:   number;
//   status:       PropertyMediaStatus;
//   displayOrder: number;
//   isCover:      boolean;
// }


export interface PropertyMediaItem {
  mediaId:      number;
  propertyId:   number;
  mediaType:    PropertyMediaType;
  fileUrl:      string;
  thumbnailUrl: string | null;
  contentType:  string;
  fileSizeMb:   number;
  status:       PropertyMediaStatus;
  displayOrder: number;
  isCover:      boolean;
}
 

/** Full response shape for GET …/media. */
// export interface PropertyMediaListResponse {
//   propertyId: number;
//   images:     PropertyMediaItem[];
//   videos:     PropertyMediaItem[];
// }


export interface PropertyMediaListResponse {
  propertyId: number;
  images:     PropertyMediaItem[];
  videos:     PropertyMediaItem[];
}

export type PropertyMediaListApiResponse = PropertyMediaListResponse[];
 
 

export interface PropertyMediaShareResponse {
  id:             number;
  shareType:      string;
  propertyId:     number;
  clientId:       number;
  sharedByAgentId: number;
  sharedAt:       string;   // ISO-8601
  revoked:        boolean;
}





/** GET /api/agent/v1/agent/me */
const agentMeUrl = `${API_GLOBAL_PATHS.agentSession}/me` as const;

// ─── React Query keys ─────────────────────────────────────────────────────────

export const agentQueryKeys = {
  me:      ['agent-me']                          as const,
  profile: [API_GLOBAL_PATHS.agentProfile]       as const,
  branding: [API_GLOBAL_PATHS.agentBrandingSettings] as const,
  offers:  (params?: AgentOffersParams) =>
    params ? ['agent-offers', params] : ['agent-offers'],
  offer:   (offerId: string) => ['agent-offer', offerId] as const,
  clientShortlists: (clientProfileId: string | number) =>
    ['agent-client-shortlists', String(clientProfileId)] as const,
  /** Cache key for client preferences — scoped to clientProfileId */
  clientPreferences: (clientProfileId: string | number) =>
    ['agent-client-preferences', String(clientProfileId)] as const,
  /** Cache key for the agent-accessible preferences catalog (shared, not per-client). */
  preferencesCatalog: ['agent-preferences-catalog'] as const,
  propertyMedia: (propertyId: string | number) =>
    ['agent-property-media', String(propertyId)] as const,
  propertyMediaShareStatus: (clientId: string | number, propertyId: string | number) =>
    ['agent-property-media-share-status', String(clientId), String(propertyId)] as const,  // ← add this
} as const;

// ─── Raw API functions ────────────────────────────────────────────────────────

/** GET /api/agent/v1/agent/me */
export function fetchAgentMe(): Promise<AgentMe> {
  return api.get<AgentMe>(agentMeUrl).then((r) => r.data);
}

/**
 * GET /api/agent/v1/agent/offers
 * Supports optional page, size, status, and clientProfileId filters.
 */
export function fetchAgentOffers(
  params: AgentOffersParams = {},
): Promise<AgentOffersPage> {
  return api
    .get<AgentOffersPage>(agentOffersPath(params))
    .then((r) => r.data);
}

/**
 * GET /api/agent/v1/agent/offers/:offerId
 * Single offer detail including embedded property summary.
 */
export function fetchAgentOffer(offerId: string): Promise<AgentOffer> {
  return api
    .get<AgentOffer>(agentOfferPath(offerId))
    .then((r) => r.data);
}

/** PUT /api/agent/v1/agent/profile — update agent's own profile */
export function updateAgentProfile(
  payload: UpdateAgentProfilePayload,
): Promise<AgentMe> {
  return api
    .put<AgentMe>(API_GLOBAL_PATHS.agentProfile, payload)
    .then((r) => r.data);
}

/** GET /api/agent/v1/agent/settings/branding */
export function fetchAgentBrandingSettings(): Promise<AgentBrandingSettings> {
  return api
    .get<AgentBrandingSettings>(API_GLOBAL_PATHS.agentBrandingSettings)
    .then((r) => r.data);
}

/** PUT /api/agent/v1/agent/settings/branding */
export function updateAgentBrandingSettings(
  payload: UpdateAgentBrandingSettingsPayload,
): Promise<AgentBrandingSettings> {
  return api
    .put<AgentBrandingSettings>(API_GLOBAL_PATHS.agentBrandingSettings, payload)
    .then((r) => r.data);
}

/** POST /api/agent/v1/agent/settings/branding/upload-url */
export function generateAgentBrandingUploadUrl(
  payload: AgentBrandingAssetUploadRequest,
): Promise<AgentBrandingAssetUploadResponse> {
  return api
    .post<AgentBrandingAssetUploadResponse>(API_GLOBAL_PATHS.agentBrandingUploadUrl, payload)
    .then((r) => r.data);
}

/** PUT :uploadUrl — upload raw branding bytes directly to the signed GCS URL. */
export async function uploadAgentBrandingAsset(uploadUrl: string, file: Blob | File): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Branding upload failed: ${xhr.status} ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => reject(new Error('Branding upload network error'));
    xhr.send(file);
  });
}

/**
 * GET /api/client/v1/agent/clients/:clientProfileId/shortlists
 * Returns the full shortlist for a specific client, using the agent JWT.
 */
export function fetchAgentClientShortlists(
  clientProfileId: string | number,
): Promise<AgentClientShortlistItem[]> {
  return api
    .get<AgentClientShortlistItem[]>(agentClientShortlistsPath(clientProfileId))
    .then((r) => r.data);
}

/**
 * GET /api/client/v1/agent/clients/:clientProfileId/preferences
 * Returns the full preferences record for a specific client, using the agent JWT.
 */
export function fetchAgentClientPreferences(
  clientProfileId: string | number,
): Promise<AgentClientPreferences> {
  return api
    .get<AgentClientPreferences>(agentClientPreferencesPath(clientProfileId))
    .then((r) => r.data);
}

/**
 * PUT /api/client/v1/agent/clients/:clientProfileId/preferences/sections/:preferenceTier
 * Saves (or merges) a single preference tier section for a client, using the agent JWT.
 *
 * Set `replaceAll: false` in the payload to merge items instead of replacing the whole tier.
 */
export function saveAgentClientPreferencesSection(
  clientProfileId: string | number,
  preferenceTier:  PreferenceTier,
  payload:         SaveClientPreferencesSectionPayload,
): Promise<SaveClientPreferencesSectionResponse> {
  return api
    .put<SaveClientPreferencesSectionResponse>(
      agentClientPreferencesSectionPath(clientProfileId, preferenceTier),
      payload,
    )
    .then((r) => r.data);
}

/**
 * GET /api/client/v1/agent/clients/preferences/catalog
 * Returns the preferences catalog (entry definitions, tiers, option labels)
 * using the agent JWT. Identical response shape to the client-facing catalog.
 */
export function fetchAgentPreferencesCatalog(): Promise<PreferencesCatalog> {
  return api
    .get<PreferencesCatalog>(agentClientPreferencesCatalogPath)
    .then((r) => r.data);
}

/**
 * PUT /api/client/v1/agent/clients/:clientProfileId/preferences
 * Full-replace (or merge) all preference tiers for a client in one request,
 * using the agent JWT.
 *
 * Pass `replaceAll: true` to overwrite every tier; `false` to merge.
 */
export function updateAgentClientPreferences(
  clientProfileId: string | number,
  payload:         UpdateAgentClientPreferencesPayload,
): Promise<UpdateAgentClientPreferencesResponse> {
  return api
    .put<UpdateAgentClientPreferencesResponse>(
      agentClientPreferencesPath(clientProfileId),
      payload,
    )
    .then((r) => r.data);
}

/**
 * POST /api/agent/v1/agent/stats/share-with-client
 * Shares the agent's stats snapshot with a specific client.
 *
 * @param clientProfileId - The client's profile ID (passed as `clientId` query param).
 * @param shareFlags       - Whether to share stats (`true`) or revoke (`false`).
 */
export function shareAgentStatsWithClient(
  clientProfileId: string | number,
  shareFlags: boolean,
): Promise<ShareStatsWithClientResponse> {
  return api
    .post<ShareStatsWithClientResponse>(
      agentStatsShareWithClientPath(clientProfileId, shareFlags),
    )
    .then((r) => r.data);
}

// ─── Property Media API functions ────────────────────────────────────────────

/**
 * POST /api/agent/v1/agent/properties/:propertyId/media/upload-url
 * Requests one pre-signed GCS upload URL per file descriptor supplied.
 * Call `uploadPropertyMedia` with each returned `uploadUrl` next.
 */
export function generatePropertyMediaUploadUrls(
  propertyId: string | number,
  files: PropertyMediaUploadRequest[],
): Promise<PropertyMediaUploadUrlResponse[]> {
  return api
    .post<PropertyMediaUploadUrlResponse[]>(
      agentPropertyMediaUploadUrlPath(propertyId),
      files,
    )
    .then((r) => r.data);
}

/**
 * PUT :uploadUrl — upload raw binary directly to the pre-signed GCS URL.
 * No auth header is needed; the URL itself is already signed.
 * Returns nothing on success (HTTP 200).
 */
// export async function uploadPropertyMedia(
//   uploadUrl: string,
//   uploadUrl: string,
//   file: Blob | File,
// ): Promise<void> {
//   await fetch(uploadUrl, {
//     method: 'PUT',
//     body: file,
//     headers: { 'Content-Type': file.type },
//   }).then((res) => {
//     if (!res.ok) throw new Error(`Media upload failed: ${res.status}`);
//   });
// }


// export async function uploadPropertyMedia(
//   uploadUrl: string,
//   file: Blob | File,
// ): Promise<void> {
//   await fetch(uploadUrl, {
//     method: 'PUT',
//     body: file,
//   }).then((res) => {
//     if (!res.ok) throw new Error(`Media upload failed: ${res.status}`);
//   });
// }


// export async function uploadPropertyMedia(
//   uploadUrl: string,
//   file: Blob | File,
// ): Promise<void> {
//   const buffer = await file.arrayBuffer();
//   await fetch(uploadUrl, {
//     method: 'PUT',
//     body: buffer,
//   }).then((res) => {
//     if (!res.ok) throw new Error(`Media upload failed: ${res.status}`);
//   });
// }



export async function uploadPropertyMedia(
  uploadUrl: string,
  file: Blob | File,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    // Do NOT set any headers — signed URL only allows 'host'
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Media upload failed: ${xhr.status} ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => reject(new Error('Media upload network error'));
    xhr.send(file);
  });
}





/**
 * POST /api/agent/v1/agent/properties/:propertyId/media/:mediaId/confirm
 * Confirms a single upload — transitions status from PENDING_UPLOAD → APPROVED.
 */
export function confirmPropertyMediaUpload(
  propertyId: string | number,
  mediaId:    string | number,
): Promise<PropertyMediaConfirmResponse> {
  return api
    .post<PropertyMediaConfirmResponse>(
      agentPropertyMediaConfirmPath(propertyId, mediaId),
    )
    .then((r) => r.data);
}

/**
 * POST /api/agent/v1/agent/properties/:propertyId/media/confirm
 * Bulk-confirms multiple uploads in a single request.
 * Pass an array of mediaIds, e.g. [6, 7].
 */
export function confirmPropertyMediaUploadsBulk(
  propertyId: string | number,
  mediaIds:   number[],
): Promise<PropertyMediaConfirmResponse[]> {
  return api
    .post<PropertyMediaConfirmResponse[]>(
      agentPropertyMediaBulkConfirmPath(propertyId),
      mediaIds,
    )
    .then((r) => r.data);
}

/**
 * GET /api/agent/v1/agent/properties/:propertyId/media
 * Returns the full image and video list for a property.
 */
// export function fetchPropertyMedia(
//   propertyId: string | number,
// ): Promise<PropertyMediaListResponse> {
//   return api
//     .get<PropertyMediaListResponse>(agentPropertyMediaPath(propertyId))
//     .then((r) => r.data);
// }


export function fetchPropertyMedia(
  propertyId: string | number,
): Promise<PropertyMediaListApiResponse> {
  return api
    .get<PropertyMediaListApiResponse>(agentPropertyMediaPath(propertyId))
    .then((r) => r.data);
}

/**
 * GET /api/agent/v1/agent/properties/media
 * Returns media (images + videos) for ALL agent properties in one request.
 * Used by MediaCenterScreen to avoid a separate properties list fetch.
 */
export function fetchAllPropertiesMedia(): Promise<PropertyMediaListApiResponse> {
  return api
    .get<PropertyMediaListApiResponse>(`${API_GLOBAL_PATHS.agentSession}/properties/media`)
    .then((r) => r.data);
}
 

export async function fetchPropertyMediaForOne(
  propertyId: string | number,
): Promise<PropertyMediaListResponse> {
  const list = await fetchPropertyMedia(propertyId);
  if (!list.length) {
    throw new Error(`No media data returned for propertyId ${propertyId}`);
  }
  return list[0];
}
 

/**
 * POST /api/agent/v1/agent/properties/:propertyId/media/delete
 * Bulk-deletes media items by ID. Returns the deleted mediaIds.
 */
export function deletePropertyMediaBulk(
  propertyId: string | number,
  mediaIds:   number[],
): Promise<number[]> {
  return api
    .post<number[]>(agentPropertyMediaBulkDeletePath(propertyId), mediaIds)
    .then((r) => r.data);
}






/**
 * POST /api/agent/v1/agent/properties/shared-media?clientId=:clientId&propertyId=:propertyId
 * Shares property media with a specific client.
 */
export function sharePropertyMediaWithClient(params: {
  clientId: string | number;
  propertyId: string | number;
}): Promise<PropertyMediaShareResponse> {
  return api
    .post<PropertyMediaShareResponse>(agentPropertyMediaSharePath(params))
    .then((r) => r.data);
}

/**
 * POST /api/agent/v1/agent/properties/shared-media/:sharingId/revoke
 * Revokes a previously shared property media record.
 */
export function revokePropertyMediaShare(
  sharingId: string | number,
): Promise<PropertyMediaShareResponse> {
  return api
    .post<PropertyMediaShareResponse>(agentPropertyMediaRevokePath(sharingId))
    .then((r) => r.data);
}


export function fetchPropertyMediaShareStatus(
  clientId: string | number,
  propertyId: string | number,
): Promise<boolean> {
  return api
    .get<boolean>(agentPropertyMediaShareStatusPath(clientId, propertyId))
    .then((r) => r.data);
}



// ─── Cache invalidation ───────────────────────────────────────────────────────

export function invalidateAgentCaches(): void {
  void queryClient.invalidateQueries({ queryKey: agentQueryKeys.me });
  void queryClient.invalidateQueries({ queryKey: agentQueryKeys.profile });
}

// ─── React Query hooks ────────────────────────────────────────────────────────

/**
 * Fetches the authenticated agent's full profile, including addresses.
 *
 * Stale time of 5 min — profile changes are infrequent.
 * Set `enabled: false` if the current user is not an agent.
 */
export function useAgentMe(options?: { enabled?: boolean }) {
  return useQuery<AgentMe, Error>({
    queryKey: agentQueryKeys.me,
    queryFn:  fetchAgentMe,
    staleTime: 1000 * 60 * 5,
    enabled:   options?.enabled ?? true,
  });
}

/**
 * Mutation to PUT /api/agent/v1/agent/profile.
 *
 * On success the `agent-me` cache is invalidated so any component
 * using `useAgentMe` automatically re-fetches fresh data.
 */
export function useUpdateAgentProfile() {
  return useMutation<AgentMe, Error, UpdateAgentProfilePayload>({
    mutationFn: updateAgentProfile,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentQueryKeys.me });
    },
  });
}

export function useAgentBrandingSettings() {
  return useQuery<AgentBrandingSettings, Error>({
    queryKey: agentQueryKeys.branding,
    queryFn: fetchAgentBrandingSettings,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateAgentBrandingSettings() {
  return useMutation<AgentBrandingSettings, Error, UpdateAgentBrandingSettingsPayload>({
    mutationFn: updateAgentBrandingSettings,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentQueryKeys.branding });
      void queryClient.invalidateQueries({ queryKey: agentQueryKeys.me });
    },
  });
}

export function useUploadAgentBrandingAsset() {
  return useMutation<
    AgentBrandingAssetUploadResponse,
    Error,
    AgentBrandingAssetUploadRequest & { file: Blob | File }
  >({
    mutationFn: async ({ file, contentType, fileName, fileSizeMb, assetType }) => {
      const upload = await generateAgentBrandingUploadUrl({
        contentType,
        fileName,
        fileSizeMb,
        assetType,
      });
      await uploadAgentBrandingAsset(upload.uploadUrl, file);
      return upload;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentQueryKeys.branding });
    },
  });
}

/**
 * Fetches the authenticated agent's paginated offer list.
 *
 * All params are optional — omit to fetch the first page of all offers.
 * Stale time of 1 min; offers change more frequently than profile data.
 *
 * @example
 * // All pending offers for a specific client
 * useAgentOffers({ status: 'pending', clientProfileId: 42 });
 */
export function useAgentOffers(params: AgentOffersParams = {}, options?: { enabled?: boolean }) {
  return useQuery<AgentOffersPage, Error>({
    queryKey: agentQueryKeys.offers(params),
    queryFn:  () => fetchAgentOffers(params),
    staleTime: 1000 * 60,
    enabled:   options?.enabled ?? true,
  });
}

/**
 * Fetches a single offer by ID using the agent JWT.
 * Used when an agent views the ClientOfferDetailScreen.
 *
 * Stale time of 1 min — mirrors the list hook.
 * Set `enabled: false` until the offerId is available.
 */
export function useAgentOffer(offerId: string, options?: { enabled?: boolean }) {
  return useQuery<AgentOffer, Error>({
    queryKey: agentQueryKeys.offer(offerId),
    queryFn:  () => fetchAgentOffer(offerId),
    staleTime: 1000 * 60,
    enabled:   (options?.enabled ?? true) && !!offerId,
  });
}

/**
 * Fetches the shortlist for a specific client using the agent JWT.
 *
 * GET /api/client/v1/agent/clients/:clientProfileId/shortlists
 *
 * Stale time of 2 min — shortlists change less frequently than offers.
 * Set `enabled: false` until the clientProfileId is available.
 *
 * @example
 * useAgentClientShortlists(clientProfileId);
 */
export function useAgentClientShortlists(
  clientProfileId: string | number,
  options?: { enabled?: boolean },
) {
  return useQuery<AgentClientShortlistItem[], Error>({
    queryKey: agentQueryKeys.clientShortlists(clientProfileId),
    queryFn:  () => fetchAgentClientShortlists(clientProfileId),
    staleTime: 1000 * 60 * 2,
    enabled:   (options?.enabled ?? true) && !!clientProfileId,
  });
}

/**
 * Fetches preference data for a specific client using the agent JWT.
 *
 * GET /api/client/v1/agent/clients/:clientProfileId/preferences
 *
 * Stale time of 5 min — preferences are set by the client and change infrequently.
 * Set `enabled: false` until the clientProfileId is available.
 *
 * @example
 * const { data, isLoading } = useAgentClientPreferences(clientProfileId);
 */
export function useAgentClientPreferences(
  clientProfileId: string | number,
  options?: { enabled?: boolean },
) {
  return useQuery<AgentClientPreferences, Error>({
    queryKey: agentQueryKeys.clientPreferences(clientProfileId),
    queryFn:  () => fetchAgentClientPreferences(clientProfileId),
    staleTime: 1000 * 60 * 5,
    enabled:   (options?.enabled ?? true) && !!clientProfileId,
  });
}

/**
 * Mutation to PUT …/preferences/sections/:preferenceTier for a specific client.
 *
 * On success the `agent-client-preferences` cache for that client is invalidated
 * so any component using `useAgentClientPreferences` re-fetches fresh data.
 *
 * @example
 * const mutation = useSaveAgentClientPreferencesSection(clientProfileId);
 * mutation.mutate({ tier: 'must_have', payload: { version, items } });
 */
export function useSaveAgentClientPreferencesSection(
  clientProfileId: string | number,
) {
  return useMutation<
    SaveClientPreferencesSectionResponse,
    Error,
    { tier: PreferenceTier; payload: SaveClientPreferencesSectionPayload }
  >({
    mutationFn: ({ tier, payload }) =>
      saveAgentClientPreferencesSection(clientProfileId, tier, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: agentQueryKeys.clientPreferences(clientProfileId),
      });
    },
  });
}

/**
 * Fetches the preferences catalog using the agent JWT.
 *
 * GET /api/client/v1/agent/clients/preferences/catalog
 *
 * The catalog is effectively static for the lifetime of a session —
 * staleTime is set to Infinity to avoid redundant network requests.
 * Set `enabled: false` to defer fetching until ready.
 *
 * @example
 * const { data: catalog } = useAgentPreferencesCatalog();
 */
export function useAgentPreferencesCatalog(options?: { enabled?: boolean }) {
  return useQuery<PreferencesCatalog, Error>({
    queryKey: agentQueryKeys.preferencesCatalog,
    queryFn:  fetchAgentPreferencesCatalog,
    staleTime: Infinity,
    enabled:   options?.enabled ?? true,
  });
}

/**
 * Mutation to PUT …/preferences for a specific client (full-replace all tiers).
 *
 * Accepts a flat `items[]` array with a `tier` field on each item — this is the
 * bulk variant used when saving all tiers at once (e.g. from AgentClientPreferences screen).
 *
 * On success both the `agent-client-preferences` cache for that client and the
 * `agent-preferences-catalog` cache are invalidated.
 *
 * @example
 * const mutation = useUpdateAgentClientPreferences(clientProfileId);
 * mutation.mutate({ version, replaceAll: true, items });
 */
export function useUpdateAgentClientPreferences(
  clientProfileId: string | number,
) {
  return useMutation<
    UpdateAgentClientPreferencesResponse,
    Error,
    UpdateAgentClientPreferencesPayload
  >({
    mutationFn: (payload) => updateAgentClientPreferences(clientProfileId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: agentQueryKeys.clientPreferences(clientProfileId),
      });
    },
  });
}

/**
 * Mutation to POST …/stats/share-with-client for a specific client.
 *
 * POST /api/agent/v1/agent/stats/share-with-client?clientId=:clientProfileId&shareFlags=:shareFlags
 *
 * @example
 * const mutation = useShareAgentStatsWithClient();
 * mutation.mutate({ clientProfileId: 42, shareFlags: true });
 */
// export function useShareAgentStatsWithClient() {
//   return useMutation<
//     ShareStatsWithClientResponse,
//     Error,
//     { clientProfileId: string | number; shareFlags: boolean }
//   >({
//     mutationFn: ({ clientProfileId, shareFlags }) =>
//       shareAgentStatsWithClient(clientProfileId, shareFlags),
//   });
// }


export function useShareAgentStatsWithClient() {
  return useMutation<
    ShareStatsWithClientResponse,
    Error,
    { clientProfileId: string | number; shareFlags: boolean }
  >({
    mutationFn: ({ clientProfileId, shareFlags }) =>
      shareAgentStatsWithClient(clientProfileId, shareFlags),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['agent-clients'],
      });
    },
  });
}
/**
 * Fetches the full image and video list for a property.
 *
 * GET /api/agent/v1/agent/properties/:propertyId/media
 *
 * Stale time of 30 s — media can change after uploads/deletes.
 * Set `enabled: false` until the propertyId is available.
 */
// export function usePropertyMedia(
//   propertyId: string | number,
//   options?: { enabled?: boolean },
// ) {
//   return useQuery<PropertyMediaListResponse, Error>({
//     queryKey: agentQueryKeys.propertyMedia(propertyId),
//     queryFn:  () => fetchPropertyMedia(propertyId),
//     staleTime: 1000 * 30,
//     enabled:   (options?.enabled ?? true) && !!propertyId,
//   });
// }



export function usePropertyMedia(
  propertyId: string | number,
  options?: { enabled?: boolean },
) {
  return useQuery<PropertyMediaListResponse, Error>({
    queryKey: agentQueryKeys.propertyMedia(propertyId),
    queryFn:  () => fetchPropertyMediaForOne(propertyId),
    staleTime: 1000 * 30,
    enabled:   (options?.enabled ?? true) && !!propertyId,
  });
}



export function usePropertyMediaList(
  propertyId: string | number,
  options?: { enabled?: boolean },
) {
  return useQuery<PropertyMediaListApiResponse, Error>({
    queryKey: [...agentQueryKeys.propertyMedia(propertyId), 'list'],
    queryFn:  () => fetchPropertyMedia(propertyId),
    staleTime: 1000 * 30,
    enabled:   (options?.enabled ?? true) && !!propertyId,
  });
}

/**
 * Fetches media for ALL agent properties in a single request.
 *
 * GET /api/agent/v1/agent/properties/media
 *
 * Stale time of 30 s — mirrors the per-property hook.
 * Use this in MediaCenterScreen instead of fetching properties + media separately.
 */
export function useAllPropertiesMedia(options?: { enabled?: boolean }) {
  return useQuery<PropertyMediaListApiResponse, Error>({
    queryKey: ['agent-all-properties-media'],
    queryFn:  fetchAllPropertiesMedia,
    staleTime: 1000 * 30,
    enabled:   options?.enabled ?? true,
  });
}




/**
 * Mutation that orchestrates the full 3-step upload flow:
 *  1. POST …/upload-url  — get all pre-signed URLs in one request
 *  2. PUT  uploadUrl     — upload files one at a time (sequential)
 *  3. POST …/confirm     — bulk-confirm all mediaIds
 *
 * `onProgress(current, total)` fires after each individual file upload completes,
 * so the UI can update "Uploading 2 of 5…" in real time.
 *
 * Invalidates the `propertyMedia` cache on success.
 */
export function useUploadPropertyMedia(
  propertyId: string | number,
  onProgress?: (current: number, total: number) => void,
) {
  return useMutation<
  PropertyMediaConfirmResponse[],
  Error,
  Array<{ file: Blob | File; contentType: string; fileName: string; fileSizeMb: number }>
>({
    mutationFn: async (items) => {
      // Step 1 — generate all pre-signed URLs in a single request
      const urlResponses = await generatePropertyMediaUploadUrls(
        propertyId,
        items.map(({ contentType, fileName, fileSizeMb }) => ({
          contentType,
          fileName,
          fileSizeMb,
        })),
      );

      // Step 2 — upload files sequentially, one at a time
      for (let i = 0; i < urlResponses.length; i++) {
        await uploadPropertyMedia(urlResponses[i].uploadUrl, items[i].file);
        onProgress?.(i + 1, urlResponses.length);
      }

      // Step 3 — bulk confirm all mediaIds in a single request
      return confirmPropertyMediaUploadsBulk(
        propertyId,
        urlResponses.map((r) => r.mediaId),
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: agentQueryKeys.propertyMedia(propertyId),
      });
    },
  });
}


/**
 * Mutation to bulk-delete media items from a property.
 *
 * POST /api/agent/v1/agent/properties/:propertyId/media/delete
 *
 * Invalidates the `propertyMedia` cache on success.
 *
 * @example
 * const mutation = useDeletePropertyMedia(propertyId);
 * mutation.mutate([6, 7]);
 */
export function useDeletePropertyMedia(propertyId: string | number) {
  return useMutation<number[], Error, number[]>({
    mutationFn: (mediaIds) => deletePropertyMediaBulk(propertyId, mediaIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: agentQueryKeys.propertyMedia(propertyId),
      });
    },
  });
}


/**
 * Mutation to share property media with a client.
 *
 * POST /api/agent/v1/agent/properties/shared-media?clientId=:clientId&propertyId=:propertyId
 *
 * @example
 * const mutation = useSharePropertyMediaWithClient();
 * mutation.mutate({ clientId: 2, propertyId: 1 });
 */
export function useSharePropertyMediaWithClient() {
  return useMutation<
    PropertyMediaShareResponse,
    Error,
    { clientId: string | number; propertyId: string | number }
  >({
    mutationFn: (params) => sharePropertyMediaWithClient(params),
  });
}

/**
 * Mutation to revoke a shared property media record.
 *
 * POST /api/agent/v1/agent/properties/shared-media/:sharingId/revoke
 *
 * @example
 * const mutation = useRevokePropertyMediaShare();
 * mutation.mutate('4');
 */
export function useRevokePropertyMediaShare() {
  return useMutation<PropertyMediaShareResponse, Error, string | number>({
    mutationFn: (sharingId) => revokePropertyMediaShare(sharingId),
  });
}

/**
 * Checks whether property media is shared with a specific client.
 *
 * GET /api/agent/v1/agent/properties/shared-media/status/:clientId/:propertyId
 *
 * Returns `true` if currently shared, `false` otherwise.
 * Stale time of 30 s — mirrors other media hooks.
 * Set `enabled: false` until both IDs are available.
 *
 * @example
 * const { data: isShared } = usePropertyMediaShareStatus(clientId, propertyId);
 */
export function usePropertyMediaShareStatus(
  clientId: string | number,
  propertyId: string | number,
  options?: { enabled?: boolean },
) {
  return useQuery<boolean, Error>({
    queryKey: agentQueryKeys.propertyMediaShareStatus(clientId, propertyId),
    queryFn:  () => fetchPropertyMediaShareStatus(clientId, propertyId),
    staleTime: 1000 * 30,
    enabled:   (options?.enabled ?? true) && !!clientId && !!propertyId,
  });
}


// ─── Convenience address selectors ───────────────────────────────────────────

/**
 * Finds the HOME or WORK entry from an AgentMe.addresses array.
 * Returns `undefined` if not present — callers should fall back to EMPTY_ADDRESS.
 */
export function findAddress(
  addresses: AgentAddress[],
  type: 'HOME' | 'WORK',
): AgentAddress | undefined {
  return addresses.find((a) => a.addressType === type);
}



// ─── Recommendation types ─────────────────────────────────────────────────────

export interface RecommendationScoreComponent {
  key:          string;
  label:        string;
  category:     string;
  priorityTier: string;
  score:        number;
  available:    boolean;
  matched:      boolean;
  status?:      'MATCH' | 'PARTIAL' | 'MISMATCH' | 'UNKNOWN';
}

/** Score breakdown for a single recommendation. */
export interface RecommendationScore {
  rankPosition:    number;
  overallScore:    number;
  confidenceScore: number;
  recommendationType: 'BEST_MATCH' | 'CLOSEST_ALTERNATIVE';
  qualityBand: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'ALTERNATIVE';
  components:       RecommendationScoreComponent[];
  matchReason:     string;
  highlights:      string[];
  dealBreakers:    string[];
  calculatedAt:    string;
}

/** Single photo / media entry inside a recommended property. */
export interface RecommendationPropertyPhoto {
  id:            string;
  url:           string;
  caption:       string | null;
  displayOrder:  number;
  mediaCategory: string;
  isPreferred:   boolean;
}

/** Property data embedded in each recommendation item. */
export interface RecommendationProperty {
  id:           number;
  address:      string;
  price:        number;
  bedrooms:     number;
  bathrooms:    number;
  city:         string;
  province:     string;
  propertyType: string;
  imageUrl:     string | null;
  location:     string;
  latitude:     number;
  longitude:    number;
  photos:       RecommendationPropertyPhoto[];
}

/** Single item in the recommendations list (recommendation + property). */
export interface RecommendationItem {
  recommendation: RecommendationScore;
  property:       RecommendationProperty;
}

/** Paginated response from GET /api/client/v1/client/recommendations */
export interface RecommendationsPage {
  page:           number;
  size:           number;
  totalPages:     number;
  totalElements:  number;
  defaultMinScore: number;
  items:          RecommendationItem[];
  generatedAt:    string;
}

/** Optional filters for useClientRecommendations. */
export interface RecommendationsParams {
  page?:         number;
  size?:         number;
  minScore?:     number;
  city?:         string;
  propertyType?: string;
}

// ─── Recommendation query keys ────────────────────────────────────────────────

export const recommendationQueryKeys = {
  all:  ['clientRecommendations'] as const,
  list: (params: RecommendationsParams) =>
    ['clientRecommendations', params] as const,
};

// ─── Recommendation fetcher ───────────────────────────────────────────────────

async function fetchClientRecommendations(
  params: RecommendationsParams,
): Promise<RecommendationsPage> {
  const { data } = await api.get<RecommendationsPage>(
    clientRecommendationsPath(params),
  );
  return data;
}

// ─── Recommendation hook ──────────────────────────────────────────────────────

/**
 * Fetches AI-powered property recommendations for the logged-in client.
 *
 * GET /api/client/v1/client/recommendations?page=0&size=10&city=...&propertyType=...
 *
 * Results are keyed by the full params object so different page/filter
 * combinations are cached independently.
 *
 * @example
 * const { data, isLoading } = useClientRecommendations({ page: 0, size: 10 });
 * data?.items.forEach(({ recommendation, property }) => { ... });
 */
export function useClientRecommendations(
  params: RecommendationsParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery<RecommendationsPage, Error>({
    queryKey: recommendationQueryKeys.list(params),
    queryFn:  () => fetchClientRecommendations(params),
    staleTime: 1000 * 60 * 5, // 5 min — scores recalculate in background
    enabled:   options?.enabled ?? true,
  });
}
