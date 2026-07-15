// ─── API shapes ───────────────────────────────────────────────────────────────

export interface PageDto<T> {
  content: T[];
}

export interface AgentClientApiItem {
  id: number;
  email?: string | null;
  phoneE164?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  clientType?: string | null;
  offersCount?: number | null;
  hasSharedStats?: boolean | null;   // ← add
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  clientType?: ClientType;
  toursCount?: number;
  shortlistedCount?: number;
  offersCount?: number;
  rejectedCount?: number;
  hasSharedStats?: boolean;          // ← add
}

// ─── App-level shapes ─────────────────────────────────────────────────────────

export type ClientType = 'buyer' | 'renter' | '';
export type FilterType = 'all' | 'buyer' | 'renter';

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  clientType?: ClientType;
  toursCount?: number;
  shortlistedCount?: number;
  offersCount?: number;
  rejectedCount?: number;
}

export interface AddClientPayload {
  firstName: string;
  lastName: string;
  email: string;
  clientType: string;
}

// ─── Client Profile shapes ────────────────────────────────────────────────────

export interface ClientHistorySummary {
  totalTours: number;
  totalOffers: number;
}

export interface ClientHistory {
  summary?: ClientHistorySummary;
}

export interface ClientProfileStats {
  totalTours: number;
  totalShortlists: number;
  totalOffers: number;
}

export interface ProfileMenuItem {
  key: string;
  label: string;
  route: string;
  badge?: number;
  showStarBadge?: boolean;
  icon: React.ReactNode;
}
