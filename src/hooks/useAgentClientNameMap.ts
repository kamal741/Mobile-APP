import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { API_GLOBAL_PATHS } from '../lib/apiGlobalPaths';
import { formatClientDisplayName } from '../lib/notifications/clientDisplayNames';

interface AgentClientListItem {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
}

interface AgentClientsPage {
  content: AgentClientListItem[];
}

const CLIENT_LIST_PAGE_SIZE = 200;

/**
 * Maps client profile id → "First Last" for agent notification subtitles.
 * Uses GET /api/client/v1/agent/clients (same as Client Dashboard).
 */
export function useAgentClientNameMap(enabled = true) {
  return useQuery({
    queryKey: ['agent-client-name-map'],
    queryFn: async (): Promise<Record<string, string>> => {
      const response = await api.get<AgentClientsPage>(
        `${API_GLOBAL_PATHS.agentClients}?page=0&size=${CLIENT_LIST_PAGE_SIZE}`
      );
      const map: Record<string, string> = {};
      for (const client of response.data.content ?? []) {
        const display = formatClientDisplayName(client.firstName, client.lastName);
        if (display) {
          map[String(client.id)] = display;
        }
      }
      return map;
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
