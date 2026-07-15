
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';

import { useClientOffer, ClientOffer, ClientOfferStatus } from '../../../../lib/clientApi';
import {
  colors,
  typography,
  spacing,
  border,
  shadows,
  globalStyles,
} from '@/theme';
import { ClientFooter } from '../../components/ClientFooter';

// ─── Navigation Types ──────────────────────────────────────────────────────────

type ClientOfferRouteParams = {
  ClientOffer: {
    offerId:         string;
    agentName:       string;
    mlsNumber:       string;
    propertyAddress: string;
  };
};

// ─── Status Config ─────────────────────────────────────────────────────────────

interface StatusConfig {
  label: string;
  color: string;
  bg:    string;
  dot:   string;
  icon:  string;
}

const STATUS_CONFIG: Record<ClientOfferStatus, StatusConfig> = {
  pending: {
    label: 'Pending',
    color: '#92400e',
    bg:    colors.warning.light,
    dot:   colors.warning.default,
    icon:  '⏳',
  },
  accepted: {
    label: 'Accepted',
    color: colors.success.default,
    bg:    colors.success.light,
    dot:   colors.success.default,
    icon:  '✅',
  },
  rejected: {
    label: 'Rejected',
    color: colors.error.default,
    bg:    colors.error.light,
    dot:   colors.error.default,
    icon:  '❌',
  },
  withdrawn: {
    label: 'Withdrawn',
    color: colors.text.secondary,
    bg:    colors.background.subtle,
    dot:   colors.text.muted,
    icon:  '↩️',
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style:                 'currency',
    currency:              'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

// function StatusBadge({ status }: { status: ClientOfferStatus }) {
//   const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.withdrawn;
//   return (
//     <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
//       <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
//       <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
//     </View>
//   );
// }

/** A labeled detail row with an optional icon prefix */
function DetailRow({
  label,
  value,
  subvalue,
  valueColor,
}: {
  label:        string;
  value:        string;
  subvalue?:    string;
  valueColor?:  string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailValueCol}>
        <Text style={[styles.detailValue, valueColor ? { color: valueColor } : undefined]}>
          {value}
        </Text>
        {!!subvalue && <Text style={styles.detailSubvalue}>{subvalue}</Text>}
      </View>
    </View>
  );
}

/** Section card wrapper */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

// ─── Offer Detail Content ──────────────────────────────────────────────────────

function OfferDetailContent({
  offer,
  agentName,
  mlsNumber,
  propertyAddress,
}: {
  offer:           ClientOffer;
  agentName:       string;
  mlsNumber:       string;
  propertyAddress: string;
}) {
  const cfg       = STATUS_CONFIG[offer.status] ?? STATUS_CONFIG.withdrawn;
  const submitted = formatDateTime(offer.submittedAt);
  const responded = offer.respondedAt ? formatDateTime(offer.respondedAt) : null;

  // Hero pill shows address + MLS if available, falls back to property ID
  const heroPillText = propertyAddress;
  const navigation = useNavigation<any>();

  return (
    <View style={styles.scrollInner}>
      {/* ── Hero Amount Card ── */}
      <View style={styles.heroCard}>
        <View style={globalStyles.rowSpaceBetween}>
          <View style={styles.propertyPill}>
            <TouchableOpacity
            onPress={() => {
              navigation.navigate('PropertyDetails', { propertyId: offer.masterPropertyId });
            }} >
            <Text style={styles.propertyPillText} numberOfLines={2}>
              {heroPillText}
            </Text>
            </TouchableOpacity>
          </View>
          {/* <StatusBadge status={offer.status} /> */}
        </View>

        <View style={styles.heroAmountBlock}>
          <Text style={styles.heroAmountLabel}>Offer Amount</Text>
          <Text style={styles.heroAmount}>{formatCurrency(offer.amount)}</Text>
        </View>

        {/* Status Banner for non-pending */}
        {offer.status !== 'pending' && (
          <View style={[styles.statusBanner, { backgroundColor: cfg.bg }]}>
            <Text style={styles.statusBannerIcon}>{cfg.icon}</Text>
            <Text style={[styles.statusBannerText, { color: cfg.color }]}>
              This offer was{' '}
              <Text style={{ fontWeight: '700' }}>{cfg.label.toLowerCase()}</Text>
              {responded ? ` on ${responded.date}` : ''}.
            </Text>
          </View>
        )}
      </View>

      {/* ── Offer Details ── */}
      <Section title="Offer Details">
        <DetailRow label="Offer ID"         value={offer.id} />
        <View style={styles.rowDivider} />
        {/* <DetailRow label="Property Address" value={propertyAddress || `#${offer.masterPropertyId}`} />
        <View style={styles.rowDivider} /> */}
        <DetailRow label="MLS Number"       value={mlsNumber || '—'} />
        <View style={styles.rowDivider} />
        <DetailRow label="Agent Name"       value={agentName || '—'} />
        <View style={styles.rowDivider} />
        <DetailRow
          label="Amount"
          value={formatCurrency(offer.amount)}
          valueColor={colors.primary.default}
        />
      </Section>

      {/* ── Timeline ── */}
      <Section title="Timeline">
        <DetailRow
          label="Submitted"
          value={submitted.date}
          subvalue={submitted.time}
        />
        <View style={styles.rowDivider} />
        <DetailRow
          label="Response"
          value={responded ? responded.date : 'Awaiting response'}
          subvalue={responded?.time}
          valueColor={!responded ? colors.text.muted : undefined}
        />
      </Section>

      {/* ── Notes ── */}
      {!!offer.notes && (
        <Section title="Notes">
          <View style={styles.notesBox}>
            <Text style={styles.notesIcon}>💬</Text>
            <Text style={styles.notesText}>{offer.notes}</Text>
          </View>
        </Section>
      )}

      {/* ── Rejection Reason ── */}
      {!!offer.rejectionReason && (
        <Section title="Rejection Reason">
          <View style={styles.rejectionBox}>
            <Text style={styles.rejectionText}>{offer.rejectionReason}</Text>
          </View>
        </Section>
      )}

      <View style={styles.bottomSpacer} />
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function ClientOfferDetailScreen() {
  const route      = useRoute<RouteProp<ClientOfferRouteParams, 'ClientOffer'>>();
  const navigation = useNavigation();
  const { offerId, agentName = '', mlsNumber = '', propertyAddress = '' } = route.params;

  const [refreshing, setRefreshing] = useState(false);
  const { data: offer, isLoading, isError, refetch } = useClientOffer(offerId);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <>
    <SafeAreaView style={globalStyles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.screen} />

      {/* Content States */}
      {isLoading ? (
        <View style={globalStyles.centeredFull}>
          <ActivityIndicator size="large" color={colors.primary.default} />
          <Text style={styles.loadingText}>Loading offer…</Text>
        </View>
      ) : isError ? (
        <View style={globalStyles.centeredFull}>
          <Text style={styles.stateIcon}>⚠️</Text>
          <Text style={styles.stateTitle}>Something went wrong</Text>
          <Text style={styles.stateSubtitle}>Unable to load this offer.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : !offer ? (
        <View style={globalStyles.centeredFull}>
          <Text style={styles.stateIcon}>🔍</Text>
          <Text style={styles.stateTitle}>Offer not found</Text>
          <Text style={styles.stateSubtitle}>This offer may have been removed.</Text>
        </View>
      ) : (
        <ScrollView
          style={globalStyles.flex1}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary.default}
            />
          }
        >
          <OfferDetailContent
            offer={offer}
            agentName={agentName}
            mlsNumber={mlsNumber}
            propertyAddress={propertyAddress}
          />
        </ScrollView>
      )}
      
    </SafeAreaView>
    <ClientFooter />
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // Header
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing['3xl'],
    paddingVertical:   spacing.xl,
    backgroundColor:   colors.background.screen,
    borderBottomWidth: border.width.thin,
    borderBottomColor: colors.border.light,
  },
  backBtn: {
    width:          36,
    height:         36,
    alignItems:     'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize:   22,
    color:      colors.text.primary,
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.h3,
  },

  // Scroll
  scrollContent: {
    padding:       spacing['3xl'],
    paddingBottom: spacing['9xl'],
  },
  scrollInner: {
    gap: spacing['3xl'],
  },

  // Hero Card
  heroCard: {
    backgroundColor: colors.background.surface,
    borderRadius:    border.radius.card,
    borderWidth:     border.width.thin,
    borderColor:     colors.border.default,
    padding:         spacing['4xl'],
    gap:             spacing['3xl'],
    ...shadows.card,
  },
  propertyPill: {
    backgroundColor:   colors.primary.hover,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xxs + 1,
    borderRadius:      border.radius.chipSm,
    flexShrink:        1,
    maxWidth:          '70%',
  },
  propertyPillText: {
    fontSize:   12,
    fontWeight: '700',
    color:      colors.primary.default,
  },
  heroAmountBlock: {
    gap: spacing.xxs,
  },
  heroAmountLabel: {
    ...typography.labelMuted,
    fontSize:      10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroAmount: {
    fontSize:   36,
    fontWeight: '800',
    color:      colors.text.primary,
    lineHeight: 42,
  },
  statusBanner: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.md,
    borderRadius:      border.radius.btn,
    paddingVertical:   spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  statusBannerIcon: {
    fontSize: 16,
  },
  statusBannerText: {
    flex:       1,
    fontSize:   13,
    lineHeight: 18,
  },

  // Status Badge
  statusBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xxs + 1,
    borderRadius:      border.radius.badge,
  },
  statusDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  statusText: {
    fontSize:   11,
    fontWeight: '600',
  },

  // Sections
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    marginLeft: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.background.surface,
    borderRadius:    border.radius.card,
    borderWidth:     border.width.thin,
    borderColor:     colors.border.default,
    paddingVertical: spacing.xs,
    ...shadows.xs,
  },

  // Detail Rows
  detailRow: {
    flexDirection:     'row',
    alignItems:        'flex-start',
    justifyContent:    'space-between',
    paddingHorizontal: spacing['4xl'],
    paddingVertical:   spacing.xl,
    gap:               spacing['3xl'],
  },
  detailLabel: {
    ...typography.labelMuted,
    fontSize:  13,
    flex:      1,
  },
  detailValueCol: {
    flex:       1.5,
    alignItems: 'flex-end',
    gap:        spacing.xxs,
  },
  detailValue: {
    fontSize:   13,
    fontWeight: '600',
    color:      colors.text.primary,
    textAlign:  'right',
  },
  detailSubvalue: {
    ...typography.caption,
    fontSize:  11,
    textAlign: 'right',
  },
  rowDivider: {
    height:           1,
    backgroundColor:  colors.border.light,
    marginHorizontal: spacing['4xl'],
  },

  // Notes
  notesBox: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.md,
    padding:       spacing['4xl'],
  },
  notesIcon: {
    fontSize:  16,
    marginTop: 1,
  },
  notesText: {
    flex:       1,
    ...typography.bodySmall,
    fontSize:   14,
    lineHeight: 20,
    color:      colors.text.body,
  },

  // Rejection
  rejectionBox: {
    padding:         spacing['4xl'],
    backgroundColor: colors.error.light,
    borderRadius:    border.radius.card,
  },
  rejectionText: {
    ...typography.bodySmall,
    color:      colors.error.default,
    lineHeight: 20,
  },

  // Bottom Spacer
  bottomSpacer: {
    height: spacing['6xl'],
  },

  // Loading / Error / Empty
  loadingText: {
    ...typography.caption,
    marginTop: spacing.xl,
  },
  stateIcon: {
    fontSize:     44,
    marginBottom: spacing.xl,
  },
  stateTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  stateSubtitle: {
    ...typography.bodySmall,
    textAlign:    'center',
    maxWidth:     240,
    marginBottom: spacing['3xl'],
  },
  retryBtn: {
    ...globalStyles.btnPrimary,
    paddingHorizontal: spacing['6xl'],
  },
  retryBtnText: {
    ...typography.buttonPrimary,
    fontSize: 14,
  },
});



