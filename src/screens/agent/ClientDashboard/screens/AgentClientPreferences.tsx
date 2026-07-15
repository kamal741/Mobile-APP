/**
 * AgentClientPreferences.tsx
 *
 * Displays a client's property preference profile for the viewing agent.
 * Read-only — agents see what their client has set so they can curate better matches.
 *
 * Route params: { clientProfileId: string | number; clientName?: string }
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, typography, spacing, border, globalStyles } from "@/theme";

import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/types";

import {
  useAgentClientPreferences,
  ClientPreferenceItem,
  ClientPreferenceSection,
  PreferenceTier,
} from "../../../../lib/agentApi";
import { NormalButton } from "@/components/common/ST_Buttons";

// ─── Route prop types ─────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<
  RootStackParamList,
  "AgentClientPreferences"
>;

// ─── Tier config ──────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<
  PreferenceTier,
  { label: string; color: string; bg: string; icon: string }
> = {
  must_have: {
    label: "Must Have",
    color: colors.primary.default,
    bg: colors.primary.light,
    icon: "★",
  },
  important: {
    label: "Important",
    color: colors.success.default,
    bg: colors.success.light,
    icon: "◆",
  },
  low_priority: {
    label: "Low Priority",
    color: colors.warning.default,
    bg: colors.warning.light,
    icon: "◇",
  },
  not_important: {
    label: "Not Important",
    color: colors.text.muted,
    bg: colors.background.badge,
    icon: "○",
  },
};

const TIER_ORDER: PreferenceTier[] = [
  "must_have",
  "important",
  "low_priority",
  "not_important",
];

// ─── Helper — format a preference value for display ──────────────────────────

function formatCompactCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

function formatValue(item: ClientPreferenceItem): string {
  const { value, key } = item;

  if (value.values && value.values.length > 0) {
    return value.values.join(", ");
  }

  const isCurrency = key.includes("budget") || key.includes("price");

  if (value.min !== undefined && value.max !== undefined) {
    const fmt = (n: number) =>
      isCurrency ? formatCompactCurrency(n) : String(n);
    return `${fmt(value.min)} – ${fmt(value.max)}`;
  }

  if (value.min !== undefined) {
    if (isCurrency) {
      return `From ${formatCompactCurrency(value.min)}`;
    }
    return `Min ${value.min}`;
  }

  if (value.max !== undefined) {
    if (isCurrency) {
      return `Up to ${formatCompactCurrency(value.max)}`;
    }
    return `Max ${value.max}`;
  }

  return "—";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CompletenessBar({
  percent,
  setCount,
  totalCount,
}: Readonly<{
  percent: number;
  setCount: number;
  totalCount: number;
}>) {
  let barColor: string = colors.error.default;
  if (percent >= 80) barColor = colors.success.default;
  else if (percent >= 50) barColor = colors.warning.default;

  return (
    <View style={[globalStyles.cardElevated, styles.completenessCard]}>
      <View style={globalStyles.rowSpaceBetween}>
        {/* Left — title + subtitle */}
        <View style={{ flex: 1 }}>
          <Text style={typography.h2}>Profile Completeness</Text>
          <Text style={[typography.caption, { marginTop: spacing.xs }]}>
            {setCount} of {totalCount} preferences set
          </Text>
        </View>

        {/* Right — percent badge + Edit button stacked */}
        <View style={styles.completenessRight}>
          <View style={styles.percentBadge}>
            <Text style={[typography.h1, { color: barColor }]}>{percent}%</Text>
          </View>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${percent}%` as any, backgroundColor: barColor },
          ]}
        />
      </View>

      <View
        style={[globalStyles.row, { gap: spacing.xl, marginTop: spacing.lg }]}
      >
        {TIER_ORDER.map((tier) => {
          const cfg = TIER_CONFIG[tier];
          return (
            <View key={tier} style={[globalStyles.row, { gap: spacing.xs }]}>
              <View
                style={[styles.legendDot, { backgroundColor: cfg.color }]}
              />
              <Text
                style={[
                  typography.tiny,
                  {
                    color: colors.text.secondary,
                    textTransform: "none",
                    letterSpacing: 0,
                  },
                ]}
              >
                {cfg.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ClientContextCard({
  clientName,
  clientProfileId,
  onEditPress,
}: Readonly<{
  clientName?: string;
  clientProfileId: string | number;
  onEditPress: () => void;
}>) {
  return (
    <View style={[globalStyles.cardElevated, styles.contextCard]}>
      <View style={styles.contextHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.contextEyebrow}>Client Profile</Text>
          <Text style={styles.contextName}>
            {clientName?.trim() || `Client #${clientProfileId}`}
          </Text>
          <Text style={styles.contextSubtitle}>
            Review preference priorities to shortlist homes faster and with
            fewer revisions.
          </Text>
        </View>
        {/* <TouchableOpacity style={styles.contextEditBtn} onPress={onEditPress} activeOpacity={0.8}>
          <Text style={styles.contextEditBtnText}>Edit</Text>
        </TouchableOpacity> */}
        <NormalButton
          label="✏️ Edit"
          variant="primary"
          size="sm"
          fullWidth={false}
          onPress={onEditPress}
        />
      </View>
    </View>
  );
}

