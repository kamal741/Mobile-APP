import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock3, MessageSquareText, Target } from 'lucide-react-native';
import { colors } from '../../theme';

export interface ClientNotesData {
  intent?: string | null;
  version?: number;
  comments?: string | null;
  timeline?: string | null;
  priorities?: string[];
}

interface ClientNotesProps {
  /**
   * Accepts either the structured notes object, a plain string (treated as
   * the "comments" field), or null/undefined when no notes exist.
   */
  notes: ClientNotesData | string | null | undefined;
}

function normalizeNotes(
  notes: ClientNotesData | string | null | undefined,
): ClientNotesData | null {
  if (!notes) return null;

  if (typeof notes === 'string') {
    const trimmed = notes.trim();
    if (!trimmed) return null;

    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (typeof parsed === 'string' && parsed.trim() !== trimmed) {
        return normalizeNotes(parsed);
      }
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return normalizeNotes(parsed as ClientNotesData);
      }
    } catch {
      // Plain-text notes remain valid and are displayed as comments.
    }

    return { comments: trimmed };
  }

  const record = notes as ClientNotesData & Record<string, unknown>;
  const intent = record.intent ?? record.Intent;
  const comments = record.comments ?? record.Comments;
  const timeline = record.timeline ?? record.Timeline;
  const priorities = record.priorities ?? record.Priorities;
  const version = record.version ?? record.Version;

  return {
    intent: typeof intent === 'string' ? intent : undefined,
    comments: typeof comments === 'string' ? comments : undefined,
    timeline: typeof timeline === 'string' ? timeline : undefined,
    priorities: Array.isArray(priorities)
      ? priorities.filter((value): value is string => typeof value === 'string')
      : undefined,
    version: typeof version === 'number' ? version : undefined,
  };
}

function humanize(value: string): string {
  const text = value.replace(/_/g, ' ').trim();
  if (text.toLowerCase() === 'asap') return 'ASAP';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

const ClientNotes: React.FC<ClientNotesProps> = ({ notes }) => {
  const data = normalizeNotes(notes);

  if (!data) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No notes available for this client.</Text>
      </View>
    );
  }

  return (
    <>
      {/* Intent + Timeline row */}
      {(data.intent || data.timeline) && (
        <View style={styles.metaRow}>
          {data.intent ? (
            <View style={[styles.metaCard, styles.intentCard]}>
              <View style={styles.metaIcon}>
                <Target size={15} color="#1E40AF" strokeWidth={2.2} />
              </View>
              <View style={styles.metaCopy}>
                <Text style={styles.metaLabel}>INTENT</Text>
                <Text style={styles.metaValue}>{humanize(data.intent)}</Text>
              </View>
            </View>
          ) : null}
          {data.timeline ? (
            <View style={[styles.metaCard, styles.timelineCard]}>
              <View style={styles.metaIcon}>
                <Clock3 size={15} color="#1E40AF" strokeWidth={2.2} />
              </View>
              <View style={styles.metaCopy}>
                <Text style={styles.metaLabel}>TIMELINE</Text>
                <Text style={styles.metaValue}>{humanize(data.timeline)}</Text>
              </View>
            </View>
          ) : null}
        </View>
      )}

      {/* Priorities */}
      {data.priorities && data.priorities.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, styles.prioritiesLabel]}>
            PRIORITIES
          </Text>
          <View style={styles.pillsRow}>
            {data.priorities.map((p) => (
              <View key={p} style={styles.pill}>
                <Text style={styles.pillText}>{humanize(p)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Comments */}
      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <MessageSquareText size={15} color="#64748B" strokeWidth={2.1} />
          <Text style={styles.sectionLabel}>COMMENTS</Text>
        </View>
        <Text
          style={[
            styles.commentText,
            !data.comments?.trim() && styles.emptyComment,
          ]}
        >
          {data.comments?.trim() || 'No additional comments.'}
        </Text>
      </View>
    </>
  );
};

export default ClientNotes;

const styles = StyleSheet.create({
  // ── Meta row (Intent + Timeline) ──
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  metaCard: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 11,
  },
  intentCard: {
    borderColor: '#DBEAFE',
  },
  timelineCard: {
    borderColor: '#E2E8F0',
  },
  metaIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    marginRight: 8,
  },
  metaCopy: {
    flex: 1,
    minWidth: 0,
  },
  metaLabel: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.65,
  },
  metaValue: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // ── Sections ──
  section: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 13,
    marginBottom: 10,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.65,
  },
  prioritiesLabel: {
    marginBottom: 8,
  },
  commentText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.textPrimary,
  },

  // ── Priority pills ──
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },

  // ── Empty states ──
  emptyComment: {
    color: colors.textMuted,
    fontStyle: 'italic',
    fontWeight: '400',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
