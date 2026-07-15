import { apiRequest } from '../api';
import { API_GLOBAL_PATHS } from '../apiGlobalPaths';
import type {
  MarkAllReadResponse,
  MarkReadResponse,
  NotificationInboxRole,
  NotificationPageDto,
  UnreadCountResponse,
} from './types';

function inboxBase(role: NotificationInboxRole): string {
  return role === 'agent'
    ? API_GLOBAL_PATHS.notificationsAgentInbox
    : API_GLOBAL_PATHS.notificationsClientInbox;
}

export interface ListInboxParams {
  unreadOnly?: boolean;
  type?: string;
  page?: number;
  size?: number;
}

export function listInbox(
  role: NotificationInboxRole,
  params: ListInboxParams = {}
): Promise<NotificationPageDto> {
  const search = new URLSearchParams();
  if (params.unreadOnly) search.set('unreadOnly', 'true');
  if (params.type) search.set('type', params.type);
  if (params.page != null) search.set('page', String(params.page));
  if (params.size != null) search.set('size', String(params.size));
  const qs = search.toString();
  const path = `${inboxBase(role)}${qs ? `?${qs}` : ''}`;
  return apiRequest<NotificationPageDto>('GET', path);
}

export function getUnreadCount(role: NotificationInboxRole): Promise<UnreadCountResponse> {
  return apiRequest<UnreadCountResponse>('GET', `${inboxBase(role)}/unread-count`);
}

export function markRead(
  role: NotificationInboxRole,
  notificationId: number
): Promise<MarkReadResponse> {
  return apiRequest<MarkReadResponse>('PATCH', `${inboxBase(role)}/${notificationId}/read`);
}

export function markAllRead(role: NotificationInboxRole): Promise<MarkAllReadResponse> {
  return apiRequest<MarkAllReadResponse>('POST', `${inboxBase(role)}/read-all`);
}
