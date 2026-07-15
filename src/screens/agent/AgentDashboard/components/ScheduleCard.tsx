import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../navigation/types';
import { scheduleStyles } from '../styles/schedule';
import { ScheduleTabBar } from './ScheduleTabBar';
import { RoutePlanningList } from './RoutePlanningList';
import type { Tour, ScheduleTab } from '../types';
import {
  fetchAgentOffersPage,
  withdrawOffer,
  agentOffersQueryKey,
  type AgentOffer,
  type AgentOffersPage,
} from '../../../../lib/offersApi';
import { getApiErrorMessage } from '../../../../lib/apiErrors';
import { colors } from '@/theme';
import { AlertModal } from '@/components/AlertModal';
import type { AlertModalState } from '../../TourDashboard/types/tour.types';

// ─── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  isNarrow: boolean;
  routePlanningTours: Tour[];
  pendingOffersCount: number;
  /**
   * Called whenever the active tab changes so the parent can show/hide
   * the Refresh icon for only applicable tabs.
   */
  onTabChange?: (tab: ScheduleTab) => void;
  /**
   * The parent passes a setter here; ScheduleCard calls it with the current
   * tab's refresh function so the parent can trigger it from the header.
   */
  onRegisterRefresh?: (fn: () => void) => void;
  /**
   * Optional JSX rendered in place of the old header row. Pass your own
   * header with the + and Refresh buttons here.
   */
  headerSlot?: React.ReactNode;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function formatSubmittedAt(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return null;
  }
}

// ─── OfferCard ─────────────────────────────────────────────────────────────────
interface OfferCardProps {
  offer: AgentOffer;
  onView: (offer: AgentOffer) => void;
  onWithdrawPress: (offer: AgentOffer) => void;
  isWithdrawing: boolean;
}

function OfferCard({ offer, onView, onWithdrawPress, isWithdrawing }: OfferCardProps) {
  const price = formatCurrency(offer.amount);
  const dateLabel = formatSubmittedAt(offer.submittedAt);
  const metaLine = dateLabel ? `Submitted ${dateLabel}` : '—';

  return (
    <View style={scheduleStyles.routeCard}>
      <View style={scheduleStyles.routeHeader}>
        <View style={scheduleStyles.routeInfo}>
          {/* <Text style={scheduleStyles.tourAddress} numberOfLines={1}>
            Property #{offer.masterPropertyId}
          </Text>
          <Text style={scheduleStyles.tourClient} numberOfLines={1}>
            Client #{offer.clientProfileId}{'  ·  '}Offer {price}
          </Text> */}

          <Text style={scheduleStyles.tourAddress} numberOfLines={1}>
            {offer.property?.address ?? `Property #${offer.masterPropertyId}`}
          </Text>
          <Text style={scheduleStyles.tourClient} numberOfLines={1}>
            {offer.clientDisplayName ?? `Client #${offer.clientProfileId}`}{'  ·  '}Offer {price}
          </Text>
        </View>
        {/* <View style={[scheduleStyles.statusBadge, scheduleStyles.badgeRequested]}>
          <Text style={scheduleStyles.statusBadgeText}>pending</Text>
        </View> */}
      </View>

      <View style={scheduleStyles.routeMetaRow}>
        <Text style={scheduleStyles.routeMetaLabel}>
          Submitted
        </Text>
        <Text style={scheduleStyles.routeMetaValue} numberOfLines={1}>
          {metaLine}
        </Text>
      </View>

      <View style={scheduleStyles.routeActions}>
        <TouchableOpacity
          style={scheduleStyles.routePrimaryBtn}
          onPress={() => onView(offer)}
          activeOpacity={0.85}
        >
          <Text style={scheduleStyles.routePrimaryBtnText}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            scheduleStyles.routeSecondaryBtn,
            isWithdrawing && { opacity: 0.5 },
          ]}
          onPress={() => onWithdrawPress(offer)}
          disabled={isWithdrawing}
          activeOpacity={0.85}
        >
          {isWithdrawing ? (
            <ActivityIndicator size="small" color={colors.text.secondary} />
          ) : (
            <Text style={scheduleStyles.routeSecondaryBtnText}>Withdraw</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── PendingOffersBody ─────────────────────────────────────────────────────────
const QUERY_OPTIONS = { page: 0, size: 50, status: 'pending' } as const;

interface PendingOffersBodyProps {
  /** Called by the parent to expose a refresh function for this tab */
  onRegisterRefresh?: (fn: () => void) => void;
}

function PendingOffersBody({ onRegisterRefresh }: PendingOffersBodyProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const qc = useQueryClient();

  const { data: page, isLoading, isError, error, refetch } = useQuery({
    queryKey: agentOffersQueryKey(QUERY_OPTIONS),
    queryFn: () => fetchAgentOffersPage(QUERY_OPTIONS),
  });

  // Register the refetch function with the parent whenever it changes
  React.useEffect(() => {
    onRegisterRefresh?.(() => { void refetch(); });
  }, [refetch, onRegisterRefresh]);

  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [alertModal, setAlertModal] = useState<AlertModalState | null>(null);

  const withdrawMutation = useMutation({
    mutationFn: (offerId: string) => withdrawOffer(offerId),

    onMutate: (offerId: string) => {
      const previous = qc.getQueryData<AgentOffersPage>(
        agentOffersQueryKey(QUERY_OPTIONS)
      );
      if (previous) {
        qc.setQueryData(agentOffersQueryKey(QUERY_OPTIONS), {
          ...previous,
          content: previous.content.filter((o) => o.id !== offerId),
          totalElements: Math.max(0, previous.totalElements - 1),
          empty: previous.content.length <= 1,
        });
      }
      return { previous };
    },

    onError: (_err, _offerId, context) => {
      if (context?.previous) {
        qc.setQueryData(agentOffersQueryKey(QUERY_OPTIONS), context.previous);
      }
      setWithdrawingId(null);
      setAlertModal({
        visible: true,
        title: 'Withdraw Failed',
        message: 'Something went wrong. The offer was not withdrawn. Please try again.',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    },

    onSettled: (_data, err) => {
      if (!err) setWithdrawingId(null);
      void qc.invalidateQueries({ queryKey: agentOffersQueryKey(QUERY_OPTIONS) });
    },
  });

  const handleView = (offer: AgentOffer) => {
    navigation.navigate('OfferDetail', { offerId: offer.id });
  };

  const handleWithdrawPress = (offer: AgentOffer) => {
    setAlertModal({
      visible: true,
      title: 'Withdraw Offer',
      message: `Withdraw the ${formatCurrency(offer.amount)} offer for ${offer.property?.address ?? `Property #${offer.masterPropertyId}`}?\n\nThis action cannot be undone.`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw Offer',
          style: 'destructive',
          onPress: () => {
            setWithdrawingId(offer.id);
            withdrawMutation.mutate(offer.id);
          },
        },
      ],
    });
  };

  if (isLoading) {
    return (
      <View style={scheduleStyles.emptyScheduleWrap}>
        <ActivityIndicator size="large" color={colors.primary.default} />
        <Text style={scheduleStyles.emptyScheduleText}>Loading offers…</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={scheduleStyles.emptyScheduleWrap}>
        <Text style={scheduleStyles.emptyCalIcon}>⚠️</Text>
        <Text style={scheduleStyles.emptyScheduleText}>
          {getApiErrorMessage(error, 'Failed to load offers')}
        </Text>
      </View>
    );
  }

  if (!page || page.empty || page.content.length === 0) {
    return (
      <View style={scheduleStyles.emptyScheduleWrap}>
        <Text style={scheduleStyles.emptyCalIcon}>💵</Text>
        <Text style={scheduleStyles.emptyScheduleText}>
          No Offers right now
        </Text>
      </View>
    );
  }

  return (
    <>
      <AlertModal
        modal={alertModal}
        onDismiss={() => setAlertModal(null)}
      />

      <ScrollView
        style={scheduleStyles.routeListScroll}
        contentContainerStyle={scheduleStyles.routeListContent}
        showsVerticalScrollIndicator
        nestedScrollEnabled
      >
        {page.content.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            onView={handleView}
            onWithdrawPress={handleWithdrawPress}
            isWithdrawing={withdrawingId === offer.id}
          />
        ))}

        {page.totalElements > page.content.length && (
          <Text style={scheduleStyles.statusBadgeText}>
            Showing {page.content.length} of {page.totalElements} offers
          </Text>
        )}
      </ScrollView>
    </>
  );
}

