import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useAgentClientNameMap } from '../hooks/useAgentClientNameMap';
import { useQueryClient } from '@tanstack/react-query';
import {
  flattenInboxPages,
  invalidateNotificationQueries,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationInbox,
  useNotificationRole,
  useUnreadCount,
} from '../hooks/useNotifications';
import { getApiErrorMessage } from '../lib/apiErrors';
import { notificationSubtitle, notificationTitle } from '../lib/notifications/i18n';
import { navigateFromNotificationAsync } from '../lib/notifications/navigation';
import type { BrokerNotificationRow } from '../lib/notifications/types';
import { ClientFooter } from './client/components/ClientFooter';
import { AgentFooter } from './agent/components/AgentFooter';

type FilterMode = 'all' | 'unread';
type NotificationListItem =
  | { kind: 'separator'; key: string; label: string }
  | { kind: 'notification'; key: string; row: BrokerNotificationRow };

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dayKey(iso) === dayKey(today.toISOString())) return 'Today';
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return 'Yesterday';

  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function withDaySeparators(rows: BrokerNotificationRow[]): NotificationListItem[] {
  const out: NotificationListItem[] = [];
  let prevDay = '';

  for (const row of rows) {
    const currentDay = dayKey(row.createdAt);
    if (currentDay !== prevDay) {
      out.push({
        kind: 'separator',
        key: `sep-${currentDay}`,
        label: formatDayLabel(row.createdAt),
      });
      prevDay = currentDay;
    }
    out.push({ kind: 'notification', key: `row-${row.id}`, row });
  }

  return out;
}

export function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const role = useNotificationRole();
  const [filter, setFilter] = useState<FilterMode>('all');
  const unreadOnly = filter === 'unread';

  const {
    data,
    isPending,
    isFetching,
    isError,
    error,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotificationInbox(unreadOnly);

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: clientNamesByProfileId } = useAgentClientNameMap(role === 'agent');

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = useMemo(() => flattenInboxPages(data), [data]);
  const unreadInList = useMemo(() => items.filter((item) => !item.read).length, [items]);
  const listItems = useMemo(() => withDaySeparators(items), [items]);
  let summaryText = 'You are all caught up.';
  if (unreadCount > 0) {
    let suffix = '';
    if (unreadCount !== 1) {
      suffix = 's';
    }
    summaryText = `You have ${unreadCount} unread notification${suffix}.`;
  }

  useFocusEffect(
    useCallback(() => {
      if (!role) return;
      // Invalidation already refetches the active inbox. Avoid starting a
      // second concurrent refetch when the screen regains focus.
      invalidateNotificationQueries(queryClient, role);
    }, [role, queryClient])
  );

  const setFilterMode = (mode: FilterMode) => {
    setFilter(mode);
    if (role) {
      invalidateNotificationQueries(queryClient, role);
    }
  };

  const handlePress = (row: BrokerNotificationRow) => {
    if (!role) return;
    // An opened notification becomes read and is removed from the Unread query.
    // Move to All before navigation so Back returns to a useful, populated list.
    if (unreadOnly) {
      setFilter('all');
    }
    void navigateFromNotificationAsync(navigation, row, role).then(() => {
      if (!row.read) {
        markRead.mutate(row.id);
      }
    });
  };

  if (!role) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Notifications are not available for this role.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.filterRow}>
          {(['all', 'unread'] as const).map((mode) => (
            <Pressable
              key={mode}
              style={[styles.filterChip, filter === mode && styles.filterChipActive]}
              onPress={() => setFilterMode(mode)}
            >
              <Text style={[styles.filterText, filter === mode && styles.filterTextActive]}>
                {mode === 'all' ? `All (${items.length})` : `Unread (${unreadInList})`}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={[
            styles.markAllButton,
            (markAllRead.isPending || items.every((i) => i.read)) && styles.markAllButtonDisabled,
          ]}
          onPress={() => markAllRead.mutate()}
          disabled={markAllRead.isPending || items.every((i) => i.read)}
        >
          <Text style={styles.markAll}>
            {markAllRead.isPending ? 'Marking...' : 'Mark all read'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Notification Center</Text>
        <Text style={styles.summaryText}>{summaryText}</Text>
      </View>

      {(() => {
        if (isPending || (isFetching && items.length === 0)) {
          return (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#1e40af" />
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          );
        }

        if (isError) {
          return (
            <View style={styles.centered}>
              <Text style={styles.errorTitle}>Could not load notifications</Text>
              <Text style={styles.errorDetail}>{getApiErrorMessage(error)}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
                <Text style={styles.retryButtonText}>Try again</Text>
              </TouchableOpacity>
            </View>
          );
        }

        return (
          <FlatList
            data={listItems}
            keyExtractor={(item) => item.key}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
            }
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) fetchNextPage();
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              isFetchingNextPage ? (
                <ActivityIndicator style={styles.footerLoader} color="#1e40af" />
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.emptyTitle}>
                  {unreadOnly ? 'No unread notifications' : 'No notifications yet'}
                </Text>
                <Text style={styles.emptyText}>
                  {unreadOnly
                    ? 'Switch to All to see previous activity.'
                    : 'New activity will show up here as soon as it arrives.'}
                </Text>
                {unreadCount > 0 && !unreadOnly ? (
                  <Text style={styles.emptyHint}>
                    You have {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}. Pull
                    down to refresh.
                  </Text>
                ) : null}
              </View>
            }
            renderItem={({ item }) => {
              if (item.kind === 'separator') {
                return (
                  <View style={styles.separatorRow}>
                    <View style={styles.separatorLine} />
                    <Text style={styles.separatorText}>{item.label}</Text>
                    <View style={styles.separatorLine} />
                  </View>
                );
              }

              const row = item.row;
              const subtitle = notificationSubtitle(row, {
                clientNamesByProfileId,
              });
              return (
                <TouchableOpacity
                  style={[styles.row, !row.read && styles.rowUnread]}
                  onPress={() => handlePress(row)}
                  activeOpacity={0.7}
                >
                  {!row.read && <View style={styles.unreadDot} />}
                  <View style={styles.rowBody}>
                    <View style={styles.titleRow}>
                      <Text style={styles.title}>{notificationTitle(row)}</Text>
                      {row.read ? null : <Text style={styles.newBadge}>NEW</Text>}
                    </View>
                    {subtitle ? (
                      <Text style={styles.subtitle} numberOfLines={2}>
                        {subtitle}
                      </Text>
                    ) : null}
                    <Text style={styles.meta}>
                      {formatRelativeTime(row.createdAt)}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              );
            }}
          />
        );
      })()}

      { role === 'agent' ? <AgentFooter/> : <ClientFooter/> }
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#1e40af',
  },
  filterText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  markAllButton: {
    backgroundColor: '#dbeafe',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  markAllButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
  markAll: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '600',
  },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  summaryText: {
    marginTop: 4,
    fontSize: 13,
    color: '#475569',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 4,
    padding: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
  },
  rowUnread: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bfdbfe',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1e40af',
    marginTop: 6,
    marginRight: 10,
  },
  rowBody: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
    flex: 1,
  },
  newBadge: {
    fontSize: 10,
    color: '#1e3a8a',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    fontWeight: '700',
    overflow: 'hidden',
  },
  subtitle: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  chevron: {
    fontSize: 22,
    color: '#94a3b8',
    marginLeft: 8,
  },
  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 2,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  separatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  meta: {
    fontSize: 12,
    color: '#64748b',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  emptyTitle: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyHint: {
    marginTop: 12,
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDetail: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 16,
  },
});
