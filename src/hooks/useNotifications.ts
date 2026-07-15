import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import {
  getUnreadCount,
  listInbox,
  markAllRead,
  markRead,
} from '../lib/notifications/api';
import { notificationQueryKeys } from '../lib/notifications/queryKeys';
import type {
  BrokerNotificationRow,
  NotificationInboxRole,
  NotificationPageDto,
} from '../lib/notifications/types';

const INBOX_PAGE_SIZE = 50;
const NOTIFICATION_UNREAD_REFETCH_MS = 30_000;
const NOTIFICATION_INBOX_REFETCH_MS = 15_000;

function inboxInfiniteQueryOptions(role: NotificationInboxRole, unreadOnly: boolean) {
  return {
    queryKey: [...notificationQueryKeys.inbox(role, unreadOnly), 'pages'] as const,
    queryFn: ({ pageParam }: { pageParam: number }) =>
      listInbox(role, { unreadOnly, page: pageParam, size: INBOX_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: NotificationPageDto) =>
      lastPage.last ? undefined : lastPage.number + 1,
  };
}

/** Flatten infinite-query pages; tolerates missing {@code content} from API. */
export function flattenInboxPages(
  data: { pages: NotificationPageDto[] } | undefined
): BrokerNotificationRow[] {
  const rows = data?.pages.flatMap((p) => p.content ?? []) ?? [];
  return [...rows].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function isUnreadInboxQueryKey(key: readonly unknown[]): boolean {
  return key[0] === 'notifications' && key[1] === 'inbox' && key[3] === true;
}

export function prefetchNotificationInbox(
  queryClient: QueryClient,
  role: NotificationInboxRole,
  unreadOnly = false
) {
  return queryClient.prefetchInfiniteQuery({
    ...inboxInfiniteQueryOptions(role, unreadOnly),
    staleTime: 0,
  });
}

export function useNotificationRole(): NotificationInboxRole | null {
  const { user } = useAuth();
  if (user?.role === 'agent') return 'agent';
  if (user?.role === 'client') return 'client';
  return null;
}

export function useUnreadCount() {
  const role = useNotificationRole();
  return useQuery({
    queryKey: role ? notificationQueryKeys.unreadCount(role) : ['notifications', 'disabled'],
    queryFn: () => getUnreadCount(role!),
    enabled: role != null,
    refetchInterval: NOTIFICATION_UNREAD_REFETCH_MS,
    refetchIntervalInBackground: true,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    select: (data) => data.count,
  });
}

export function useNotificationInbox(unreadOnly = false) {
  const role = useNotificationRole();
  return useInfiniteQuery({
    ...inboxInfiniteQueryOptions(role ?? 'agent', unreadOnly),
    enabled: role != null,
    retry: 2,
    staleTime: 0,
    refetchInterval: NOTIFICATION_INBOX_REFETCH_MS,
    refetchIntervalInBackground: true,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
  });
}

/** Refetch inbox + unread count from NES (source of truth). */
export function invalidateNotificationQueries(
  queryClient: QueryClient,
  role: NotificationInboxRole
) {
  queryClient.invalidateQueries({ queryKey: ['notifications', 'inbox', role] });
  queryClient.invalidateQueries({ queryKey: notificationQueryKeys.unreadCount(role) });
}

export function useMarkNotificationRead() {
  const role = useNotificationRole();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: number) => markRead(role!, notificationId),
    onSuccess: (_data, notificationId) => {
      if (!role) return;
      patchInboxCaches(queryClient, role, (row) =>
        row.id === notificationId ? { ...row, read: true, readAt: new Date().toISOString() } : row
      );
      invalidateNotificationQueries(queryClient, role);
    },
  });
}

export function useMarkAllNotificationsRead() {
  const role = useNotificationRole();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllRead(role!),
    onSuccess: () => {
      if (!role) return;
      patchInboxCaches(queryClient, role, (row) => ({
        ...row,
        read: true,
        readAt: row.readAt ?? new Date().toISOString(),
      }));
      setUnreadCountCache(queryClient, role, 0);
    },
  });
}

function setUnreadCountCache(
  queryClient: ReturnType<typeof useQueryClient>,
  role: NotificationInboxRole,
  count: number
) {
  queryClient.setQueryData(notificationQueryKeys.unreadCount(role), { count });
}

/**
 * STOMP push: refresh inbox and unread count from the API so the UI matches {@code broker_notifications}.
 * Avoids phantom unread rows (badge flashes, Unread tab clears on refetch).
 */
export function upsertNotificationInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  role: NotificationInboxRole,
  _row: BrokerNotificationRow
) {
  invalidateNotificationQueries(queryClient, role);
}

function patchInboxCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  role: NotificationInboxRole,
  patch: (row: BrokerNotificationRow) => BrokerNotificationRow
) {
  const queries = queryClient.getQueriesData<{
    pages: NotificationPageDto[];
    pageParams: number[];
  }>({ queryKey: ['notifications', 'inbox', role] });

  for (const [key, data] of queries) {
    if (!data?.pages) continue;
    const unreadOnly = isUnreadInboxQueryKey(key);
    queryClient.setQueryData(key, {
      ...data,
      pages: data.pages.map((page) => {
        const content = page.content.map(patch).filter((row) => !unreadOnly || !row.read);
        return { ...page, content };
      }),
    });
  }
}
