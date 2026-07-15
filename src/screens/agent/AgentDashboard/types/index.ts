// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface OffersPipeline {
  pending: number;
  accepted: number;
  rejected: number;
  total: number;
}

export interface StatsResponse {
  timezone?: string;
  todayTours: number;
  activeClients: number;
  pendingRequests: number;
  weeklyDistance: number;
  timeInvestedHours: number;
  offersPipeline: OffersPipeline;
  avgScopeFitScore: number;
  exceptionsCount: number;
  recentChanges: number;
}

export interface Tour {
  id: string;
  clientProfileId?: string | number;
  clientDisplayName?: string;
  clientName?: string;
  scheduledDate: string;
  status: 'requested' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  propertyAddress?: string;
  totalDistance?: number | string | null;
}

export interface ShowingRequest {
  id: string;
  clientId?: string;
  clientName?: string;
  propertyAddress?: string;
  propertyCount?: number;
  preferredDate?: string | null;
  preferredTime?: string | null;
  notes?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
  submittedAt?: string | null;
}

export interface RequestDetailProperty {
  id: string;
  address: string;
  city?: string;
  province?: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  price?: number;
}

export interface RequestDetail extends ShowingRequest {
  clientName?: string;
  properties?: RequestDetailProperty[];
  propertyIds?: number[];
  requestedProperties?: { masterPropertyId: number }[];
}

export interface Property {
  id: string;
  address: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  imageUrl?: string;
}

export interface PageDto<T> {
  content: T[];
  totalElements?: number;
}

export type ScheduleTab = 'Route Planning' | 'Offers';

export const SCHEDULE_TABS: ScheduleTab[] = [
  'Route Planning',
  'Offers',
];
