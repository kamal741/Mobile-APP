/**
 * @file RecommendationScreen.tsx
 * @description AI-powered property recommendations for a client.
 *              - Real data from useClientRecommendations
 *              - PropertyPhotoCarousel for real images
 *              - "View Property" navigates to PropertyDetails
 *              - Heart button saves/unsaves via client shortlist API
 *              - First 2 cards expanded, rest collapsed
 *              - "Load More" for pagination
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';

import { colors } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import { PropertyPhotoCarousel } from '@/components/PropertyPhotoCarousel';
import {
  useClientRecommendations,
  RecommendationItem,
  recommendationQueryKeys,
} from '@/lib/agentApi';
import {
  useClientShortlists,
  useSaveClientShortlist,
  useRemoveClientShortlist,
} from '@/lib/clientApi';
import { ClientFooter } from '../components/ClientFooter';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CIRCUMFERENCE = 2 * Math.PI * 22;

function scoreBarColor(value: number): string {
  if (value >= 80) return '#16a34a';
  if (value >= 65) return '#d97706';
  return '#dc2626';
}

function getRingOffset(score: number): number {
  return CIRCUMFERENCE * (1 - score / 100);
}

function ringColorForScore(score: number): string {
  if (score >= 80) return '#4ade80';
  if (score >= 60) return '#fbbf24';
  return '#f87171';
}

function formatPrice(price: number): string {
  return `$${price.toLocaleString('en-CA', { maximumFractionDigits: 0 })}`;
}

function formatGeneratedAt(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const oneDayMs = 24 * 60 * 60 * 1000;
  const dayDiff = Math.round((startOfToday.getTime() - startOfTarget.getTime()) / oneDayMs);
  const timePart = parsed.toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (dayDiff === 0) return `Today, ${timePart}`;
  if (dayDiff === 1) return `Yesterday, ${timePart}`;

  const datePart = parsed.toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
  });
  return `${datePart}, ${timePart}`;
}

function getLastRecommendationCalculatedAt(items: RecommendationItem[]): string | null {
  const latestMs = items.reduce<number | null>((latest, item) => {
    const calculatedAt = new Date(item.recommendation.calculatedAt).getTime();
    if (Number.isNaN(calculatedAt)) return latest;
    return latest === null || calculatedAt > latest ? calculatedAt : latest;
  }, null);

  return latestMs === null ? null : new Date(latestMs).toISOString();
}

function cardBgColor(rank: number): string {
  const palette = [
    '#818cf8', '#34d399', '#f59e0b', '#f87171',
    '#60a5fa', '#a78bfa', '#2dd4bf', '#fb923c',
    '#4ade80', '#e879f9',
  ];
  return palette[(rank - 1) % palette.length];
}

function formatPropertyTypeLabel(value: string | null | undefined): string {
  if (!value) return 'Property';

  const normalized = value.trim().toLowerCase().replace(/[_\s-]+/g, ' ');
  const directMap: Record<string, string> = {
    all: 'All',
    'all property type': 'All',
    detached: 'Detached',
    'semi detached': 'Semi-Detached',
    'freehold townhouse': 'Freehold Townhouse',
    'condo townhouse': 'Condo Townhouse',
    'condo apt': 'Condo Apt',
    link: 'Link',
    multiplex: 'Multiplex',
    'vacant land': 'Vacant Land',
  };

  if (directMap[normalized]) return directMap[normalized];

  return normalized
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonBlock({ width, height, style }: Readonly<{
  width?: number | string;
  height: number;
  style?: object;
}>) {
  const anim = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 1300, easing: Easing.linear, useNativeDriver: false })
    ).start();
  }, [anim]);
  const bg = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['#e2e8f0', '#f1f5f9', '#e2e8f0'] });
  return (
    <Animated.View style={[{ backgroundColor: bg, borderRadius: 8, height, width: width ?? '100%' }, style]} />
  );
}

function ScoreRing({
  score,
  color,
  collapsed,
}: Readonly<{ score: number; color: string; collapsed?: boolean }>) {
  const offset = getRingOffset(score);
  return (
    <View style={[s.ringWrap, collapsed && s.ringWrapCollapsed]}>
      <Svg width={52} height={52} viewBox="0 0 52 52">
        <Circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={4} />
        <Circle
          cx="26" cy="26" r="22" fill="none"
          stroke={color} strokeWidth={4} strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE}`} strokeDashoffset={offset}
          transform="rotate(-90 26 26)"
        />
      </Svg>
      <View style={s.ringLabelWrap}>
        <Text style={s.ringPct}>{Math.round(score)}%</Text>
        <Text style={s.ringWord}>match</Text>
      </View>
    </View>
  );
}

function ScoreRow({
  label,
  emoji,
  value,
  available = true,
}: Readonly<{ label: string; emoji: string; value: number; available?: boolean }>) {
  const boundedValue = Math.max(0, Math.min(100, value));
  return (
    <View style={s.scoreRow}>
      <Text style={s.scoreLabel}>{emoji} {label}</Text>
      <View style={s.scoreTrack}>
        {available && (
          <View
            style={[
              s.scoreFill,
              { width: `${boundedValue}%` as any, backgroundColor: scoreBarColor(boundedValue) },
            ]}
          />
        )}
      </View>
      <Text style={s.scorePct} numberOfLines={1}>
        {available ? `${Math.round(boundedValue)}%` : 'N/A'}
      </Text>
    </View>
  );
}

const scoreEmoji: Record<string, string> = {
  min_budget: '💰',
  max_budget: '💰',
  property_type: '🏠',
  bedrooms: '🛏',
  bathrooms: '🛁',
  area: '📍',
  municipality: '📍',
  community: '📍',
  school_rating: '🏫',
  basement: '⬇️',
  parking: '🚗',
  backyard: '🌳',
  lot_front: '📏',
  lot_depth: '📐',
  age_of_property: '🔧',
  community_pref: '✨',
};

const scoreTierGroups = [
  { key: 'must_have', label: 'Must Have', icon: '◆', color: '#dc2626', backgroundColor: '#fff7f7' },
  { key: 'important', label: 'Important', icon: '●', color: '#d97706', backgroundColor: '#fffbeb' },
  { key: 'low_priority', label: 'Low Priority', icon: '▲', color: '#2563eb', backgroundColor: '#eff6ff' },
  { key: 'not_important', label: 'Not Important', icon: '○', color: '#64748b', backgroundColor: '#f8fafc' },
] as const;

type DisplayScore = {
  label: string;
  emoji: string;
  value: number;
  available: boolean;
  priorityTier: string | null;
};

function sortScoresByPercentage<T extends { value: number; available: boolean }>(scores: T[]): T[] {
  return [...scores].sort((left, right) => {
    if (left.available !== right.available) {
      return left.available ? -1 : 1;
    }
    return right.value - left.value;
  });
}

function averageAvailableScore(scores: DisplayScore[]): number | null {
  const available = scores.filter(score => score.available);
  if (available.length === 0) return null;
  return Math.round(available.reduce((total, score) => total + score.value, 0) / available.length);
}

function formatGroupAverage(scores: DisplayScore[]): string {
  const average = averageAvailableScore(scores);
  return average === null ? 'No listing data' : `${average}% avg`;
}

// ─── Recommendation Card ──────────────────────────────────────────────────────

function RecommendationCard({
  item,
  collapsed,
  shortlisted,
  isSaving,
  onToggleShortlist,
  onToggleCollapse,
  onViewProperty,
}: Readonly<{
  item:              RecommendationItem;
  collapsed:         boolean;
  shortlisted:       boolean;
  isSaving:          boolean;
  onToggleShortlist: (id: number) => void;
  onToggleCollapse:  (id: number) => void;
  onViewProperty:    (id: number) => void;
}>) {
  const { recommendation: rec, property: prop } = item;
  const ringColor = ringColorForScore(rec.overallScore);
  const bgColor   = cardBgColor(rec.rankPosition);
  const propertyTypeLabel = formatPropertyTypeLabel(prop.propertyType);
  const detailedComponents = rec.components;

  // Only Property Photo entries for the carousel
  const displayPhotos = (prop.photos ?? []).filter(
    (p) => !p.mediaCategory || p.mediaCategory === 'Property Photo',
  );

  const scores: DisplayScore[] = detailedComponents.map(component => ({
        label: component.label,
        emoji: scoreEmoji[component.key] ?? '•',
        value: component.score,
        available: component.available,
        priorityTier: component.priorityTier,
      }));

  const scoreGroups = scoreTierGroups.map(tier => ({
        ...tier,
        scores: sortScoresByPercentage(
          scores.filter(score => score.priorityTier === tier.key),
        ),
      }));

  const strongMatchCount = scores.filter(score => score.available && score.value >= 80).length;
  const closeMatchCount = scores.filter(
    score => score.available && score.value >= 65 && score.value < 80,
  ).length;
  const reviewCount = scores.filter(score => score.available && score.value < 65).length;
  const unavailableCount = scores.filter(score => !score.available).length;
  const isAlternative = rec.recommendationType === 'CLOSEST_ALTERNATIVE';

  return (
    <View style={s.card}>
      {/* ── Photo strip ── */}
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => onViewProperty(prop.id)}
      >
        <View style={s.cardPhoto}>
          {displayPhotos.length > 0 ? (
            <PropertyPhotoCarousel
              photos={displayPhotos}
              imageUrl={prop.imageUrl ?? undefined}
              height={180}
              showIndicators={!collapsed}
            />
          ) : (
            // Fallback colour block when no photos available
            <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={s.photoLabel}>📷 No Photo</Text>
            </View>
          )}

          {/* Rank badge */}
          <View style={s.rankBadge}>
            <Text style={s.rankBadgeText}>🏅 #{rec.rankPosition}</Text>
          </View>

          {/* Heart / shortlist */}
          <TouchableOpacity
            style={s.heartBtn}
            onPress={() => onToggleShortlist(prop.id)}
            disabled={isSaving}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.error?.default ?? '#ef4444'} />
            ) : (
              <Text style={[s.heartIcon, shortlisted && s.heartIconSaved]}>
                {shortlisted ? '♥' : '♡'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Score ring */}
          <ScoreRing score={rec.overallScore} color={ringColor} collapsed={collapsed} />
        </View>
      </TouchableOpacity>

      {/* ── Card body ── */}
      <View style={[s.cardBody, collapsed && s.cardBodyCollapsed]}>
        {collapsed ? (
          <View style={s.collapsedRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.propAddressSmall} numberOfLines={1}>{prop.address}</Text>
              <Text style={s.propMeta}>
                {propertyTypeLabel} · {prop.bedrooms} bd · {prop.bathrooms} ba
              </Text>
              <Text style={s.propPriceSmall}>{formatPrice(prop.price)}</Text>
            </View>
            <TouchableOpacity style={s.expandChip} onPress={() => onToggleCollapse(prop.id)}>
              <Text style={s.expandChipText}>Expand ↓</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={s.propAddress}>{prop.address}</Text>
            <Text style={s.propMeta}>
              {propertyTypeLabel} · {prop.bedrooms} bd · {prop.bathrooms} ba · {prop.city}
            </Text>
            <Text style={s.propPrice}>{formatPrice(prop.price)}</Text>

            <View style={s.recommendationMetaRow}>
              <View style={[s.recommendationTypeBadge, isAlternative && s.alternativeTypeBadge]}>
                <Text style={[s.recommendationTypeText, isAlternative && s.alternativeTypeText]}>
                  {isAlternative ? 'Nearby / closest alternative' : 'Best match'}
                </Text>
              </View>
              <Text style={s.confidenceText}>
                {rec.qualityBand} · {Math.round(rec.confidenceScore)}% confidence
              </Text>
            </View>

            {/* Match reason */}
            <View style={s.matchReasonBox}>
              <Text style={s.matchReasonText}>✦ "{rec.matchReason}"</Text>
            </View>

            {/* Score bars */}
            <View style={s.scoreSection}>
              <View style={s.scoreSectionHeader}>
                <View>
                  <Text style={s.scoreSectionEyebrow}>PREFERENCE FIT</Text>
                  <Text style={s.scoreSectionTitle}>Your match at a glance</Text>
                </View>
                <View style={s.componentCountBadge}>
                  <Text style={s.componentCountText}>
                    {scores.length} preferences
                  </Text>
                </View>
              </View>

              <View style={s.matchSummary}>
                <View style={[s.summaryChip, s.summaryChipStrong]}>
                  <Text style={[s.summaryChipValue, s.summaryTextStrong]}>{strongMatchCount}</Text>
                  <Text style={[s.summaryChipLabel, s.summaryTextStrong]}>Strong</Text>
                </View>
                <View style={[s.summaryChip, s.summaryChipClose]}>
                  <Text style={[s.summaryChipValue, s.summaryTextClose]}>{closeMatchCount}</Text>
                  <Text style={[s.summaryChipLabel, s.summaryTextClose]}>Close</Text>
                </View>
                <View style={[s.summaryChip, s.summaryChipReview]}>
                  <Text style={[s.summaryChipValue, s.summaryTextReview]}>{reviewCount}</Text>
                  <Text style={[s.summaryChipLabel, s.summaryTextReview]}>Review</Text>
                </View>
                {unavailableCount > 0 && (
                  <View style={[s.summaryChip, s.summaryChipUnavailable]}>
                    <Text style={s.summaryChipValue}>{unavailableCount}</Text>
                    <Text style={s.summaryChipLabel}>N/A</Text>
                  </View>
                )}
              </View>

              {scoreGroups.map(group => (
                group.scores.length > 0 && (
                  <View
                    key={group.key}
                    style={[
                      s.scoreGroup,
                      {
                        borderLeftColor: group.color,
                        backgroundColor: group.backgroundColor,
                      },
                    ]}
                  >
                    <View style={s.scoreGroupHeader}>
                      <Text style={[s.scoreGroupLabel, { color: group.color }]}>
                        {group.icon}  {group.label}
                      </Text>
                      <Text style={s.scoreGroupMeta}>
                        {group.scores.length} · {formatGroupAverage(group.scores)}
                      </Text>
                    </View>
                    {group.scores.map(sc => (
                      <ScoreRow
                        key={sc.label}
                        label={sc.label}
                        emoji={sc.emoji}
                        value={sc.value}
                        available={sc.available}
                      />
                    ))}
                  </View>
                )
              ))}
            </View>

            {/* Highlights */}
            {rec.highlights.length > 0 && (
              <>
                <Text style={s.sectionLabel}>✅  HIGHLIGHTS</Text>
                {rec.highlights.map((h, i) => (
                  <Text key={`${h}-${rec.rankPosition}-${i}`} style={s.highlightItem}>• {h}</Text>
                ))}
              </>
            )}

            {/* Deal breakers */}
            {rec.dealBreakers.length > 0 && (
              <>
                <View style={{ height: 8 }} />
                <Text style={s.sectionLabel}>⚠️  WATCH OUT</Text>
                {rec.dealBreakers.map((w, i) => (
                  <Text key={`${w}-${rec.rankPosition}-${i}`} style={s.dealbreakerItem}>• {w}</Text>
                ))}
              </>
            )}

            {/* CTA row */}
            <View style={s.btnRow}>
              <TouchableOpacity
                style={s.ctaBtn}
                onPress={() => onViewProperty(prop.id)}
                activeOpacity={0.85}
              >
                <Text style={s.ctaBtnText}>View Property →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.collapseBtn} onPress={() => onToggleCollapse(prop.id)}>
                <Text style={s.collapseBtnText}>Collapse ↑</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <>
      {[1, 2].map((i) => (
        <View key={i} style={[s.card, { marginTop: i === 1 ? 12 : 0 }]}>
          <SkeletonBlock height={180} style={{ borderRadius: 0 }} />
          <View style={s.cardBody}>
            <SkeletonBlock height={12} width="92%" style={{ marginBottom: 9 }} />
            <SkeletonBlock height={12} width="72%" style={{ marginBottom: 9 }} />
            <SkeletonBlock height={12} width="50%" style={{ marginBottom: 18 }} />
            <SkeletonBlock height={12} width="92%" style={{ marginBottom: 9 }} />
            <SkeletonBlock height={12} width="72%" style={{ marginBottom: 9 }} />
            <SkeletonBlock height={12} width="50%" />
          </View>
        </View>
      ))}
    </>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onGoToPreferences }: Readonly<{ onGoToPreferences: () => void }>) {
  return (
    <View style={s.emptyCard}>
      <Text style={s.emptyIcon}>🏠</Text>
      <Text style={s.emptyTitle}>No recommendations found</Text>
      <Text style={s.emptySub}>
        We could not find matches after the latest refresh.
        Update preferences to improve recommendation quality and try again.
      </Text>
      <TouchableOpacity style={s.emptyCta} onPress={onGoToPreferences}>
        <Text style={s.emptyCtaText}>Update Preferences →</Text>
      </TouchableOpacity>
    </View>
  );
}

