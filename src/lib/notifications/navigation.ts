import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { api } from '../api';
import { API_GLOBAL_PATHS } from '../apiGlobalPaths';
import type { BrokerNotificationRow, NotificationInboxRole } from './types';

type AgentShowingRequestDetail = { status?: string };

type Nav = NativeStackNavigationProp<RootStackParamList>;

function parseMessageArgs(
  messageArgs: BrokerNotificationRow['messageArgs']
): Record<string, unknown> | null {
  if (messageArgs && typeof messageArgs === 'object' && !Array.isArray(messageArgs)) {
    return messageArgs as Record<string, unknown>;
  }
  return null;
}

function toPositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function normalizeEntityKind(row: BrokerNotificationRow): string {
  return String(row.entityKind ?? '').toUpperCase();
}

function normalizeType(row: BrokerNotificationRow): string {
  return String(row.type ?? '').toUpperCase();
}

/** Showing request id from entity row or messageArgs. */
export function resolveShowingRequestId(row: BrokerNotificationRow): string | null {
  const kind = normalizeEntityKind(row);
  if (kind === 'SHOWING_REQUEST' && row.entityId) {
    return String(row.entityId);
  }
  const args = parseMessageArgs(row.messageArgs);
  if (args?.showingRequestId != null) {
    return String(args.showingRequestId);
  }
  return null;
}

/** Tour id from entity row or messageArgs (e.g. showing approved). */
export function resolveTourId(row: BrokerNotificationRow): string | null {
  const kind = normalizeEntityKind(row);
  if (kind === 'TOUR' && row.entityId) {
    return String(row.entityId);
  }
  const args = parseMessageArgs(row.messageArgs);
  if (args?.tourId != null) {
    return String(args.tourId);
  }
  return null;
}

/** Property id from entity row or messageArgs (media shared). */
export function resolvePropertyId(row: BrokerNotificationRow): number | null {
  const kind = normalizeEntityKind(row);
  if (kind === 'PROPERTY' && row.entityId) {
    const fromEntity = toPositiveInt(row.entityId);
    if (fromEntity != null) {
      return fromEntity;
    }
  }

  const args = parseMessageArgs(row.messageArgs);
  if (args?.propertyId != null) {
    const fromArgs = toPositiveInt(args.propertyId);
    if (fromArgs != null) {
      return fromArgs;
    }
  }

  if (args?.masterPropertyId != null) {
    const fromMaster = toPositiveInt(args.masterPropertyId);
    if (fromMaster != null) {
      return fromMaster;
    }
  }

  return null;
}

/** Approved showing requests have a tour and should not reopen the request modal. */
function isShowingRequestApproved(row: BrokerNotificationRow, type: string): boolean {
  if (type === 'SHOWING_REQUEST_APPROVED') {
    return true;
  }
  const args = parseMessageArgs(row.messageArgs);
  const status = args?.status != null ? String(args.status).toLowerCase() : '';
  if (status === 'approved') {
    return true;
  }
  return resolveTourId(row) != null;
}

function pushTourDetails(navigation: Nav, tourId: string): boolean {
  navigation.push('TourDetails', { tourId });
  return true;
}

function navigateAgentMainTab(navigation: Nav, screen: 'Dashboard' | 'Tours'): void {
  navigation.navigate('Main', { screen });
}

function openAgentToursTab(navigation: Nav): boolean {
  navigateAgentMainTab(navigation, 'Tours');
  return true;
}

function openAgentShowingRequest(navigation: Nav, showingRequestId: string): boolean {
  navigation.navigate('Main', {
    screen: 'Dashboard',
    params: { showingRequestId },
  });
  return true;
}

function navigateClientMainTab(navigation: Nav, screen: 'MyTours' | 'Dashboard'): void {
  navigation.navigate('Main', { screen });
}

async function fetchAgentShowingRequestStatus(
  showingRequestId: string
): Promise<string | null> {
  try {
    const { data } = await api.get<AgentShowingRequestDetail>(
      `${API_GLOBAL_PATHS.agentShowingRequests}/${showingRequestId}`
    );
    return data.status != null ? String(data.status).toLowerCase() : null;
  } catch {
    return null;
  }
}