function PreferenceChip({ item }: Readonly<{ item: ClientPreferenceItem }>) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{item.label}</Text>
      <Text style={styles.chipValue}>{formatValue(item)}</Text>
    </View>
  );
}

function TierSection({
  section,
}: Readonly<{ section: ClientPreferenceSection }>) {
  const cfg = TIER_CONFIG[section.tier];

  if (section.items.length === 0) {
    return (
      <View style={styles.tierBlock}>
        <View style={[globalStyles.row, styles.tierHeader]}>
          <View style={[styles.tierBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.tierIcon, { color: cfg.color }]}>
              {cfg.icon}
            </Text>
            <Text style={[styles.tierLabel, { color: cfg.color }]}>
              {cfg.label}
            </Text>
          </View>
          <View style={styles.emptyPill}>
            <Text style={styles.emptyPillText}>Not set</Text>
          </View>
        </View>
        <Text style={styles.emptyHintText}>
          No preferences marked as {cfg.label.toLowerCase()} yet.
        </Text>
      </View>
    );
  }

  // Group items by category
  const categories = section.items.reduce<
    Record<string, ClientPreferenceItem[]>
  >((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <View style={styles.tierBlock}>
      <View style={[globalStyles.row, styles.tierHeader]}>
        <View style={[styles.tierBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.tierIcon, { color: cfg.color }]}>
            {cfg.icon}
          </Text>
          <Text style={[styles.tierLabel, { color: cfg.color }]}>
            {cfg.label}
          </Text>
        </View>
        <View style={[styles.countPill, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.countText, { color: cfg.color }]}>
            {section.items.length}
          </Text>
        </View>
      </View>

      {Object.entries(categories).map(([category, items]) => (
        <View key={category} style={styles.categoryGroup}>
          <Text style={styles.categoryLabel}>{category}</Text>
          <View style={styles.chipGrid}>
            {items.map((item) => (
              <PreferenceChip key={item.key} item={item} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AgentClientPreferences({
  route,
  navigation,
}: Readonly<Props>) {
  const { clientProfileId, clientName } = route.params;
  const { data, isLoading, isError, refetch, isRefetching } =
    useAgentClientPreferences(clientProfileId);

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleEditPreferences = useCallback(() => {
    navigation.navigate("ClientPreferences", {
      userType: "Agent",
      clientProfileId: clientProfileId,
    });
  }, [navigation, clientProfileId]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={globalStyles.safeContainer}>
        <View style={globalStyles.centeredFull}>
          <ActivityIndicator size="large" color={colors.primary.default} />
          <Text style={[typography.caption, { marginTop: spacing["3xl"] }]}>
            Loading preferences…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <SafeAreaView style={globalStyles.safeContainer}>
        <View style={globalStyles.centeredFull}>
          <Text style={styles.errorIcon}>⚠</Text>
          <Text style={[typography.h3, { marginTop: spacing.xl }]}>
            Could not load preferences
          </Text>
          <Text
            style={[
              typography.bodySmall,
              { marginTop: spacing.md, textAlign: "center" },
            ]}
          >
            Check your connection and try again.
          </Text>
          <TouchableOpacity
            style={[globalStyles.btnPrimary, styles.retryBtn]}
            onPress={handleRefresh}
          >
            <Text style={typography.buttonPrimary}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Content ───────────────────────────────────────────────────────────────
  const orderedSections = TIER_ORDER.map(
    (tier) => data.sections.find((s) => s.tier === tier) ?? { tier, items: [] },
  ) as ClientPreferenceSection[];

  const totalItems = data.sections.reduce((sum, s) => sum + s.items.length, 0);
  const filledTiers = data.sections.filter((s) => s.items.length > 0).length;

  return (
    <SafeAreaView style={globalStyles.safeContainer}>
      <ScrollView
        style={globalStyles.flex1}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary.default}
          />
        }
      >
        <ClientContextCard
          clientName={clientName}
          clientProfileId={clientProfileId}
          onEditPress={handleEditPreferences}
        />

        {/* Completeness card */}
        <CompletenessBar
          percent={data.completeness.percent}
          setCount={data.completeness.setCount}
          totalCount={data.completeness.totalCount}
        />

        {/* Summary strip */}
        <View style={styles.summaryStrip}>
          <View style={styles.summaryItem}>
            <Text style={[typography.h1, { color: colors.primary.default }]}>
              {totalItems}
            </Text>
            <Text style={typography.caption}>Preferences</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[typography.h1, { color: colors.primary.default }]}>
              {filledTiers}
            </Text>
            <Text style={typography.caption}>Tiers Filled</Text>
          </View>
          {/* <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[typography.h1, { color: colors.primary.default }]}>v{data.version}</Text>
            <Text style={typography.caption}>Version</Text>
          </View> */}
        </View>

        {data.completeness.percent < 60 && (
          <View style={styles.guidanceCard}>
            <Text style={styles.guidanceTitle}>Quick win</Text>
            <Text style={styles.guidanceText}>
              Add at least one “Must Have” and one “Important” preference to
              make recommendations more accurate.
            </Text>
          </View>
        )}

        {/* Tier sections */}
        <View style={styles.sectionsContainer}>
          <Text style={[typography.sectionTitle, { marginBottom: spacing.xl }]}>
            Preference Breakdown
          </Text>
          {orderedSections.map((section) => (
            <TierSection key={section.tier} section={section} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Scroll
  scrollContent: {
    paddingHorizontal: spacing["3xl"],
    paddingTop: spacing["3xl"],
    paddingBottom: spacing["9xl"],
    gap: spacing["3xl"],
  },

  // Client context
  contextCard: {
    gap: spacing.md,
  },
  contextHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  contextEyebrow: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: colors.text.muted,
    marginBottom: spacing.xxs,
  },
  contextName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text.primary,
  },
  contextSubtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  contextEditBtn: {
    backgroundColor: colors.primary.default,
    borderRadius: border.radius.pill,
    paddingHorizontal: spacing["3xl"],
    paddingVertical: spacing.md,
    minWidth: 76,
    alignItems: "center",
    justifyContent: "center",
  },
  contextEditBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text.inverse,
  },

  // Completeness card
  completenessCard: {
    gap: spacing.xl,
  },
  completenessRight: {
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  percentBadge: {
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.background.subtle,
    borderRadius: border.radius.full,
    overflow: "hidden",
    marginTop: spacing.md,
  },
  progressFill: {
    height: 8,
    borderRadius: border.radius.full,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: border.radius.full,
  },

  // Summary strip
  summaryStrip: {
    backgroundColor: colors.background.surface,
    borderRadius: border.radius.card,
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing["4xl"],
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
  },
  summaryDivider: {
    width: border.width.thin,
    height: 36,
    backgroundColor: colors.border.default,
  },

  // Tier sections
  sectionsContainer: {
    gap: spacing.xl,
  },
  tierBlock: {
    backgroundColor: colors.background.surface,
    borderRadius: border.radius.card,
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  tierHeader: {
    paddingHorizontal: spacing["3xl"],
    paddingVertical: spacing.xl,
    gap: spacing.md,
    borderBottomWidth: border.width.thin,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.screen,
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xs,
    borderRadius: border.radius.pill,
  },
  tierIcon: {
    fontSize: 12,
  },
  tierLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  countPill: {
    minWidth: 24,
    height: 24,
    borderRadius: border.radius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyPill: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxs,
    backgroundColor: colors.background.badge,
    borderRadius: border.radius.pill,
  },
  emptyPillText: {
    fontSize: 12,
    color: colors.text.muted,
    fontWeight: "500",
  },
  emptyHintText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: spacing.md,
    paddingHorizontal: spacing["3xl"],
    paddingBottom: spacing.xl,
  },

  // Category group inside a tier
  categoryGroup: {
    paddingHorizontal: spacing["3xl"],
    paddingVertical: spacing.xl,
    borderBottomWidth: border.width.thin,
    borderBottomColor: colors.border.light,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text.muted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: spacing.xl,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },

  // Preference chip
  chip: {
    backgroundColor: colors.background.selected,
    borderWidth: border.width.thin,
    borderColor: colors.primary.light,
    borderRadius: border.radius.item,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.xxs,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text.muted,
    letterSpacing: 0.3,
  },
  chipValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary.default,
  },

  // Error / retry
  errorIcon: {
    fontSize: 40,
    color: colors.warning.default,
  },
  retryBtn: {
    marginTop: spacing["6xl"],
    paddingHorizontal: spacing["6xl"],
  },

  // Guidance
  guidanceCard: {
    backgroundColor: colors.primary.light,
    borderRadius: border.radius.card,
    borderWidth: border.width.thin,
    borderColor: colors.primary.default,
    paddingHorizontal: spacing["3xl"],
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  guidanceTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary.default,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  guidanceText: {
    ...typography.bodySmall,
    color: colors.text.primary,
  },
});
