/**
 * Path prefixes for the Showing Trail backend (see Showing Trail-Service / nginx.conf).
 * Origin only is configured via EXPO_PUBLIC_API_URL; paths are absolute from origin.
 */
export const API_GLOBAL_PATHS = {
  portalPublicSession: '/api/portal/v1/public/session',
  clientPublicClients: '/api/client/v1/public/clients',
  clientSession: '/api/client/v1/client',
  clientProfile: '/api/client/v1/client/profile',
  clientProfileImageUploadUrl: '/api/client/v1/client/profile/upload-url',
  clientPreferences: '/api/client/v1/client/preferences',
  /** Client JWT — preference screen catalog (entry definitions, tiers, option labels). */
  clientPreferencesCatalog: '/api/client/v1/client/preferences/catalog',
  agentPublicAgents: '/api/agent/v1/public/agents',
  agentSession: '/api/agent/v1/agent',
  agentProfile: '/api/agent/v1/agent/profile',
  agentClients: '/api/client/v1/agent/clients',
  /** Client JWT — own shortlist (estateflow-client-service). */
  clientShortlists: '/api/client/v1/client/shortlists',
  brokerSession: '/api/broker/v1/broker/session',
  brokerSettings: '/api/broker/v1/broker/settings',
  brokerSettingsLogoUploadUrl: '/api/broker/v1/broker/settings/logo/upload-url',
  brokerAgents: '/api/broker/v1/broker/agents',
  brokerAgentInvites: '/api/broker/v1/broker/agent-invites',
  /** Broker JWT — dashboard KPIs (estateflow-brokerage-service). */
  brokerStats: '/api/broker/v1/broker/stats',
  /** Master MLS catalog (estateflow-client-service → estateflow_master). Used by default React Query `queryFn`. */
  catalogProperties: '/api/properties',
  /** Master MLS catalog — filtered search endpoint (estateflow-client-service). */
  catalogPropertiesSearch: '/api/properties/search',
  /** Master MLS catalog — location suggestions (estateflow-search-service). */
  catalogLocationAreas: '/api/properties/search/locations/areas',
  catalogLocationMunicipalities: '/api/properties/search/locations/municipalities',
  catalogLocationCommunities: '/api/properties/search/locations/communities',
  catalogLocationResolve: '/api/properties/search/locations/resolve',
  /** Client JWT — list / detail / stops (estateflow-client-service, broker-tenant DB). */
  clientTours: '/api/client/v1/client/tours',
  /** Agent JWT — tour CRUD, stops, complete, distance (estateflow-brokerage-agent-service). */
  agentTours: '/api/agent/v1/agent/tours',
  /** Client JWT — list/create/detail showing requests (estateflow-client-service). */
  clientShowingRequests: '/api/client/v1/client/showing-requests',
  /** Agent JWT — list/detail, PATCH .../status (estateflow-brokerage-agent-service). */
  agentShowingRequests: '/api/agent/v1/agent/showing-requests',
  /** Client JWT — dashboard KPIs (estateflow-client-service). */
  clientStats: '/api/client/v1/client/stats',
  /** Agent JWT — dashboard KPIs (estateflow-brokerage-agent-service; legacy replacement for GET /api
   * ). */
  agentStats: '/api/agent/v1/agent/stats',
  /** Agent JWT — branding settings (estateflow-brokerage-agent-service). */
  agentBrandingSettings: '/api/agent/v1/agent/settings/branding',
  agentBrandingUploadUrl: '/api/agent/v1/agent/settings/branding/upload-url',
  /** Agent JWT — branding settings (estateflow-brokerage-agent-service). */
  OfferApi: '/api/agent/v1/agent/offers',
  /** Client JWT — list / detail offers (estateflow-client-service). */
  clientOffers: '/api/client/v1/client/offers',
  /** Notification event service — agent inbox (ROLE_AGENT). */
  notificationsAgentInbox: '/api/notifications/v1/agent/inbox',
  /** Notification event service — client inbox (ROLE_CLIENT). */
  notificationsClientInbox: '/api/notifications/v1/client/inbox',
  /** SockJS STOMP endpoint (via api-gateway). */
  notificationsWs: '/api/notifications/ws',
  /** Agent JWT — chat REST (estateflow-notification-event-service). */
  chatAgentConversations: '/api/chat/v1/agent/conversations',
  chatAgentDirectConversation: '/api/chat/v1/agent/conversations/direct',
  chatAgentGroupConversation: '/api/chat/v1/agent/conversations/group',
  /** Client JWT — chat REST (estateflow-notification-event-service). */
  chatClientConversations: '/api/chat/v1/client/conversations',
  chatClientDirectConversation: '/api/chat/v1/client/conversations/direct',
  /** Client JWT — list / create ratings (estateflow-client-service). */
  clientRatings: '/api/client/v1/client/ratings',
  /** Client JWT — rating summary with unreviewed completed tours (estateflow-client-service). */
  clientRatingsSummary: '/api/client/v1/client/ratings/summary',
  /** Client JWT — AI-powered property recommendations (estateflow-client-service). */
  clientRecommendations: '/api/client/v1/client/recommendations',
} as const;

