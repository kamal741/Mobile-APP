import { useQuery } from '@tanstack/react-query';
import { PROFILE_QUERY_KEYS } from '../constants/clients.constants';
import { clientHistoryQueryKey } from '../services/clientProfile.service';
import { ClientHistory } from '../types/client.types';

/**
 * Aggregates all React Query calls needed by ClientProfileScreen.
 * Each query is individually suspendable / refetchable by its own key.
 *
 * NOTE: requirements-enhanced, documents, media, notes, and groups are
 * TEMPORARILY DISABLED — those backend endpoints don't exist yet (404 +
 * CORS error on preflight, per network tab). Re-enable each block once
 * its route ships on the backend.
 */
export function useClientProfile(clientId: string) {
  const { data: clientHistory, isLoading: isHistoryLoading } = useQuery<ClientHistory>({
    queryKey: clientHistoryQueryKey(clientId),
    enabled:  !!clientId,
  });

  const { data: clientShortlists = [], isLoading: isShortlistsLoading } = useQuery<any[]>({
    queryKey: PROFILE_QUERY_KEYS.shortlists(clientId),
    enabled:  !!clientId,
  });

  // ── Disabled until backend ships these routes (currently 404/CORS) ───────
  const clientRequirementsEnhanced = undefined;
  const clientDocuments: any[] = [];
  const clientMedia: any[] = [];
  const clientNotes: any[] = [];
  const clientGroups: any[] = [];
  // ───────────────────────────────────────────────────────────────────────

  const isLoading = isHistoryLoading || isShortlistsLoading;

  return {
    clientRequirementsEnhanced,
    clientHistory,
    clientShortlists,
    clientDocuments,
    clientMedia,
    clientNotes,
    clientGroups,
    isLoading,
  };
}