// ─── FollowUpCallsBody ─────────────────────────────────────────────────────────
function FollowUpCallsBody() {
  return (
    <View style={scheduleStyles.emptyScheduleWrap}>
      <Text style={scheduleStyles.emptyCalIcon}>📞</Text>
      <Text style={scheduleStyles.emptyScheduleText}>
        No follow-up calls due right now
      </Text>
    </View>
  );
}

// ─── ScheduleCard ──────────────────────────────────────────────────────────────
export function ScheduleCard({
  isNarrow,
  routePlanningTours,
  pendingOffersCount,
  onTabChange,
  onRegisterRefresh,
  headerSlot,
}: Props) {
  const [activeTab, setActiveTab] = useState<ScheduleTab>('Route Planning');

  const handleTabPress = (tab: ScheduleTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
    // When switching away from Offers, clear the registered refresh
    // so the Refresh button only appears on applicable tabs (handled in parent).
    if (tab !== 'Offers') {
      // For Route Planning we register a no-op so parent can still call refresh
      // safely; the actual refetch is via useAgentDashboard's handleRefresh.
      onRegisterRefresh?.(() => { });
    }
  };

  const renderBody = () => {
    switch (activeTab) {
      case 'Route Planning':
        return (
          <RoutePlanningList tours={routePlanningTours} />
        );
      case 'Offers':
        return (
          <PendingOffersBody
            onRegisterRefresh={onRegisterRefresh}
          />
        );
      case 'Follow-up Calls':
        return <FollowUpCallsBody />;
      default:
        return null;
    }
  };

  return (
    <View
      style={[
        scheduleStyles.scheduleCard,
        isNarrow && { flex: undefined, width: '100%' },
      ]}
    >
      {/* ── Header — provided by parent (contains + and Refresh icons) ── */}
      {headerSlot ?? (
        // Fallback plain header if no slot is passed (keeps component self-contained)
        <View style={scheduleStyles.scheduleHeader}>
          <Text style={scheduleStyles.scheduleTitle}>Today's Schedule</Text>
        </View>
      )}

      <ScheduleTabBar activeTab={activeTab} onTabPress={handleTabPress} />

      {renderBody()}
    </View>
  );
}
