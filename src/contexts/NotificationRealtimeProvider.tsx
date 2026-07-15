import { ReactNode, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { applyChatEventToCache } from '../lib/chat/cacheHelpers';
import { useNotificationRole, upsertNotificationInCache } from '../hooks/useNotifications';
import { NotificationStompSession } from '../lib/notifications/stompClient';
import type { BrokerNotificationRow } from '../lib/notifications/types';
import { registerCurrentDeviceForPush } from '../lib/notifications/pushNotifications';

export function NotificationRealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const role = useNotificationRole();
  const queryClient = useQueryClient();
  const sessionRef = useRef<NotificationStompSession | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !role) return;
    registerCurrentDeviceForPush(role).catch((error) => {
      console.warn('[push] device registration failed', error);
    });
  }, [isAuthenticated, role]);

  useEffect(() => {
    if (!isAuthenticated || !role || !user?.id) {
      sessionRef.current?.disconnect();
      sessionRef.current = null;
      return;
    }

    const onNotification = (row: BrokerNotificationRow) => {
      upsertNotificationInCache(queryClient, role, row);
    };

    const onChatEvent = (event: Parameters<typeof applyChatEventToCache>[3]) => {
      applyChatEventToCache(queryClient, role, user.id, event);
    };

    const session = new NotificationStompSession(onNotification, onChatEvent);
    sessionRef.current = session;
    session.connect(role).catch((err) => {
      console.warn('[realtime] failed to connect STOMP', err);
    });

    return () => {
      session.disconnect();
      if (sessionRef.current === session) {
        sessionRef.current = null;
      }
    };
  }, [isAuthenticated, role, queryClient, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !role) return;

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active' && sessionRef.current) {
        sessionRef.current.connect(role).catch(() => undefined);
      }
    };

    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [isAuthenticated, role]);

  return <>{children}</>;
}
