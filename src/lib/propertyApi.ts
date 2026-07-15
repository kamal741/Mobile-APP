/**
 * propertyApi.ts
 *
 * All property-search API calls, types, query keys, and React Query hooks.
 * Uses the shared `api` axios instance (./api.ts) which automatically
 * attaches the Bearer token from SecureStore on every request.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { API_GLOBAL_PATHS, catalogPropertyPath } from './apiGlobalPaths';

// ─── Types ────────────────────────────────────────────────────────────────────


export interface PropertyPhoto {
  id: string;
  url: string;
  caption?: string;
  displayOrder: number | null;
  mediaCategory: string | null;
  isPreferred: boolean | null;
}

export interface PropertySearchItem {
  id:                  number;
  address:             string;
  price:               number;
  bedrooms:            number;
  bathrooms:           number;
  area:                number;
  city:                string;
  province:            string;
  propertyType:        string;
  imageUrl:            string | null;
  photos:              PropertyPhoto[];          // ← add this
  mlsNumber:           string | null;
  distanceKm:          number | null;
  drivingDistanceKm:   number | null;
  drivingDurationSec:  number | null;
}

export interface PropertySearchPage {
  items:         PropertySearchItem[];
  page:          number;
  size:          number;
  totalElements: number;
  totalPages:    number;
}

export type FireplaceFilter = '' | 'yes' | 'no';

/** Browse-page filter state (string fields for TextInput binding). */
export type PropertyFilters = {
  minPrice: string;
  maxPrice: string;
  minBeds: string;
  minBaths: string;
  city: string;
  postalCode: string;
  province: string;
  cityRegion: string;
  subdivisionName: string;
  propertyTypes: string[];
  minParking: string;
  basement: string;
  fireplace: FireplaceFilter;
  minArea: string;
  maxArea: string;
  minLotFront: string;
  minLotDepth: string;
  minYearBuilt: string;
  maxYearBuilt: string;
  minSchoolRating: string;
};

export const PROPERTY_TYPE_OPTIONS = [
  'Detached',
  'Semi-Detached',
  'Freehold Townhouse',
  'Condo Townhouse',
  'Condo Apt',
  'Link',
  'Multiplex',
  'Vacant Land',
  'Other',
] as const;

export const BASEMENT_FILTER_OPTIONS = [
  { label: 'Any', value: '' },
  { label: 'Finished', value: 'Finished' },
  { label: 'Separate Entrance', value: 'Separate Entrance' },
  { label: 'Walk-out', value: 'Walk-out' },
] as const;

export const PARKING_FILTER_OPTIONS = [
  { label: 'Any', value: '' },
  { label: '1+', value: '1' },
  { label: '2+', value: '2' },
  { label: '3+', value: '3' },
  { label: '4+', value: '4' },
  { label: '5+', value: '5' },
] as const;

export const FIREPLACE_FILTER_OPTIONS = [
  { label: 'Any', value: '' as FireplaceFilter },
  { label: 'Yes', value: 'yes' as FireplaceFilter },
  { label: 'No', value: 'no' as FireplaceFilter },
] as const;

export const EMPTY_PROPERTY_FILTERS: PropertyFilters = {
  minPrice: '',
  maxPrice: '',
  minBeds: '',
  minBaths: '',
  city: '',
  postalCode: '',
  province: '',
  cityRegion: '',
  subdivisionName: '',
  propertyTypes: [],
  minParking: '',
  basement: '',
  fireplace: '',
  minArea: '',
  maxArea: '',
  minLotFront: '',
  minLotDepth: '',
  minYearBuilt: '',
  maxYearBuilt: '',
  minSchoolRating: '',
};

export interface PropertySearchParams {
  minPrice?:         number;
  maxPrice?:         number;
  bedrooms?:         number;
  bathrooms?:        number;
  /** Free-text query matched by server-side search term. */
  searchTerm?:       string;
  city?:             string;
  postalCode?:       string;
  province?:         string;
  cityRegion?:       string;
  subdivisionName?:  string;
  propertyType?:     string[];
  minParking?:       number;
  basement?:         string;
  fireplace?:        boolean;
  minArea?:          number;
  maxArea?:          number;
  minLotFront?:      number;
  minLotDepth?:      number;
  minYearBuilt?:     number;
  maxYearBuilt?:     number;
  minSchoolRating?:  number;
  page?:             number;
  size?:             number;
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalInt(value: string): number | undefined {
  const parsed = parseOptionalNumber(value);
  if (parsed === undefined) return undefined;
  return Math.trunc(parsed);
}

function parseSchoolRating(value: string): number | undefined {
  const parsed = parseOptionalNumber(value);
  return parsed === undefined ? undefined : Math.min(10, Math.max(0, parsed));
}

function appendQueryValues(qs: URLSearchParams, key: string, values?: string[]) {
  if (!values?.length) return;
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed) qs.append(key, trimmed);
  }
}

