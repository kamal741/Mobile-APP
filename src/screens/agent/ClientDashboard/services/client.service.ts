import { api, apiRequest } from "../../../../lib/api";
import { API_GLOBAL_PATHS } from "../../../../lib/apiGlobalPaths";
import {
  AgentClientApiItem,
  AddClientPayload,
  Client,
  FilterType,
  PageDto,
} from "../types/client.types";
import { PAGE_SIZE } from "../constants/clients.constants";

function toApiClientType(
  filterType: FilterType,
): "BUYER" | "RENTER" | undefined {
  if (filterType === "buyer") return "BUYER";
  if (filterType === "renter") return "RENTER";
  return undefined;
}

function normalizeClientType(
  clientType: string | null | undefined,
): Client["clientType"] {
  if (clientType === "BUYER" || clientType === "buyer") return "buyer";
  if (clientType === "RENTER" || clientType === "renter") return "renter";
  return undefined;
}

export const clientService = {
  /** Fetch all agent clients and normalise to app shape. */
  async fetchClients(filterType: FilterType = "all"): Promise<Client[]> {
    const query = new URLSearchParams({
      page: "0",
      size: String(PAGE_SIZE),
    });
    const apiClientType = toApiClientType(filterType);
    if (apiClientType) query.set("clientType", apiClientType);

    const response = await api.get<PageDto<AgentClientApiItem>>(
      `${API_GLOBAL_PATHS.agentClients}?${query.toString()}`,
    );
    return (response.data.content ?? []).map((c) => ({
      id: String(c.id),
      firstName: c.firstName ?? "",
      lastName: c.lastName ?? "",
      email: c.email ?? "—",
      phone: c.phoneE164 ?? undefined,
      clientType: normalizeClientType(c.clientType),
      offersCount:
        typeof c.offersCount === "number" ? c.offersCount : undefined,
      hasSharedStats: c.hasSharedStats ?? false, // ← add this line
    }));
  },

  /** Create a new client. */
  async addClient(payload: AddClientPayload): Promise<unknown> {
    return apiRequest("POST", "/api/clients", payload);
  },
};
