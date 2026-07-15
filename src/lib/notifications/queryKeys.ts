import type { NotificationInboxRole } from './types';

export const notificationQueryKeys = {
  unreadCount: (role: NotificationInboxRole) =>
    ['notifications', 'unread-count', role] as const,
  inbox: (role: NotificationInboxRole, unreadOnly: boolean) =>
    ['notifications', 'inbox', role, unreadOnly] as const,
};
