import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import {
  Mail,
  Phone,
  Calendar,
  Hash,
  ArrowLeft,
  Cake,
  Clock,
} from 'lucide-react-native';
import { BrokerAgent } from '../../../../lib/brokerApi';
import { colors, radius, spacing } from '../../styles/shared.styles';

interface Props {
  agent:  BrokerAgent;
  onBack: () => void;
}

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return displayName.slice(0, 2).toUpperCase();
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

/** "2000-01-01" → "Jan 1, 2000" */
function formatDOB(dob: string): string {
  try {
    // Parse as local date to avoid UTC-offset shift
    const [y, m, d] = dob.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return dob;
  }
}

const STATUS_MAP: Record<string, { bg: string; border: string; text: string }> = {
  ACTIVE:   { bg: colors.successBg,  border: colors.successBorder, text: colors.success },
  INACTIVE: { bg: colors.bgMuted,    border: colors.border,        text: colors.textMuted },
  PENDING:  { bg: '#fefce8',          border: '#fde68a',            text: '#92400e' },
};

function getStatusStyle(status: string) {
  return STATUS_MAP[status?.toUpperCase()] ?? STATUS_MAP['INACTIVE'];
}

// ─── Small meta row inside the info grid ─────────────────────────────────────
function MetaRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <View style={styles.metaCell}>
      {icon}
      <Text style={styles.metaValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AgentProfileHeader({ agent, onBack }: Props) {
  const statusStyle = getStatusStyle(agent.status);

  return (
    <View style={styles.card}>
      {/* ← Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
        <ArrowLeft size={18} color={colors.brand} />
        <Text style={styles.backText}>Agents</Text>
      </TouchableOpacity>

      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(agent.displayName)}</Text>
      </View>

      {/* Display name */}
      <Text style={styles.name}>{agent.displayName}</Text>

      {/* Status badge */}
      <View style={[styles.statusBadge, {
        backgroundColor: statusStyle.bg,
        borderColor:     statusStyle.border,
      }]}>
        <Text style={[styles.statusText, { color: statusStyle.text }]}>
          {agent.status.charAt(0) + agent.status.slice(1).toLowerCase()}
        </Text>
      </View>

      {/* Contact action buttons */}
      <View style={styles.contactRow}>
        <TouchableOpacity
          style={styles.contactBtn}
          onPress={() => Linking.openURL(`mailto:${agent.email}`)}
        >
          <Mail size={16} color={colors.brand} />
          <Text style={styles.contactText}>Email</Text>
        </TouchableOpacity>

        {agent.phoneE164 ? (
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => Linking.openURL(`tel:${agent.phoneE164}`)}
          >
            <Phone size={16} color={colors.brand} />
            <Text style={styles.contactText}>Call</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Detail grid — all available agent fields */}
      <View style={styles.metaGrid}>
        <MetaRow
          icon={<Mail size={13} color={colors.textDisabled} />}
          value={agent.email}
        />

        {agent.phoneE164 ? (
          <MetaRow
            icon={<Phone size={13} color={colors.textDisabled} />}
            value={agent.phoneE164}
          />
        ) : null}

        {agent.dateOfBirth ? (
          <MetaRow
            icon={<Cake size={13} color={colors.textDisabled} />}
            value={`Born ${formatDOB(agent.dateOfBirth)}`}
          />
        ) : null}

        <MetaRow
          icon={<Hash size={13} color={colors.textDisabled} />}
          value={`Referral: ${agent.referralCode}`}
        />

        <MetaRow
          icon={<Clock size={13} color={colors.textDisabled} />}
          value={`Joined ${formatDate(agent.createdAt)}`}
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: 24,
    paddingHorizontal: spacing.lg,
  },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  backText: { fontSize: 14, color: colors.brand, fontWeight: '600' },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    opacity: 0.9,
  },
  avatarText: { color: colors.textInverted, fontSize: 26, fontWeight: '700' },

  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },

  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  contactRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  contactText: { color: colors.brand, fontWeight: '600', fontSize: 13 },

  metaGrid: {
    width: '100%',
    gap: spacing.sm,
  },
  metaCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bgPage,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  metaValue: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
});














// import React from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Linking,
// } from 'react-native';
// import { Mail, Phone, Calendar, Hash, ArrowLeft } from 'lucide-react-native';
// import { BrokerAgent } from '../../../../lib/brokerApi';
// import { colors, spacing } from '../../styles/shared.styles';

// interface Props {
//   agent:    BrokerAgent;
//   onBack:   () => void;
// }

// function getInitials(displayName: string): string {
//   const parts = displayName.trim().split(/\s+/);
//   if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
//   return displayName.slice(0, 2).toUpperCase();
// }

// function formatDate(iso: string): string {
//   try {
//     return new Date(iso).toLocaleDateString(undefined, {
//       year: 'numeric', month: 'short', day: 'numeric',
//     });
//   } catch {
//     return iso.slice(0, 10);
//   }
// }

