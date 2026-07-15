import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, shadow, sharedStyles } from '../../theme';

interface PropertyTimeEntry {
  address: string;
  time: string;
}

interface SuccessModalProps {
  visible: boolean;
  clientName: string;
  date: string;
  /** Pre-formatted time range, e.g. "6:00 PM – 7:30 PM" */
  timeRange: string;
  propertyCount: number;
  /** Per-property scheduled times to display in the summary card */
  propertyTimes?: PropertyTimeEntry[];
  onViewDashboard: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  clientName,
  date,
  timeRange,
  propertyCount,
  propertyTimes,
  onViewDashboard,
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        {/* Check Circle */}
        <View style={styles.checkCircle}>
          <Text style={styles.checkText}>✓</Text>
        </View>

        <Text style={styles.title}>Route Approved!</Text>
        <Text style={styles.subtitle}>
          The showing request for{'\n'}
          <Text style={styles.subtitleBold}>{clientName}</Text> has been scheduled{'\n'}
          on <Text style={styles.subtitleBold}>{date}</Text>.
        </Text>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryHeading}>Request Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Client</Text>
            <Text style={styles.summaryVal}>{clientName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Date</Text>
            <Text style={styles.summaryVal}>{date}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Time</Text>
            <Text style={styles.summaryVal}>{timeRange}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Properties</Text>
            <Text style={styles.summaryVal}>{propertyCount}</Text>
          </View>

          {/* Per-property scheduled times */}
          {propertyTimes && propertyTimes.length > 0 && (
            <>
              <View style={styles.propertyTimesHeader}>
                <Text style={styles.propertyTimesHeading}>Schedule</Text>
              </View>
              {propertyTimes.map((entry, index) => (
                <View
                  key={index}
                  style={[
                    styles.summaryRow,
                    index === propertyTimes.length - 1 && styles.summaryRowLast,
                  ]}
                >
                  <Text style={styles.propertyAddress} numberOfLines={1}>
                    {entry.address}
                  </Text>
                  <Text style={styles.propertyTime}>{entry.time}</Text>
                </View>
              ))}
            </>
          )}

          {/* If no propertyTimes, still apply bottom margin via last row */}
          {(!propertyTimes || propertyTimes.length === 0) && (
            <View style={styles.summaryRowLast} />
          )}
        </View>

        {/* Confirmed Badge */}
        <View style={styles.confirmedBadge}>
          <Text style={styles.confirmedText}>✓{'  '}Confirmed</Text>
        </View>

        <TouchableOpacity
          style={[sharedStyles.btnPrimary, styles.dashboardBtn]}
          onPress={onViewDashboard}
          activeOpacity={0.85}
        >
          <Text style={sharedStyles.btnPrimaryText}>View in Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export default SuccessModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    ...shadow.modal,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  checkText: {
    fontSize: 36,
    color: colors.successGreen,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  subtitleBold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryCard: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
    width: '100%',
    marginBottom: 14,
  },
  summaryHeading: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryRowLast: {
    marginBottom: 8,
  },
  summaryKey: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  summaryVal: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },

  // ── Per-property schedule rows ──
  propertyTimesHeader: {
    marginTop: 10,
    marginBottom: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  propertyTimesHeading: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  propertyAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  propertyTime: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '700',
    flexShrink: 0,
  },

  confirmedBadge: {
    backgroundColor: colors.successBg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
  },
  confirmedText: {
    fontSize: 13,
    color: colors.successGreen,
    fontWeight: '700',
  },
  dashboardBtn: {
    width: '100%',
  },
});