/** @see API_GLOBAL_PATHS.agentClients */
export const agentClientShortlistsPath = (clientProfileId: string | number) =>
  `/api/client/v1/agent/clients/${clientProfileId}/shortlists`;

/**
 * Agent JWT — preferences catalog (entry definitions, tiers, option labels).
 * GET /api/client/v1/agent/clients/preferences/catalog
 */
export const agentClientPreferencesCatalogPath =
  '/api/client/v1/agent/clients/preferences/catalog' as const;

/**
 * Agent JWT — full-replace preferences for a client (all tiers in one request).
 * PUT /api/client/v1/agent/clients/:clientProfileId/preferences
 */
export const agentClientPreferencesPath = (clientProfileId: string | number) =>
  `/api/client/v1/agent/clients/${clientProfileId}/preferences` as const;

/** Agent JWT — save a single preference tier section for a client (estateflow-client-service). */
export const agentClientPreferencesSectionPath = (
  clientProfileId: string | number,
  preferenceTier: string,
) => `/api/client/v1/agent/clients/${clientProfileId}/preferences/sections/${preferenceTier}`;

/** Agent JWT — per-client stats (estateflow-brokerage-agent-service). */
export const agentClientStatsPath = (clientProfileId: string | number) =>
  `/api/client/v1/agent/clients/${clientProfileId}/stats`;

/** @see API_GLOBAL_PATHS.catalogProperties */
export const catalogPropertyPath = (id: string | number) => `/api/properties/search/${id}`;

export const catalogPropertyPhotosPath = (id: string | number) => `/api/properties/search/${id}/photos`;

export const catalogPropertyReviewsPath = (id: string | number) => `/api/properties/${id}/reviews`;

/** Client JWT — single showing request detail incl. requestedProperties (estateflow-client-service). */
export const clientShowingRequestPath = (showingRequestId: string) =>
  `/api/client/v1/client/showing-requests/${showingRequestId}`;

/** Client JWT — single offer detail (estateflow-client-service). */
export const clientOfferPath = (offerId: string) =>
  `/api/client/v1/client/offers/${offerId}`;

/** Client JWT — single rating detail / update (estateflow-client-service). */
export const clientRatingPath = (ratingId: string) =>
  `/api/client/v1/client/ratings/${ratingId}`;

/** Client JWT — list ratings filtered by property and/or tour (estateflow-client-service). */
export const clientRatingsListPath = (params: {
  masterPropertyId?: string | number;
  tourId?: string;
}) => {
  const query = new URLSearchParams();
  if (params.masterPropertyId !== undefined)
    query.set('masterPropertyId', String(params.masterPropertyId));
  if (params.tourId !== undefined) query.set('tourId', params.tourId);
  const qs = query.toString();
  return `/api/client/v1/client/ratings${qs ? `?${qs}` : ''}`;
};

/** Client JWT — single saved property (shortlist entry) by masterPropertyId (estateflow-client-service). */
export const clientShortlistPath = (masterPropertyId: string | number) =>
  `/api/client/v1/client/shortlists/${masterPropertyId}`;


/** Client JWT — list media for a single property shared by agent (estateflow-client-service). */
export const clientPropertyMediaPath = (propertyId: string | number) =>
  `/api/client/v1/client/properties/${propertyId}/media`;

/** Client JWT — list media for ALL agent-shared properties (estateflow-client-service). */
export const clientAllPropertiesMediaPath =
  '/api/client/v1/client/properties/all-media' as const;



export const brokerAgentClientsPath = (
  agentId: string | number,
  page?: number,
  size?: number,
) => {
  const params = new URLSearchParams();
  if (page !== undefined) params.set('page', String(page));
  if (size !== undefined) params.set('size', String(size));
  const query = params.toString();
  return `/api/broker/v1/broker/agents/${agentId}/clients${query ? `?${query}` : ''}`;
};

/** Broker JWT — dashboard KPIs for a specific agent under the brokerage. */
export const brokerAgentStatsPath = (agentId: string | number) =>
  `/api/broker/v1/broker/agents/${agentId}/stats`;

