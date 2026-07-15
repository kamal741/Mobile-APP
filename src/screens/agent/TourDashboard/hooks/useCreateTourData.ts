import { useQuery } from "@tanstack/react-query";
import { api } from "../../../../lib/api";
import { API_GLOBAL_PATHS } from "../../../../lib/apiGlobalPaths";
import { Client, PageDto } from "../types/tour.types";
import { CLIENT_PAGE_SIZE } from "../constants/tour.constants";

export function useCreateTourData() {
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: [API_GLOBAL_PATHS.agentClients, "for-tour"],
    queryFn: async () => {
      const response = await api.get<
        PageDto<{
          id: number;
          firstName?: string | null;
          lastName?: string | null;
          email?: string | null;
          clientType?: string | null;
        }>
      >(`${API_GLOBAL_PATHS.agentClients}?page=0&size=${CLIENT_PAGE_SIZE}`);

      return (response.data.content ?? []).map((c) => ({
        id: String(c.id),
        firstName: c.firstName ?? "",
        lastName: c.lastName ?? "",
        email: c.email ?? "—",
        clientType: c.clientType ?? "buyer",
      }));
    },
  });

  return { clients, clientsLoading };
}