// const STATUS_MAP: Record<string, { bg: string; border: string; text: string }> = {
//   ACTIVE:   { bg: colors.successBg,  border: colors.successBorder, text: colors.success },
//   INACTIVE: { bg: colors.bgMuted,    border: colors.border,        text: colors.textMuted },
//   PENDING:  { bg: '#fefce8',          border: '#fde68a',            text: '#92400e' },
// };

// export function AgentProfileHeader({ agent, onBack }: Props) {
//   const statusStyle =
//     STATUS_MAP[agent.status?.toUpperCase()] ?? STATUS_MAP['INACTIVE'];

//   return (
//     <View style={styles.card}>
//       {/* Back button */}
//       <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
//         <ArrowLeft size={18} color={colors.brand} />
//         <Text style={styles.backText}>Agents</Text>
//       </TouchableOpacity>

//       {/* Avatar */}
//       <View style={styles.avatar}>
//         <Text style={styles.avatarText}>{getInitials(agent.displayName)}</Text>
//       </View>

//       {/* Name */}
//       <Text style={styles.name}>{agent.displayName}</Text>

//       {/* Status badge */}
//       <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
//         <Text style={[styles.statusText, { color: statusStyle.text }]}>
//           {agent.status.charAt(0) + agent.status.slice(1).toLowerCase()}
//         </Text>
//       </View>

//       {/* Contact row */}
//       <View style={styles.contactRow}>
//         <TouchableOpacity
//           style={styles.contactBtn}
//           onPress={() => Linking.openURL(`mailto:${agent.email}`)}
//         >
//           <Mail size={16} color={colors.brand} />
//           <Text style={styles.contactText}>Email</Text>
//         </TouchableOpacity>

//         {agent.phoneE164 ? (
//           <TouchableOpacity
//             style={styles.contactBtn}
//             onPress={() => Linking.openURL(`tel:${agent.phoneE164}`)}
//           >
//             <Phone size={16} color={colors.brand} />
//             <Text style={styles.contactText}>Call</Text>
//           </TouchableOpacity>
//         ) : null}
//       </View>

//       {/* Meta info row */}
//       <View style={styles.metaGrid}>
//         <View style={styles.metaCell}>
//           <Mail size={12} color={colors.textDisabled} />
//           <Text style={styles.metaValue} numberOfLines={1}>{agent.email}</Text>
//         </View>

//         {agent.phoneE164 ? (
//           <View style={styles.metaCell}>
//             <Phone size={12} color={colors.textDisabled} />
//             <Text style={styles.metaValue}>{agent.phoneE164}</Text>
//           </View>
//         ) : null}

//         <View style={styles.metaCell}>
//           <Calendar size={12} color={colors.textDisabled} />
//           <Text style={styles.metaValue}>Joined {formatDate(agent.createdAt)}</Text>
//         </View>

//         <View style={styles.metaCell}>
//           <Hash size={12} color={colors.textDisabled} />
//           <Text style={styles.metaValue}>{agent.referralCode}</Text>
//         </View>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   card: {
//     backgroundColor: colors.bgCard,
//     borderRadius: 16,
//     borderWidth: 1,
//     borderColor: colors.border,
//     marginHorizontal: spacing.lg,
//     marginBottom: spacing.lg,
//     alignItems: 'center',
//     paddingTop: spacing.md,
//     paddingBottom: 24,
//     paddingHorizontal: spacing.lg,
//   },

//   backBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//     alignSelf: 'flex-start',
//     marginBottom: spacing.lg,
//   },
//   backText: { fontSize: 14, color: colors.brand, fontWeight: '600' },

//   avatar: {
//     width: 72,
//     height: 72,
//     borderRadius: 36,
//     backgroundColor: colors.brand,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: spacing.md,
//     opacity: 0.9,
//   },
//   avatarText: { color: colors.textInverted, fontSize: 26, fontWeight: '700' },

//   name: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: colors.textPrimary,
//     marginBottom: spacing.sm,
//     textAlign: 'center',
//   },

//   statusBadge: {
//     borderRadius: 12,
//     paddingHorizontal: 10,
//     paddingVertical: 3,
//     marginBottom: spacing.lg,
//     borderWidth: 1,
//   },
//   statusText: { fontSize: 11, fontWeight: '600' },

//   contactRow: {
//     flexDirection: 'row',
//     gap: spacing.sm,
//     marginBottom: spacing.lg,
//   },
//   contactBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//     backgroundColor: '#eff6ff',
//     paddingHorizontal: spacing.md,
//     paddingVertical: spacing.sm,
//     borderRadius: 20,
//     borderWidth: 1,
//     borderColor: '#dbeafe',
//   },
//   contactText: { color: colors.brand, fontWeight: '600', fontSize: 13 },

//   metaGrid: {
//     width: '100%',
//     gap: spacing.sm,
//   },
//   metaCell: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//     backgroundColor: colors.bgPage,
//     borderRadius: 8,
//     paddingHorizontal: spacing.md,
//     paddingVertical: spacing.sm,
//     borderWidth: 1,
//     borderColor: colors.borderLight,
//   },
//   metaValue: {
//     fontSize: 12,
//     color: colors.textMuted,
//     flex: 1,
//   },
// });
