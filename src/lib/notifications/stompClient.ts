import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getApiBaseUrl } from '../api';
import { API_GLOBAL_PATHS } from '../apiGlobalPaths';
import { secureStorage } from '../secureStore';
import type { ChatEventPayload } from '../chat/types';
import type { BrokerNotificationRow, NotificationInboxRole } from './types';

const NOTIFICATION_DESTINATION = '/user/queue/notifications';
const CHAT_DESTINATION = '/user/queue/chat';

export type NotificationPushHandler = (row: BrokerNotificationRow) => void;
export type ChatEventHandler = (event: ChatEventPayload) => void;

function notificationsWsUrl(): string {
  const origin = getApiBaseUrl();
  if (!origin) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured');
  }
  return `${origin}${API_GLOBAL_PATHS.notificationsWs}`;
}

function parseNotificationBody(body: string): BrokerNotificationRow | null {
  try {
    const raw = JSON.parse(body) as Record<string, unknown>;
    const id = raw.id;
    if (id == null || Number.isNaN(Number(id))) {
      return null;
    }
    return {
      id: Number(id),
      type: String(raw.type ?? '') as BrokerNotificationRow['type'],
      messageKey: String(raw.messageKey ?? ''),
      messageArgs:
        raw.messageArgs != null &&
        (typeof raw.messageArgs === 'object' || typeof raw.messageArgs === 'string')
          ? (raw.messageArgs as BrokerNotificationRow['messageArgs'])
          : null,
      entityKind: String(raw.entityKind ?? '') as BrokerNotificationRow['entityKind'],
      entityId: raw.entityId != null ? String(raw.entityId) : '',
      read: Boolean(raw.read),
      readAt: raw.readAt != null ? String(raw.readAt) : null,
      createdAt: raw.createdAt != null ? String(raw.createdAt) : new Date().toISOString(),
    };
  } catch {
    if (__DEV__) {
      console.warn('[notifications] STOMP message parse failed', body.slice(0, 200));
    }
    return null;
  }
}

function parseChatEventBody(body: string): ChatEventPayload | null {
  try {
    const raw = JSON.parse(body) as Record<string, unknown>;
    const type = raw.type != null ? String(raw.type) : '';
    if (!type) return null;
    return {
      type,
      conversationId: raw.conversationId != null ? String(raw.conversationId) : undefined,
      messageId: raw.messageId != null ? String(raw.messageId) : undefined,
      senderAgentId:
        raw.senderAgentId != null && !Number.isNaN(Number(raw.senderAgentId))
          ? Number(raw.senderAgentId)
          : null,
      senderClientProfileId:
        raw.senderClientProfileId != null && !Number.isNaN(Number(raw.senderClientProfileId))
          ? Number(raw.senderClientProfileId)
          : null,
      messageType: raw.messageType != null ? String(raw.messageType) : undefined,
      ciphertext: raw.ciphertext != null ? String(raw.ciphertext) : null,
      senderKeyId: raw.senderKeyId != null ? String(raw.senderKeyId) : null,
      algorithmVersion:
        raw.algorithmVersion != null ? String(raw.algorithmVersion) : undefined,
      nonce: raw.nonce != null ? String(raw.nonce) : null,
      hasMentions: Boolean(raw.hasMentions),
      createdAt: raw.createdAt != null ? String(raw.createdAt) : undefined,
      agentId:
        raw.agentId != null && !Number.isNaN(Number(raw.agentId)) ? Number(raw.agentId) : null,
      clientProfileId:
        raw.clientProfileId != null && !Number.isNaN(Number(raw.clientProfileId))
          ? Number(raw.clientProfileId)
          : null,
      status: raw.status != null ? String(raw.status) : undefined,
    };
  } catch {
    if (__DEV__) {
      console.warn('[chat] STOMP message parse failed', body.slice(0, 200));
    }
    return null;
  }
}

export class NotificationStompSession {
  private client: Client | null = null;
  private role: NotificationInboxRole | null = null;

  constructor(
    private readonly onNotification: NotificationPushHandler,
    private readonly onChatEvent?: ChatEventHandler,
  ) {}

  async connect(role: NotificationInboxRole): Promise<void> {
    await this.disconnect();
    const token = await secureStorage.getToken();
    if (!token) return;

    this.role = role;
    const url = notificationsWsUrl();

    this.client = new Client({
      webSocketFactory: () => new SockJS(url) as unknown as WebSocket,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        if (__DEV__) {
          console.log(
            '[realtime] STOMP connected, subscribing to',
            NOTIFICATION_DESTINATION,
            CHAT_DESTINATION,
          );
        }
        this.client?.subscribe(NOTIFICATION_DESTINATION, (message: IMessage) => {
          const row = parseNotificationBody(message.body);
          if (__DEV__ && row) {
            console.log('[notifications] STOMP push received', row.id, row.type);
          }
          if (row) this.onNotification(row);
        });
        if (this.onChatEvent) {
          this.client?.subscribe(CHAT_DESTINATION, (message: IMessage) => {
            const event = parseChatEventBody(message.body);
            if (__DEV__ && event) {
              console.log('[chat] STOMP push received', event.type, event.conversationId);
            }
            if (event) this.onChatEvent?.(event);
          });
        }
      },
      onStompError: (frame) => {
        console.warn('[notifications] STOMP error', frame.headers['message']);
      },
      onWebSocketError: (event) => {
        console.warn('[notifications] WebSocket error', event);
      },
    });

    this.client.activate();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.deactivate();
      } catch {
        // ignore teardown errors
      }
      this.client = null;
    }
    this.role = null;
  }

  get connectedRole(): NotificationInboxRole | null {
    return this.role;
  }
}
