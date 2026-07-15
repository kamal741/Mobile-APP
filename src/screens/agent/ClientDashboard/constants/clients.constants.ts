import { agentClientShortlistsPath } from '../../../../lib/apiGlobalPaths';
import { FilterType } from '../types/client.types';

export const QUERY_KEYS = {
  agentClients: ['agent-clients'] as const,
};

export const FILTER_OPTIONS: { label: string; value: FilterType }[] = [
  { label: 'All Types', value: 'all' },
  { label: 'Buyers',    value: 'buyer' },
  { label: 'Renters',   value: 'renter' },
];

export const CLIENT_TYPE_OPTIONS = [
  { label: 'Buyer',  value: 'buyer'  as const },
  { label: 'Renter', value: 'renter' as const },
];

export const PAGE_SIZE = 200;

// ─── Client Profile query keys ────────────────────────────────────────────────

export const PROFILE_QUERY_KEYS = {
  requirements: (id: string) => [`/api/clients/${id}/requirements-enhanced`] as const,
  history:      (id: string) => [`agent-client-history-${id}`] as const,
  shortlists:   (id: string) => [agentClientShortlistsPath(id)] as const,
  documents:    (id: string) => [`/api/clients/${id}/documents`] as const,
  media:        (id: string) => [`/api/clients/${id}/media`] as const,
  notes:        (id: string) => [`/api/clients/${id}/notes`] as const,
  groups:       (id: string) => [`/api/clients/${id}/groups`] as const,
};