export function countActivePropertyFilters(filters: PropertyFilters): number {
  let count = 0;
  if (filters.minPrice.trim()) count += 1;
  if (filters.maxPrice.trim()) count += 1;
  if (filters.minBeds.trim()) count += 1;
  if (filters.minBaths.trim()) count += 1;
  if (filters.city.trim()) count += 1;
  if (filters.postalCode.trim()) count += 1;
  if (filters.province.trim()) count += 1;
  if (filters.cityRegion.trim()) count += 1;
  if (filters.subdivisionName.trim()) count += 1;
  if (filters.propertyTypes.length > 0) count += 1;
  if (filters.minParking.trim()) count += 1;
  if (filters.basement.trim()) count += 1;
  if (filters.fireplace) count += 1;
  if (filters.minArea.trim()) count += 1;
  if (filters.maxArea.trim()) count += 1;
  if (filters.minLotFront.trim()) count += 1;
  if (filters.minLotDepth.trim()) count += 1;
  if (filters.minYearBuilt.trim()) count += 1;
  if (filters.maxYearBuilt.trim()) count += 1;
  if (filters.minSchoolRating.trim()) count += 1;
  return count;
}

export function arePropertyFiltersEqual(a: PropertyFilters, b: PropertyFilters): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function buildPropertySearchParams(
  filters: PropertyFilters,
  options: { searchTerm?: string; page?: number; size?: number } = {},
): PropertySearchParams {
  const fireplace =
    filters.fireplace === 'yes' ? true : filters.fireplace === 'no' ? false : undefined;

  return {
    searchTerm: options.searchTerm,
    minPrice: parseOptionalNumber(filters.minPrice),
    maxPrice: parseOptionalNumber(filters.maxPrice),
    bedrooms: parseOptionalInt(filters.minBeds),
    bathrooms: parseOptionalInt(filters.minBaths),
    city: filters.city.trim() || undefined,
    postalCode: filters.postalCode.trim() || undefined,
    province: filters.province.trim() || undefined,
    cityRegion: filters.cityRegion.trim() || undefined,
    subdivisionName: filters.subdivisionName.trim() || undefined,
    propertyType: filters.propertyTypes.length > 0 ? [...filters.propertyTypes] : undefined,
    minParking: parseOptionalInt(filters.minParking),
    basement: filters.basement.trim() || undefined,
    fireplace,
    minArea: parseOptionalNumber(filters.minArea),
    maxArea: parseOptionalNumber(filters.maxArea),
    minLotFront: parseOptionalNumber(filters.minLotFront),
    minLotDepth: parseOptionalNumber(filters.minLotDepth),
    minYearBuilt: parseOptionalInt(filters.minYearBuilt),
    maxYearBuilt: parseOptionalInt(filters.maxYearBuilt),
    minSchoolRating: parseSchoolRating(filters.minSchoolRating),
    page: options.page,
    size: options.size,
  };
}

export interface PropertyDetail {
  id:            number;
  address:       string;
  city:          string;
  province:      string;
  price:         number;
  bedrooms:      number;
  bathrooms:     number;
  squareFootage: number;
  imageUrl:      string | null;
  mlsNumber:     string;
  propertyType:  string;
  latitude:      number;
  longitude:     number;
  description:   string | null;
  yearBuilt:     number | null;
  lotSize:       number | null;
  features:      string[];
  photos:        PropertyPhoto[];
  rooms?:        PropertyRoom[];
  details?:      PropertyExtendedDetails | null;
  keyFacts?:     PropertyKeyFacts | null;
}

export interface PropertyRoom {
  name:        string | null;
  dimensions: string | null;
  level:       string | null;
  features:    string[];
}

export interface PropertyExtendedDetails {
  propertyType:       string | null;
  style:              string | null;
  frontingOn:         string | null;
  community:          string | null;
  municipality:       string | null;
  bedrooms:           number | null;
  bathrooms:          number | null;
  bathroomsDetail:    string[];
  basementType:       string | null;
  kitchens:           number | string | null;
  rooms:              number | string | null;
  familyRoom:         string | boolean | null;
  fireplace:          boolean | null;
  water:              string | null;
  cooling:            string | null;
  heatingType:        string | null;
  heatingFuel:        string | null;
  size:               string | number | null;
  construction:       string[];
  driveway:           string | null;
  garageType:         string | null;
  garage:             string | number | null;
  parkingPlaces:      number | null;
  totalParkingSpace:  number | null;
  propertyFeatures:   string[];
  sewer:              string | null;
  frontage:           string | number | null;
  depth:              string | number | null;
  lotSize:            string | number | null;
  lotSizeCode:        string | null;
  crossStreet:        string | null;
}

