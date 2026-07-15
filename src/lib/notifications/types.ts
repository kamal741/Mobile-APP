/** Matches backend {@code BrokerNotificationType}. */
export type BrokerNotificationType =
  | 'SHOWING_REQUEST_CREATED'
  | 'SHOWING_REQUEST_APPROVED'
  | 'SHOWING_REQUEST_REJECTED'
  | 'OFFER_CREATED'
  | 'OFFER_CLIENT_RESPONSE'
  | 'PROPERTY_MEDIA_SHARED'
  | 'TOUR_CREATED'
  | 'TOUR_SCHEDULE_UPDATED'
  | 'TOUR_COMPLETED';

/** Matches backend {@code BrokerNotificationEntityKind}. */
export type BrokerNotificationEntityKind = 'SHOWING_REQUEST' | 'TOUR' | 'OFFER' | 'PROPERTY';

export type NotificationInboxRole = 'agent' | 'client';

export interface BrokerNotificationRow {
  id: number;
  type: BrokerNotificationType;
  messageKey: string;
  messageArgs: Record<string, unknown> | string | null;
  entityKind: BrokerNotificationEntityKind;
  entityId: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPageDto {
  content: BrokerNotificationRow[];
  totalElements: number;
  number: number;
  size: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface UnreadCountResponse {
  count: number;
}

export interface MarkReadResponse {
  id: number;
  read: boolean;
}

export interface MarkAllReadResponse {
  updated: number;
}