function RecommendationsListContent({
  refreshing,
  onRefresh,
  formattedGeneratedAt,
  totalElements,
  filteredItems,
  isError,
  collapseMap,
  shortlistSet,
  savingSet,
  onToggleShortlist,
  onToggleCollapse,
  onViewProperty,
  hasMore,
  isLoadingMore,
  onLoadMore,
  allItemsLength,
  viewFilter,
  onChangeViewFilter,
  scoreFilter,
  defaultMinScore,
  onChangeScoreFilter,
}: Readonly<{
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  formattedGeneratedAt: string | null;
  totalElements: number | null;
  filteredItems: RecommendationItem[];
  isError: boolean;
  collapseMap: Record<number, boolean>;
  shortlistSet: Set<number>;
  savingSet: Set<number>;
  onToggleShortlist: (id: number) => void;
  onToggleCollapse: (id: number) => void;
  onViewProperty: (id: number) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  allItemsLength: number;
  viewFilter: RecommendationViewFilter;
  onChangeViewFilter: (next: RecommendationViewFilter) => void;
  scoreFilter: ScoreFilterValue;
  defaultMinScore: number;
  onChangeScoreFilter: (next: ScoreFilterValue) => void;
}>) {
  const bestMatchItems = filteredItems.filter(
    item => item.recommendation.recommendationType === 'BEST_MATCH',
  );

  const remainingItems = filteredItems.filter(
    item => item.recommendation.recommendationType === 'CLOSEST_ALTERNATIVE',
  );
  const hasOnlyClosestAlternatives =
    remainingItems.length > 0 &&
    remainingItems.every(item => item.recommendation.recommendationType === 'CLOSEST_ALTERNATIVE');

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={INDIGO}
          colors={[INDIGO]}
        />
      }
    >
      <View style={s.insightBanner}>
        <View style={s.insightHeaderRow}>
          <Text style={s.insightEmoji}>✨</Text>
          <Text style={s.insightBannerTitle}>Recommended for you</Text>
        </View>
        <Text style={s.insightBannerText}>
          Personalized using your budget, location, property type, size, and lifestyle priorities.
        </Text>
        <View style={s.updatedRow}>
          {!!formattedGeneratedAt && (
            <View style={s.updatedPill}>
              <Text style={s.updatedPillText}>Last updated {formattedGeneratedAt}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[s.refreshPillBtn, refreshing && s.refreshPillBtnDisabled]}
            onPress={() => {
              void onRefresh();
            }}
            activeOpacity={0.85}
            disabled={refreshing}
          >
            <Text style={s.refreshPillBtnText}>{refreshing ? 'Refreshing...' : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.metaStrip}>
        <Text style={s.metaLabel}>Showing recommendations</Text>
        {totalElements !== null && (
          <Text style={s.metaText}>
            <Text style={s.metaTextStrong}>{filteredItems.length}</Text>
            {' out of '}
            <Text style={s.metaTextStrong}>{totalElements}</Text>
            {' matches'}
            {scoreFilter !== null && (
              <>
                {' with '}
                <Text style={s.metaTextStrong}>{scoreFilter}%+</Text>
                {' score'}
              </>
            )}
          </Text>
        )}
        <Text style={s.metaHint}>Default recommendation score starts at {defaultMinScore}%.</Text>
      </View>

      <View style={s.chipScroll}>
        <View style={s.chipRow}>
          {([
            ['FULL', 'Full'],
            ['BEST', 'Best Match'],
            ['CLOSEST', 'Closest Alternatives'],
          ] as const).map(([value, label]) => {
            const active = viewFilter === value;
            return (
              <TouchableOpacity
                key={value}
                style={[s.chip, active && s.chipActive]}
                onPress={() => onChangeViewFilter(value)}
                activeOpacity={0.85}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={s.scoreFilterBar}>
        <View style={s.scoreFilterHeader}>
          <Text style={s.scoreFilterLabel}>Overall score</Text>
          <Text style={s.scoreFilterValue}>
            {scoreFilter === null ? 'All scores' : `${scoreFilter}% and above`}
          </Text>
        </View>
        <View style={s.scoreFilterRow}>
          {SCORE_FILTER_OPTIONS.map((value) => {
            const active = scoreFilter === value;
            const label = value === null ? 'All' : `${value}+`;
            return (
              <TouchableOpacity
                key={value === null ? 'all' : value}
                style={[s.scoreChip, active && s.scoreChipActive]}
                onPress={() => onChangeScoreFilter(value)}
                activeOpacity={0.85}
              >
                <Text style={[s.scoreChipText, active && s.scoreChipTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isError && (
        <View style={s.errorBanner}>
          <Text style={s.errorText}>⚠️ Failed to load. Pull to refresh.</Text>
        </View>
      )}

      {bestMatchItems.length > 0 && (
        <Text style={s.resultSectionTitle}>BEST MATCHES</Text>
      )}
      {bestMatchItems.map(item => (
          <RecommendationCard
            key={item.property.id}
            item={item}
            collapsed={collapseMap[item.property.id] ?? true}
            shortlisted={shortlistSet.has(item.property.id)}
            isSaving={savingSet.has(item.property.id)}
            onToggleShortlist={onToggleShortlist}
            onToggleCollapse={onToggleCollapse}
            onViewProperty={onViewProperty}
          />
        ))}

      {remainingItems.length > 0 && (
        <View style={s.alternativeSectionHeader}>
          <Text style={s.alternativeSectionTitle}>
            {hasOnlyClosestAlternatives ? 'CLOSEST ALTERNATIVES' : 'OTHER MATCHES'}
          </Text>
          {hasOnlyClosestAlternatives && (
            <Text style={s.alternativeSectionCopy}>
              These expand location or relax one requirement so you still have useful options.
            </Text>
          )}
        </View>
      )}
      {remainingItems.map(item => (
          <RecommendationCard
            key={item.property.id}
            item={item}
            collapsed={collapseMap[item.property.id] ?? true}
            shortlisted={shortlistSet.has(item.property.id)}
            isSaving={savingSet.has(item.property.id)}
            onToggleShortlist={onToggleShortlist}
            onToggleCollapse={onToggleCollapse}
            onViewProperty={onViewProperty}
          />
        ))}

      {hasMore && (
        <TouchableOpacity
          style={[s.loadMore, isLoadingMore && s.loadMoreDisabled]}
          onPress={onLoadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={INDIGO} />
              <Text style={s.loadMoreText}>Loading…</Text>
            </View>
          ) : (
            <Text style={s.loadMoreText}>Load More ↓</Text>
          )}
        </TouchableOpacity>
      )}

      {!hasMore && allItemsLength > 0 && (
        <View style={s.allLoaded}>
          <Text style={s.allLoadedText}>✓ All {totalElements} recommendations shown</Text>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;
const FALLBACK_DEFAULT_MIN_SCORE = 30;
const SCORE_FILTER_OPTIONS = [null, 30, 50, 65, 80] as const;

type RecommendationViewFilter = 'FULL' | 'BEST' | 'CLOSEST';
type ScoreFilterValue = (typeof SCORE_FILTER_OPTIONS)[number];

export default function RecommendationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();

  // ── Pagination ─────────────────────────────────────────────────────────────
  const [page, setPage]             = useState(0);
  const [allItems, setAllItems]     = useState<RecommendationItem[]>([]);
  const [viewFilter, setViewFilter] = useState<RecommendationViewFilter>('FULL');
  const [scoreFilter, setScoreFilter] = useState<ScoreFilterValue>(null);
  const [defaultMinScore, setDefaultMinScore] = useState(FALLBACK_DEFAULT_MIN_SCORE);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [totalElements, setTotalElements] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { data, isLoading, isError } = useClientRecommendations(
    { page, size: PAGE_SIZE, minScore: scoreFilter ?? undefined },
    { enabled: true },
  );

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);

  const invalidateRecommendations = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: recommendationQueryKeys.all });
  }, [queryClient]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(0);
    try {
      await invalidateRecommendations();
    } finally {
      setRefreshing(false);
    }
  }, [invalidateRecommendations]);

  useFocusEffect(
    useCallback(() => {
      // Keep the currently rendered list while refreshing in the background.
      // Clearing it here can leave the screen empty when React Query reuses
      // structurally identical cached data after returning from details.
      void invalidateRecommendations();
    }, [invalidateRecommendations])
  );

  const filteredItems = useMemo(() => {
    if (viewFilter === 'FULL') return allItems;

    if (viewFilter === 'BEST') {
      return allItems.filter(item => item.recommendation.recommendationType === 'BEST_MATCH');
    }

    return allItems.filter(item => item.recommendation.recommendationType === 'CLOSEST_ALTERNATIVE');
  }, [allItems, viewFilter]);

  React.useEffect(() => {
    if (!data) return;
    setTotalPages(data.totalPages);
    setTotalElements(data.totalElements);
    setDefaultMinScore(data.defaultMinScore ?? FALLBACK_DEFAULT_MIN_SCORE);
    if (page === 0) {
      setAllItems(data.items);
    } else {
      setAllItems(prev => {
        const existingIds = new Set(prev.map(i => i.property.id));
        const fresh = data.items.filter(i => !existingIds.has(i.property.id));
        return [...prev, ...fresh];
      });
    }
    setIsLoadingMore(false);
  }, [data, page]);

  // ── Collapse state: first 2 expanded, rest collapsed ──────────────────────
  const [collapseMap, setCollapseMap] = useState<Record<number, boolean>>({});

  React.useEffect(() => {
    if (allItems.length === 0) return;
    setCollapseMap(prev => {
      const next = { ...prev };
      allItems.forEach((item, idx) => {
        const pid = item.property.id;
        if (!(pid in next)) next[pid] = idx >= 2;
      });
      return next;
    });
  }, [allItems]);

  // ── Shortlist state ────────────────────────────────────────────────────────
  const { data: shortlists = [] }  = useClientShortlists();
  const saveShortlist              = useSaveClientShortlist();
  const removeShortlist            = useRemoveClientShortlist();

  /** Ids currently being mutated (for the spinner) */
  const [savingSet, setSavingSet] = useState<Set<number>>(new Set());

  /** Derived from server data — always reflects real saved state */
  const shortlistSet = new Set(shortlists.map((s) => s.masterPropertyId));

  const toggleShortlist = useCallback(async (propertyId: number) => {
    setSavingSet(prev => new Set(prev).add(propertyId));
    try {
      if (shortlistSet.has(propertyId)) {
        await removeShortlist.mutateAsync(propertyId);
      } else {
        await saveShortlist.mutateAsync({ masterPropertyId: propertyId });
      }
    } catch {
      // mutations auto-invalidate the cache; nothing extra needed on error
    } finally {
      setSavingSet(prev => {
        const next = new Set(prev);
        next.delete(propertyId);
        return next;
      });
    }
  }, [shortlistSet, saveShortlist, removeShortlist]);

  // ── Collapse toggle ────────────────────────────────────────────────────────
  const toggleCollapse = useCallback((id: number) => {
    setCollapseMap(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleScoreFilterChange = useCallback((next: ScoreFilterValue) => {
    setScoreFilter(next);
    setPage(0);
    setAllItems([]);
    setTotalPages(null);
    setTotalElements(null);
    setIsLoadingMore(false);
  }, []);

  // ── Navigate to property details ──────────────────────────────────────────
  const handleViewProperty = useCallback((propertyId: number) => {
    navigation.navigate('PropertyDetails', { propertyId });
  }, [navigation]);

  // ── Load more ──────────────────────────────────────────────────────────────
  const handleLoadMore = () => {
    setPage((currentPage) => {
      if (totalPages !== null && currentPage + 1 >= totalPages) return currentPage;
      setIsLoadingMore(true);
      return currentPage + 1;
    });
  };

  const hasMore = totalPages !== null && page + 1 < totalPages;
  const lastRecommendationCalculatedAt = useMemo(
    () => getLastRecommendationCalculatedAt(allItems),
    [allItems],
  );
  const formattedGeneratedAt = formatGeneratedAt(lastRecommendationCalculatedAt);
  const handleGoToPreferences = useCallback(() => {
    try {
      navigation.navigate('ClientPreferences', { userType: 'Client' });
    } catch {
      navigation.push('ClientPreferences', { userType: 'Client' });
    }
  }, [navigation]);

  // ── Screen state ───────────────────────────────────────────────────────────
  const isInitialLoading = isLoading && allItems.length === 0;
  const isEmptyList = !isLoading && allItems.length === 0;

  let content: React.ReactNode;
  if (isInitialLoading) {
    content = (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <LoadingSkeleton />
      </ScrollView>
    );
  } else if (isEmptyList) {
    content = (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void handleRefresh();
            }}
            tintColor={INDIGO}
            colors={[INDIGO]}
          />
        }
      >
        <EmptyState onGoToPreferences={handleGoToPreferences} />
      </ScrollView>
    );
  } else {
    content = (
      <RecommendationsListContent
        refreshing={refreshing}
        onRefresh={handleRefresh}
        formattedGeneratedAt={formattedGeneratedAt}
        totalElements={totalElements}
        filteredItems={filteredItems}
        isError={isError}
        collapseMap={collapseMap}
        shortlistSet={shortlistSet}
        savingSet={savingSet}
        onToggleShortlist={toggleShortlist}
        onToggleCollapse={toggleCollapse}
        onViewProperty={handleViewProperty}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={handleLoadMore}
        allItemsLength={allItems.length}
        viewFilter={viewFilter}
        onChangeViewFilter={setViewFilter}
        scoreFilter={scoreFilter}
        defaultMinScore={defaultMinScore}
        onChangeScoreFilter={handleScoreFilterChange}
      />
    );
  }

  return (
    <View style={s.screen}>

      {/* ── Content ── */}
      {content}

      <ClientFooter />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const INDIGO        = '#4f46e5';
const INDIGO_LIGHT  = '#eef2ff';
const INDIGO_BORDER = '#c7d2fe';

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.screen,
  },

  // Header
  header: {
    backgroundColor: colors.background.surface,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    fontSize: 28,
    color: INDIGO,
    lineHeight: 32,
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.palette.slate900,
    lineHeight: 18,
  },
  headerSub: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 1,
  },
  refreshBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: INDIGO_LIGHT,
    borderRadius: 10,
  },
  refreshBtnText: {
    fontSize: 18,
    color: INDIGO,
    fontWeight: '700',
  },

  // Meta strip
  metaStrip: {
    marginHorizontal: 14,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metaTextStrong: {
    color: '#1f2937',
    fontWeight: '800',
  },
  metaHint: {
    marginTop: 5,
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  insightBanner: {
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 10,
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  insightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  insightEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  insightBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  insightBannerText: {
    fontSize: 12,
    color: '#0c4a6e',
    lineHeight: 17,
    fontWeight: '500',
  },
  updatedRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  updatedPill: {
    flexShrink: 1,
    backgroundColor: '#e0f2fe',
    borderColor: '#bae6fd',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  updatedPillText: {
    fontSize: 11,
    color: '#075985',
    fontWeight: '700',
  },
  refreshPillBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  refreshPillBtnDisabled: {
    opacity: 0.6,
  },
  refreshPillBtnText: {
    fontSize: 11,
    color: '#0369a1',
    fontWeight: '700',
  },
  // Error banner
  errorBanner: {
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 12,
    color: '#b91c1c',
    fontWeight: '600',
  },

  // Card
  card: {
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: colors.background.surface,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.palette.slate900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 4,
  },
  cardPhoto: {
    width: '100%',
    height: 180,
    position: 'relative',
    overflow: 'hidden',
  },
  photoLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
  },

  // Rank badge
  rankBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
    zIndex: 2,
  },
  rankBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Heart button
  heartBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 17,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 2,
  },
  heartIcon: {
    fontSize: 18,
    color: '#94a3b8',
  },
  heartIconSaved: {
    color: '#ef4444',
  },

  // Score ring
  ringWrap: {
    backgroundColor: '#00000091',
    borderRadius: 26,
    position: 'absolute',
    top: 8,
    right: 8,
    width: 52,
    height: 52,
    zIndex: 2,
  },
  ringWrapCollapsed: {
    left: undefined,
    marginLeft: 0,
    right: 8,
  },
  ringLabelWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ringPct: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 14,
    textAlign: 'center',
    includeFontPadding: false,
  },
  ringWord: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },

  // Card body
  cardBody: {
    padding: 14,
  },
  cardBodyCollapsed: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  // Collapsed row
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expandChip: {
    backgroundColor: INDIGO_LIGHT,
    borderWidth: 1,
    borderColor: INDIGO_BORDER,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  expandChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: INDIGO,
  },

  // Property info
  propAddress: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.palette.slate900,
    marginBottom: 2,
  },
  propAddressSmall: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.palette.slate900,
    marginBottom: 2,
  },
  propMeta: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 6,
  },
  propPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1d4ed8',
    marginBottom: 12,
  },
  propPriceSmall: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  recommendationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  recommendationTypeBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  alternativeTypeBadge: {
    backgroundColor: '#fff7ed',
  },
  recommendationTypeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#15803d',
    textTransform: 'uppercase',
  },
  alternativeTypeText: {
    color: '#c2410c',
  },
  confidenceText: {
    flex: 1,
    textAlign: 'right',
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },

  // Match reason
  matchReasonBox: {
    backgroundColor: INDIGO_LIGHT,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#818cf8',
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginBottom: 10,
  },
  matchReasonText: {
    fontSize: 12,
    color: '#4338ca',
    fontStyle: 'italic',
    lineHeight: 17,
  },

  // Score section
  scoreSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scoreSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  scoreSectionEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    color: '#6366f1',
    letterSpacing: 1,
    marginBottom: 2,
  },
  scoreSectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.palette.slate900,
  },
  componentCountBadge: {
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  componentCountText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4f46e5',
  },
  matchSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  summaryChip: {
    minWidth: 58,
    flexGrow: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
    alignItems: 'center',
    borderWidth: 1,
  },
  summaryChipStrong: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  summaryChipClose: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  summaryChipReview: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  summaryChipUnavailable: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  summaryChipValue: {
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '900',
    color: '#64748b',
  },
  summaryChipLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },
  summaryTextStrong: {
    color: '#15803d',
  },
  summaryTextClose: {
    color: '#b45309',
  },
  summaryTextReview: {
    color: '#b91c1c',
  },
  penaltyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  penaltyIcon: {
    fontSize: 16,
    color: '#c2410c',
    marginRight: 8,
  },
  penaltyCopy: {
    flex: 1,
  },
  penaltyTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#9a3412',
    marginBottom: 1,
  },
  penaltyNote: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400e',
  },
  scoreGroup: {
    borderLeftWidth: 3,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingTop: 9,
    paddingBottom: 3,
    marginBottom: 9,
  },
  scoreGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scoreGroupLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  scoreGroupMeta: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 7,
  },
  scoreLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    width: 100,
  },
  scoreTrack: {
    flex: 1,
    height: 7,
    backgroundColor: colors.border.default,
    borderRadius: 5,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 5,
  },
  scorePct: {
    fontSize: 11,
    lineHeight: 12,
    color: colors.text.body,
    fontWeight: '700',
    width: 36,
    textAlign: 'right',
    includeFontPadding: false,
  },

  // Highlights / watch outs
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text.secondary,
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  highlightItem: {
    fontSize: 12,
    color: colors.palette.slate800,
    marginBottom: 4,
    lineHeight: 17,
  },
  dealbreakerItem: {
    fontSize: 12,
    color: '#92400e',
    marginBottom: 4,
    lineHeight: 17,
  },
  resultSectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#15803d',
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  alternativeSectionHeader: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 14,
    marginBottom: 8,
    padding: 11,
  },
  alternativeSectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#c2410c',
    letterSpacing: 0.7,
    marginBottom: 3,
  },
  alternativeSectionCopy: {
    fontSize: 10,
    color: '#9a3412',
    lineHeight: 14,
  },

  // Buttons
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  ctaBtn: {
    flex: 2,
    backgroundColor: INDIGO,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
  },
  ctaBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  collapseBtn: {
    minWidth: 86,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border.default,
  },
  collapseBtnText: {
    color: colors.text.badge,
    fontSize: 13,
    fontWeight: '700',
  },

  // Chip filter bar
  chipScroll: {
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    backgroundColor: '#f8fafc',
  },
  chipActive: {
    backgroundColor: INDIGO_LIGHT,
    borderColor: '#818cf8',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#4338ca',
  },

  scoreFilterBar: {
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scoreFilterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  scoreFilterLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  scoreFilterValue: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'right',
  },
  scoreFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scoreChip: {
    minWidth: 52,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#dbe4f0',
    backgroundColor: '#f8fafc',
  },
  scoreChipActive: {
    borderColor: '#4f46e5',
    backgroundColor: '#eef2ff',
  },
  scoreChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  scoreChipTextActive: {
    color: '#3730a3',
  },

  // Score slider bar
  sliderBar: {
    backgroundColor: colors.background.surface,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sliderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  sliderValue: {
    fontSize: 12,
    fontWeight: '800',
    color: INDIGO,
  },
  sliderTrack: {
    height: 5,
    borderRadius: 4,
  },
  sliderThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: INDIGO,
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: INDIGO,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },

  // Load more
  loadMore: {
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 16,
    padding: 14,
    backgroundColor: colors.background.surface,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: INDIGO_BORDER,
  },
  loadMoreDisabled: {
    opacity: 0.7,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: INDIGO,
  },

  // All loaded
  allLoaded: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 8,
  },
  allLoadedText: {
    fontSize: 12,
    color: colors.text.muted,
    fontWeight: '600',
  },

  // Empty state
  emptyCard: {
    margin: 14,
    marginTop: 40,
    backgroundColor: colors.background.surface,
    borderRadius: 20,
    padding: 48,
    alignItems: 'center',
    shadowColor: colors.palette.slate900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.palette.slate900,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 22,
    textAlign: 'center',
  },
  emptyCta: {
    backgroundColor: INDIGO,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyCtaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
