/**
 * locationApi.ts
 *
 * Catalog location suggestion APIs (areas, municipalities, communities, resolve).
 * Uses the shared `api` axios instance; endpoints are public under search-service.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { API_GLOBAL_PATHS } from './apiGlobalPaths';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LocationSuggestionItem {
  type:             string;
  label:            string;
  city:             string | null;
  cityRegion:       string | null;
  subdivisionName:  string | null;
  province:         string | null;
  country:          string | null;
  listingCount:     number;
}

export interface LocationSuggestionList {
  items: LocationSuggestionItem[];
}

export interface LocationSearchFilters {
  cityRegion:       string | null;
  city:             string | null;
  subdivisionName:  string | null;
  province:         string | null;
  country:          string | null;
}

export interface LocationResolveResult {
  searchFilters: LocationSearchFilters;
  listingCount:  number;
}

export type LocationSuggestionKind = 'areas' | 'municipalities' | 'communities';

export interface LocationSearchParams {
  province?:      string;
  area?:            string | string[];
  municipality?:    string | string[];
  community?:       string | string[];
  q?:               string;
  limit?:           number;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const locationQueryKeys = {
  all:           ['locations'] as const,
  suggestions:   (kind: LocationSuggestionKind, params: LocationSearchParams) =>
    ['locations', kind, params] as const,
  resolve:       (params: LocationSearchParams) =>
    ['locations', 'resolve', params] as const,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function appendListParam(qs: URLSearchParams, key: string, values?: string | string[]) {
  if (values == null) return;
  const list = Array.isArray(values) ? values : [values];
  for (const value of list) {
    const trimmed = value.trim();
    if (trimmed) qs.append(key, trimmed);
  }
}

function buildQueryString(params: LocationSearchParams): string {
  const qs = new URLSearchParams();
  if (params.province) qs.set('province', params.province);
  appendListParam(qs, 'area', params.area);
  appendListParam(qs, 'municipality', params.municipality);
  if (params.q) qs.set('q', params.q);
  qs.set('limit', String(params.limit ?? 200));
  return qs.toString();
}

function hasMunicipalityFilter(municipality?: string | string[]): boolean {
  if (municipality == null) return false;
  const list = Array.isArray(municipality) ? municipality : [municipality];
  return list.some(value => value.trim().length > 0);
}

function firstParamValue(value?: string | string[]): string | undefined {
  if (value == null) return undefined;
  const list = Array.isArray(value) ? value : [value];
  return list.map(item => item.trim()).find(Boolean);
}

// ─── Raw API functions ────────────────────────────────────────────────────────

export function fetchLocationAreas(
  params: LocationSearchParams = {},
): Promise<LocationSuggestionList> {
  return api
    .get<LocationSuggestionList>(
      `${API_GLOBAL_PATHS.catalogLocationAreas}?${buildQueryString(params)}`,
    )
    .then(r => r.data);
}

export function fetchLocationMunicipalities(
  params: LocationSearchParams = {},
): Promise<LocationSuggestionList> {
  return api
    .get<LocationSuggestionList>(
      `${API_GLOBAL_PATHS.catalogLocationMunicipalities}?${buildQueryString(params)}`,
    )
    .then(r => r.data);
}

export function fetchLocationCommunities(
  params: LocationSearchParams & { municipality: string | string[] },
): Promise<LocationSuggestionList> {
  return api
    .get<LocationSuggestionList>(
      `${API_GLOBAL_PATHS.catalogLocationCommunities}?${buildQueryString(params)}`,
    )
    .then(r => r.data);
}

export function fetchLocationResolve(
  params: LocationSearchParams & { municipality: string | string[] },
): Promise<LocationResolveResult> {
  const qs = new URLSearchParams();
  const area = firstParamValue(params.area);
  const municipality = firstParamValue(params.municipality);
  const community = firstParamValue(params.community);
  if (area)          qs.set('area', area);
  if (municipality)  qs.set('municipality', municipality);
  if (community)     qs.set('community', community);
  if (params.province)      qs.set('province', params.province);
  return api
    .get<LocationResolveResult>(
      `${API_GLOBAL_PATHS.catalogLocationResolve}?${qs.toString()}`,
    )
    .then(r => r.data);
}

// ─── React Query hooks ────────────────────────────────────────────────────────

export function useLocationSuggestions(
  kind: LocationSuggestionKind,
  params: LocationSearchParams,
  options?: { enabled?: boolean },
) {
  const enabled =
    (options?.enabled ?? true) &&
    (kind !== 'communities' || hasMunicipalityFilter(params.municipality));

  return useQuery<LocationSuggestionList, Error>({
    queryKey: locationQueryKeys.suggestions(kind, params),
    queryFn: () => {
      if (kind === 'areas') return fetchLocationAreas(params);
      if (kind === 'municipalities') return fetchLocationMunicipalities(params);
      return fetchLocationCommunities({
        ...params,
        municipality: params.municipality!,
      });
    },
    staleTime: 60_000,
    enabled,
  });
}
