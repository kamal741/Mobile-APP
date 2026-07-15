import { useQuery } from '@tanstack/react-query';
import { apiRequest } from './api';

export interface AdministrativeAreaMetadata {
  id: number;
  name: string;
  stateCode: string;
  isoCode?: string | null;
  areaType?: string | null;
  active?: boolean | null;
  displayOrder?: number | null;
}

export interface CountryMetadata {
  id: number;
  name: string;
  isoCode: string;
  phoneCode?: string | null;
  phoneExample?: string | null;
  currency?: string | null;
  active?: boolean | null;
  displayOrder?: number | null;
  administrativeAreaLabel?: string | null;
  states?: AdministrativeAreaMetadata[] | null;
  administrativeAreas?: AdministrativeAreaMetadata[] | null;
}

export interface LocationMetadata {
  countries: CountryMetadata[];
  cacheTtlSeconds: number;
  version: string;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function fetchLocationMetadata(): Promise<LocationMetadata> {
  return apiRequest<LocationMetadata>('GET', '/api/search/v1/public/location-metadata');
}

export async function fetchCountries(): Promise<CountryMetadata[]> {
  return apiRequest<CountryMetadata[]>('GET', '/api/search/v1/public/countries');
}

export function useLocationMetadata() {
  return useQuery<LocationMetadata, Error>({
    queryKey: ['location-metadata'],
    queryFn: fetchLocationMetadata,
    staleTime: ONE_DAY_MS,
    gcTime: ONE_DAY_MS * 2,
  });
}

export function useCountries() {
  return useQuery<CountryMetadata[], Error>({
    queryKey: ['countries'],
    queryFn: fetchCountries,
    staleTime: ONE_DAY_MS,
    gcTime: ONE_DAY_MS * 2,
  });
}

export function getAdministrativeAreas(country?: CountryMetadata | null): AdministrativeAreaMetadata[] {
  return country?.administrativeAreas ?? country?.states ?? [];
}

export function findCountryByCode(countries: CountryMetadata[] | undefined, countryCode?: string | null) {
  const normalized = countryCode?.trim().toUpperCase() || 'CA';
  return countries?.find((country) => country.isoCode?.toUpperCase() === normalized) ?? null;
}