async function navigateAgentShowingRequestAsync(
  navigation: Nav,
  row: BrokerNotificationRow,
  type: string,
  showingRequestId: string | null
): Promise<boolean> {
  if (isShowingRequestApproved(row, type)) {
    return openAgentToursTab(navigation);
  }
  if (type === 'SHOWING_REQUEST_REJECTED') {
    navigateAgentMainTab(navigation, 'Dashboard');
    return true;
  }
  if (showingRequestId) {
    const status = await fetchAgentShowingRequestStatus(showingRequestId);
    if (status === 'approved') {
      return openAgentToursTab(navigation);
    }
    if (status === 'pending') {
      return openAgentShowingRequest(navigation, showingRequestId);
    }
    navigateAgentMainTab(navigation, 'Dashboard');
    return true;
  }
  navigateAgentMainTab(navigation, 'Dashboard');
  return true;
}

function navigateAgentShowingRequest(
  navigation: Nav,
  row: BrokerNotificationRow,
  type: string,
  showingRequestId: string | null
): boolean {
  if (isShowingRequestApproved(row, type)) {
    return openAgentToursTab(navigation);
  }
  if (type === 'SHOWING_REQUEST_REJECTED') {
    navigateAgentMainTab(navigation, 'Dashboard');
    return true;
  }
  if (showingRequestId) {
    return openAgentShowingRequest(navigation, showingRequestId);
  }
  navigateAgentMainTab(navigation, 'Dashboard');
  return true;
}

/** Prefetches agent showing-request status when needed (stale CREATED → approved). */
export async function navigateFromNotificationAsync(
  navigation: Nav,
  row: BrokerNotificationRow,
  role: NotificationInboxRole
): Promise<boolean> {
  const showingRequestId = resolveShowingRequestId(row);
  const entityKind = normalizeEntityKind(row);
  const type = normalizeType(row);

  if (
    role === 'agent' &&
    showingRequestId &&
    (entityKind === 'SHOWING_REQUEST' || type.startsWith('SHOWING_REQUEST_'))
  ) {
    return navigateAgentShowingRequestAsync(navigation, row, type, showingRequestId);
  }

  return navigateFromNotification(navigation, row, role);
}

export function navigateFromNotification(
  navigation: Nav,
  row: BrokerNotificationRow,
  role: NotificationInboxRole
): boolean {
  const tourId = resolveTourId(row);
  const propertyId = resolvePropertyId(row);
  const showingRequestId = resolveShowingRequestId(row);
  const entityKind = normalizeEntityKind(row);
  const type = normalizeType(row);

  if (type.includes('RECOMMENDATION') || row.messageKey.toLowerCase().includes('recommendation')) {
    navigation.navigate('Recommendations');
    return true;
  }

  if (type === 'PROPERTY_MEDIA_SHARED' && propertyId != null) {
    navigation.navigate('MediaCenter', {
      userType: role === 'agent' ? 'Agent' : 'Client',
      propertyId,
    });
    return true;
  }

  if (type.startsWith('TOUR_') && tourId) {
    return pushTourDetails(navigation, tourId);
  }

  if (role === 'agent' && type.startsWith('SHOWING_REQUEST_')) {
    return navigateAgentShowingRequest(navigation, row, type, showingRequestId);
  }

  switch (entityKind) {
    case 'TOUR':
      if (tourId) {
        return pushTourDetails(navigation, tourId);
      }
      break;
    case 'OFFER':
      if (role === 'agent' && row.entityId) {
        navigation.push('OfferDetail', { offerId: String(row.entityId) });
        return true;
      }
      if (tourId) {
        return pushTourDetails(navigation, tourId);
      }
      navigateClientMainTab(navigation, 'MyTours');
      return true;
    case 'PROPERTY':
      if (propertyId != null) {
        navigation.navigate('MediaCenter', {
          userType: role === 'agent' ? 'Agent' : 'Client',
          propertyId,
        });
        return true;
      }
      break;
    case 'SHOWING_REQUEST':
      if (role === 'agent') {
        return navigateAgentShowingRequest(navigation, row, type, showingRequestId);
      }
      if (tourId) {
        return pushTourDetails(navigation, tourId);
      }
      navigateClientMainTab(navigation, 'MyTours');
      return true;
    default:
      break;
  }

  if (__DEV__) {
    Alert.alert(
      'Cannot open notification',
      `No screen mapped for ${type || entityKind || 'unknown'}.`
    );
  }
  return false;
}