/** Agent JWT — single offer detail (estateflow-brokerage-agent-service). */
export const agentOfferPath = (offerId: string) =>
  `/api/agent/v1/agent/offers/${offerId}`;

/** Agent JWT — share stats with a client (estateflow-brokerage-agent-service). */
export const agentStatsShareWithClientPath = (
  clientProfileId: string | number,
  shareFlags: boolean,
) => {
  const params = new URLSearchParams();
  params.set('clientId', String(clientProfileId));
  params.set('shareFlags', String(shareFlags));
  return `/api/agent/v1/agent/stats/share-with-client?${params.toString()}`;
};

// ─── Property Media paths ─────────────────────────────────────────────────────

/** Agent JWT — generate pre-signed upload URLs for one or more media files. */
export const agentPropertyMediaUploadUrlPath = (propertyId: string | number) =>
  `/api/agent/v1/agent/properties/${propertyId}/media/upload-url`;

/**
 * Agent JWT — list all media (images + videos) grouped by property.
 * GET /api/agent/v1/agent/properties/:propertyId/media
 * Returns an array: PropertyMediaListResponse[]
 */
export const agentPropertyMediaPath = (propertyId: string | number) =>
  `/api/agent/v1/agent/properties/${propertyId}/media`;

/** Agent JWT — confirm a single media upload by mediaId. */
export const agentPropertyMediaConfirmPath = (
  propertyId: string | number,
  mediaId: string | number,
) => `/api/agent/v1/agent/properties/${propertyId}/media/${mediaId}/confirm`;

/** Agent JWT — check whether property media is shared with a specific client. */
export const agentPropertyMediaShareStatusPath = (
  clientId: string | number,
  propertyId: string | number,
) => `/api/agent/v1/agent/properties/shared-media/status/${clientId}/${propertyId}`;

/** Agent JWT — bulk-confirm multiple media uploads. */
export const agentPropertyMediaBulkConfirmPath = (propertyId: string | number) =>
  `/api/agent/v1/agent/properties/${propertyId}/media/confirm`;

/** Agent JWT — bulk-delete media items. */
export const agentPropertyMediaBulkDeletePath = (propertyId: string | number) =>
  `/api/agent/v1/agent/properties/${propertyId}/media/delete`;

/** Agent JWT — share property media with a client. */
export const agentPropertyMediaSharePath = (params: {
  clientId: string | number;
  propertyId: string | number;
}) => {
  const query = new URLSearchParams();
  query.set('clientId', String(params.clientId));
  query.set('propertyId', String(params.propertyId));
  return `/api/agent/v1/agent/properties/shared-media?${query.toString()}`;
};

/** Agent JWT — revoke a shared-media record by sharingId. */
export const agentPropertyMediaRevokePath = (sharingId: string | number) =>
  `/api/agent/v1/agent/properties/shared-media/${sharingId}/revoke`;

/** Agent JWT — route plan for a specific tour (estateflow-brokerage-agent-service). */
export const agentTourRoutePath = (tourId: string) =>
  `/api/agent/v1/agent/tours/${tourId}/route` as const;



/** Agent JWT — paginated offer list with optional filters (estateflow-brokerage-agent-service). */
export const agentOffersPath = (params: {
  page?:            number;
  size?:            number;
  status?:          string;
  clientProfileId?: string | number;
}) => {
  const query = new URLSearchParams();
  if (params.page             !== undefined) query.set('page',            String(params.page));
  if (params.size             !== undefined) query.set('size',            String(params.size));
  if (params.status           !== undefined) query.set('status',          params.status);
  if (params.clientProfileId  !== undefined) query.set('clientProfileId', String(params.clientProfileId));
  const qs = query.toString();
  return `/api/agent/v1/agent/offers${qs ? `?${qs}` : ''}`;
};




/**
 * Client JWT — paginated AI recommendations with optional city / propertyType filters.
 * GET /api/client/v1/client/recommendations?page=0&size=10&city=...&propertyType=...
 */
export const clientRecommendationsPath = (params: {
  page?: number;
  size?: number;
  minScore?: number;
  city?: string;
  propertyType?: string;
}) => {
  const query = new URLSearchParams();
  if (params.page          !== undefined) query.set('page',         String(params.page));
  if (params.size          !== undefined) query.set('size',         String(params.size));
  if (params.minScore      !== undefined) query.set('minScore',     String(params.minScore));
  if (params.city          !== undefined) query.set('city',         params.city);
  if (params.propertyType  !== undefined) query.set('propertyType', params.propertyType);
  const qs = query.toString();
  return `${'/api/client/v1/client/recommendations'}${qs ? `?${qs}` : ''}`;
};
