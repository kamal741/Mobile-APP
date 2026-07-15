// ─── Primitive Option Types ───────────────────────────────────────────────────

export type StartPointOption = 'Agent Address' | 'Current Location' | 'Add Address';
export type SortOption = 'Distance' | 'Time';
export type Screen = 'initial' | 'route';
export type ActiveModal = 'remove' | 'error' | 'success' | null;
export type ConflictType = 'warning' | 'critical';

// ─── Domain Models ────────────────────────────────────────────────────────────

// export interface Property {
//   id: string;
//   /**
//    * The showing-request scoped property ID from RoutePlanStop.requestedPropertyId.
//    * This is the ID required by:
//    *   DELETE /api/agent/v1/agent/showing-requests/:requestId/properties/:requestedPropertyId
//    */
//   requestedPropertyId: string;
//   address: string;
//   price: string;
//   beds: number;
//   baths: number;
//   distanceLabel: string;
//   eta: string;
//   startTime: string;
//   viewingMin: number;
//   conflict?: ConflictType;
//   conflictLabel?: string;
// }


export interface Property {
  id: string;
  /** Catalog/search property ID used by /api/properties/search/{id}. */
  masterPropertyId?: number;
  requestedPropertyId: string;
  address: string;
  price: string;
  beds: number;
  baths: number;
  distanceLabel: string;
  eta: string;
  startTime: string;
  viewingMin: number;
  driveMinFromPrevious: number;
  /** ISO-8601 UTC scheduled viewing start, e.g. "2026-06-30T09:05:00Z". */
  scheduledStartAt?: string;
  /** ISO-8601 UTC scheduled viewing end, e.g. "2026-06-30T09:35:00Z". */
  scheduledEndAt?: string;
  conflict?: ConflictType;
  conflictLabel?: string;
}

export interface RouteStats {
  totalDistance: string;
  totalTime: string;
  stops: number;
  driveTime: string;
  viewingTime: string;
  startPoint: string;
}