export interface PropertyKeyFacts {
  tax:                  string | number | null;
  propertyType:         string | null;
  buildingAge:          string | number | null;
  size:                 string | null;
  lotSize:              string | number | null;
  parking:              string | null;
  basement:             string | null;
  listingNumber:        string | null;
  dataSource:           string | null;
  listingBrokerage:     string | null;
  daysOnMarket:         number | string | null;
  propertyDaysOnMarket: number | string | null;
  statusChange:         string | null;
  listedOn:             string | null;
  updatedOn:            string | null;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const propertyQueryKeys = {
  all:    ['properties'] as const,
  search: (params: PropertySearchParams) => ['properties', 'search', params] as const,
  detail: (id: string | number)          => ['properties', 'detail', id]     as const,
};

// ─── Raw API functions ────────────────────────────────────────────────────────

export function fetchPropertySearch(
  params: PropertySearchParams = {},
): Promise<PropertySearchPage> {
  const {
    minPrice,
    maxPrice,
    bedrooms,
    bathrooms,
    searchTerm,
    city,
    postalCode,
    province,
    cityRegion,
    subdivisionName,
    propertyType,
    minParking,
    basement,
    fireplace,
    minArea,
    maxArea,
    minLotFront,
    minLotDepth,
    minYearBuilt,
    maxYearBuilt,
    minSchoolRating,
    page = 0,
    size = 20,
  } = params;

  const qs = new URLSearchParams();
  qs.set('page', String(page));
  qs.set('size', String(size));

  if (minPrice        !== undefined) qs.set('minPrice',        String(minPrice));
  if (maxPrice        !== undefined) qs.set('maxPrice',        String(maxPrice));
  if (bedrooms        !== undefined) qs.set('bedrooms',        String(bedrooms));
  if (bathrooms       !== undefined) qs.set('bathrooms',       String(bathrooms));
  if (searchTerm)                      qs.set('searchTerm',      searchTerm);
  if (city)                            qs.set('city',            city);
  if (postalCode)                      qs.set('postalCode',      postalCode);
  if (province)                        qs.set('province',        province);
  if (cityRegion)                      qs.set('cityRegion',      cityRegion);
  if (subdivisionName)                 qs.set('subdivisionName', subdivisionName);
  appendQueryValues(qs, 'propertyType', propertyType);
  if (minParking      !== undefined) qs.set('minParking',      String(minParking));
  if (basement)                        qs.set('basement',        basement);
  if (fireplace       !== undefined) qs.set('fireplace',       String(fireplace));
  if (minArea         !== undefined) qs.set('minArea',         String(minArea));
  if (maxArea         !== undefined) qs.set('maxArea',         String(maxArea));
  if (minLotFront     !== undefined) qs.set('minLotFront',     String(minLotFront));
  if (minLotDepth     !== undefined) qs.set('minLotDepth',     String(minLotDepth));
  if (minYearBuilt    !== undefined) qs.set('minYearBuilt',    String(minYearBuilt));
  if (maxYearBuilt    !== undefined) qs.set('maxYearBuilt',    String(maxYearBuilt));
  if (minSchoolRating !== undefined) qs.set('minSchoolRating', String(minSchoolRating));

  return api
    .get<PropertySearchPage>(`${API_GLOBAL_PATHS.catalogPropertiesSearch}?${qs.toString()}`)
    .then((r) => r.data);
}

// ─── React Query hooks ────────────────────────────────────────────────────────

export function usePropertySearch(
  params: PropertySearchParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery<PropertySearchPage, Error>({
    queryKey: propertyQueryKeys.search(params),
    queryFn:  () => fetchPropertySearch(params),
    staleTime: 1000 * 60 * 2,
    placeholderData: (prev) => prev,
    enabled:   options?.enabled ?? true,
  });
}

// ─── Property detail ──────────────────────────────────────────────────────────

export function fetchPropertyById(
  propertyId: string | number,
): Promise<PropertyDetail> {
  return api
    .get<PropertyDetail>(catalogPropertyPath(propertyId))
    .then((r) => r.data);
}

export function usePropertyDetail(
  propertyId: string | number | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery<PropertyDetail, Error>({
    queryKey: propertyQueryKeys.detail(propertyId!),
    queryFn:  () => fetchPropertyById(propertyId!),
    staleTime: 1000 * 60 * 5,
    enabled:  (options?.enabled ?? true) && propertyId !== undefined,
  });
}
