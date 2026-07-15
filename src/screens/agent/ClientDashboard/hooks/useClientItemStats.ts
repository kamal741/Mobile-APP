import { useQuery } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import { agentClientStatsPath } from '../../../../lib/apiGlobalPaths';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClientItemStats {
  clientProfileId: number;
  timezone?: string;
  upcomingTours: number;
  completedTours: number;
  totalTours: number;
  shortlistedProperties: number;
  showingRequests: {
    pending: number;
    accepted: number;
    declined: number;
    total: number;
  };
  offers: {
    pending: number;
    accepted: number;
    rejected: number;
    withdrawn: number;
    total: number;
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches stats for a single client (agent JWT).
 *
 * GET /api/client/v1/agent/clients/:clientProfileId/stats
 *
 * Uses the shared `api` instance — the Authorization header is injected
 * automatically from secureStorage, exactly like every other hook in this
 * codebase (applyAgentSession, applyClientSession, etc.).
 */
export function useClientItemStats(clientProfileId: string | number | undefined) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return useQuery<ClientItemStats>({
    queryKey: ['agentClientStats', String(clientProfileId), timezone],
    queryFn: async () => {
      const res = await api.get<ClientItemStats>(agentClientStatsPath(clientProfileId!), {
        params: { timezone },
      });
      return res.data;
    },
    enabled: !!clientProfileId,
    staleTime: 1000 * 60 * 2, // 2 min
  });
}
