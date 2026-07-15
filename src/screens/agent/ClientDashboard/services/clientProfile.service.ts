import { apiRequest } from '../../../../lib/api';
import { agentClientHistoryUrl } from '../../../../lib/tourApi';

export const clientProfileService = {
  /** Permanently delete a client by ID. */
  deleteClient(clientId: string): Promise<unknown> {
    return apiRequest('DELETE', `/api/clients/${clientId}`);
  },
};

/**
 * Returns the React Query query key for agent client history.
 * Wraps the lib helper so callers don't need to import tourApi directly.
 */
export function clientHistoryQueryKey(clientId: string): string[] {
  return [agentClientHistoryUrl(clientId)];
}
