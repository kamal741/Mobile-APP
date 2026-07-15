import { clientDisplayNameFromMap } from './clientDisplayNames';
import type { BrokerNotificationRow } from './types';

export type NotificationSubtitleOptions = {
  /** Agent clients: profile id → display name from GET /api/client/v1/agent/clients */
  clientNamesByProfileId?: Record<string, string>;
};

const MESSAGE_TEMPLATES: Record<string, string> = {
  'notifications.showing_request_created': 'You have a new showing request',
  'notifications.showing_request_approved': 'Your showing request was approved',
  'notifications.showing_request_rejected': 'Your showing request was declined',
  'notifications.offer_created': 'A new offer was submitted',
  'notifications.offer_client_response': 'A client responded to an offer',
  'notifications.property_media_shared': 'New property media is available',
  'notifications.tour_created': 'A tour has been scheduled',
  'notifications.tour_schedule_updated': 'A tour schedule was updated',
  'notifications.tour_completed': 'A tour was completed',
};

function parseMessageArgs(
  messageArgs: BrokerNotificationRow['messageArgs']
): Record<string, unknown> | null {
  if (messageArgs && typeof messageArgs === 'object' && !Array.isArray(messageArgs)) {
    return messageArgs;
  }
  return null;
}

function formatScheduledDate(value: unknown): string | null {
  if (value == null) return null;
  let rawValue: string | null = null;
  if (value instanceof Date) {
    rawValue = value.toISOString();
  } else {
    rawValue = scalarString(value);
  }
  if (!rawValue) {
    return null;
  }
  const d = new Date(rawValue);
  if (Number.isNaN(d.getTime())) return null;
  const datePart = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timePart = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${datePart} at ${timePart}`;
}

function shortEntityId(entityId: string | undefined): string {
  if (!entityId) return '';
  return entityId.length > 8 ? entityId.slice(-8) : entityId;
}

function scalarString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return null;
}

function toSentenceCase(input: string): string {
  const normalized = input.replaceAll('_', ' ').trim().toLowerCase();
  if (!normalized) return 'Update available';
  return normalized[0].toUpperCase() + normalized.slice(1);
}

function subtitleFromSchedule(args: Record<string, unknown>): string | null {
  if (args.scheduledDate != null) {
    const when = formatScheduledDate(args.scheduledDate);
    if (!when) {
      return null;
    }
    return `Scheduled for ${when}`;
  }

  if (args.completedAt != null) {
    const when = formatScheduledDate(args.completedAt);
    if (!when) {
      return null;
    }
    return `Completed on ${when}`;
  }

  return null;
}

function subtitleFromTour(args: Record<string, unknown>): string | null {
  if (args.tourId == null) {
    return null;
  }
  const tourId = scalarString(args.tourId);
  if (!tourId) {
    return null;
  }
  return `Tour ID: ${tourId.slice(-8)}`;
}

function resolvePropertyLabel(args: Record<string, unknown>): string | null {
  const mlsNumber = scalarString(args.mlsNumber);
  if (mlsNumber && mlsNumber.trim()) {
    return `MLS ${mlsNumber.trim()}`;
  }

  const address = scalarString(args.address) ?? scalarString(args.fullAddress);
  if (address && address.trim()) {
    return address.trim();
  }

  const street = scalarString(args.addressLine1);
  const city = scalarString(args.city);
  if (street && street.trim()) {
    const trimmedStreet = street.trim();
    if (city && city.trim()) {
      return `${trimmedStreet}, ${city.trim()}`;
    }
    return trimmedStreet;
  }

  return null;
}

function subtitleFromProperty(args: Record<string, unknown>): string | null {
  const propertyLabel = resolvePropertyLabel(args);

  const propertyId = scalarString(args.propertyId);
  const count = typeof args.approvedMediaCount === 'number' ? args.approvedMediaCount : null;

  if (count != null) {
    let mediaLabel = 'media items';
    if (count === 1) {
      mediaLabel = 'media item';
    }

    if (propertyLabel) {
      return `${propertyLabel} - ${count} new ${mediaLabel}`;
    }

    if (propertyId) {
      return `${count} new ${mediaLabel}`;
    }

    return `Property media update - ${count} new ${mediaLabel}`;
  }

  if (propertyLabel) {
    return propertyLabel;
  }

  if (propertyId) {
    return 'Property media update';
  }

  return null;
}

function subtitleFromClient(
  args: Record<string, unknown>,
  options?: NotificationSubtitleOptions
): string | null {
  if (args.clientProfileId == null) {
    return null;
  }

  let fromArgs: string | null = null;
  if (typeof args.clientName === 'string' && args.clientName.trim()) {
    fromArgs = args.clientName.trim();
  }
  if (!fromArgs && typeof args.clientDisplayName === 'string' && args.clientDisplayName.trim()) {
    fromArgs = args.clientDisplayName.trim();
  }
  if (fromArgs) {
    return fromArgs;
  }

  const resolved = clientDisplayNameFromMap(args.clientProfileId, options?.clientNamesByProfileId);
  if (resolved) {
    return resolved;
  }

  const profileId = scalarString(args.clientProfileId);
  if (!profileId) {
    return null;
  }
  return `Client #${profileId}`;
}

function subtitleFromStatus(args: Record<string, unknown>): string | null {
  if (args.status == null) {
    return null;
  }

  const status = scalarString(args.status);
  if (!status) {
    return null;
  }
  return `Current status: ${toSentenceCase(status)}`;
}

function subtitleFromEntity(row: BrokerNotificationRow): string | null {
  const kind = row.entityKind.replaceAll('_', ' ').toLowerCase();
  const idSuffix = shortEntityId(row.entityId);
  if (!kind || !idSuffix) {
    return null;
  }
  return `${toSentenceCase(kind)} ID: ${idSuffix}`;
}

export function notificationTitle(row: BrokerNotificationRow): string {
  const base =
    MESSAGE_TEMPLATES[row.messageKey] ??
    toSentenceCase(row.messageKey.replace(/^notifications\./, ''));
  return base;
}

export function notificationSubtitle(
  row: BrokerNotificationRow,
  options?: NotificationSubtitleOptions
): string | null {
  const args = parseMessageArgs(row.messageArgs);
  if (!args) {
    return subtitleFromEntity(row);
  }

  const scheduleSubtitle = subtitleFromSchedule(args);
  if (scheduleSubtitle) {
    return scheduleSubtitle;
  }

  const tourSubtitle = subtitleFromTour(args);
  if (tourSubtitle) {
    return tourSubtitle;
  }

  const propertySubtitle = subtitleFromProperty(args);
  if (propertySubtitle) {
    return propertySubtitle;
  }

  const clientSubtitle = subtitleFromClient(args, options);
  if (clientSubtitle) {
    return clientSubtitle;
  }

  const statusSubtitle = subtitleFromStatus(args);
  if (statusSubtitle) {
    return statusSubtitle;
  }

  return subtitleFromEntity(row);
}
