import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { Mail, Phone, Calendar, User } from 'lucide-react-native';
import { BrokerAgentClient } from '../../../../lib/brokerApi';
import { colors, radius, spacing } from '../../styles/shared.styles';

interface Props {
  client:  BrokerAgentClient;
  onPress: (client: BrokerAgentClient) => void;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
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

// Client type badge config
const TYPE_CONFIG: Record<string, { bg: string; border: string; text: string; label: string }> = {
  BUYER:  {
    bg: colors.successBg, border: colors.successBorder,
    text: colors.success,  label: 'Buyer',
  },
  RENTER: {
    bg: colors.purpleBg,  border: colors.purpleBorder,
    text: colors.purple,   label: 'Renter',
  },
};

const UNASSIGNED = {
  bg: colors.bgMuted, border: colors.border,
  text: colors.textMuted, label: 'Unassigned',
};

// Avatar background colours — cycle by client id so each card feels distinct
const AVATAR_COLORS = ['#7c3aed', '#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

export function AgentClientListItem({ client, onPress }: Props) {
  const typeStyle = client.clientType
    ? (TYPE_CONFIG[client.clientType] ?? UNASSIGNED)
    : UNASSIGNED;

  const avatarBg = AVATAR_COLORS[client.id % AVATAR_COLORS.length];

  return (
    <TouchableOpacity
      onPress={() => onPress(client)}
      activeOpacity={0.85}
      style={styles.row}
    >
      <View style={styles.rowTop}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          <Text style={styles.avatarText}>
            {getInitials(client.firstName, client.lastName)}
          </Text>
        </View>

        {/* Info block */}
        <View style={styles.info}>
          {/* Full name */}
          <Text style={styles.name} numberOfLines={1}>
            {client.firstName} {client.lastName}
          </Text>

          {/* Email */}
          <View style={styles.metaRow}>
            <Mail size={11} color={colors.textDisabled} style={{ marginRight: 3 }} />
            <Text style={styles.metaText} numberOfLines={1}>{client.email}</Text>
          </View>

          {/* Phone */}
          {client.phoneE164 ? (
            <View style={styles.metaRow}>
              <Phone size={11} color={colors.textDisabled} style={{ marginRight: 3 }} />
              <Text style={styles.metaText}>{client.phoneE164}</Text>
            </View>
          ) : null}

          {/* Joined date */}
          <View style={styles.metaRow}>
            <Calendar size={11} color={colors.textDisabled} style={{ marginRight: 3 }} />
            <Text style={styles.metaText}>Joined {formatDate(client.createdAt)}</Text>
          </View>

          {/* Client type badge */}
          <View style={styles.badgesRow}>
            <View style={[styles.badge, {
              backgroundColor: typeStyle.bg,
              borderColor:     typeStyle.border,
            }]}>
              <Text style={[styles.badgeText, { color: typeStyle.text }]}>
                {typeStyle.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Call action */}
        <TouchableOpacity
          style={[styles.iconBtn, !client.phoneE164 && styles.iconBtnDisabled]}
          onPress={() => client.phoneE164 && Linking.openURL(`tel:${client.phoneE164}`)}
          disabled={!client.phoneE164}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Phone size={15} color={client.phoneE164 ? colors.brand : colors.textDisabled} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgCard,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  info:     { flex: 1, minWidth: 0, gap: 3 },
  name:     { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  metaRow:  { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 11, color: colors.textMuted, flex: 1 },

  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 3 },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '600' },

  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    flexShrink: 0,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  iconBtnDisabled: {
    backgroundColor: colors.bgPage,
    borderColor: colors.border,
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
// import { Mail, Phone, Calendar } from 'lucide-react-native';
// import { BrokerAgentClient } from '../../../../lib/brokerApi';
// import { colors, radius, spacing } from '../../styles/shared.styles';

// interface Props {
//   client:  BrokerAgentClient;
//   onPress: (client: BrokerAgentClient) => void;
// }

// function getInitials(firstName: string, lastName: string): string {
//   return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
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

// const TYPE_MAP: Record<string, { bg: string; border: string; text: string; label: string }> = {
//   BUYER:  { bg: colors.successBg,  border: colors.successBorder, text: colors.success, label: 'Buyer'  },
//   RENTER: { bg: colors.purpleBg,   border: colors.purpleBorder,  text: colors.purple,  label: 'Renter' },
// };

// const UNTYPED = {
//   bg: colors.bgMuted, border: colors.border, text: colors.textMuted, label: 'Unassigned',
// };

// export function AgentClientListItem({ client, onPress }: Props) {
//   const typeStyle = client.clientType ? (TYPE_MAP[client.clientType] ?? UNTYPED) : UNTYPED;

//   return (
//     <TouchableOpacity
//       onPress={() => onPress(client)}
//       activeOpacity={0.85}
//       style={styles.row}
//     >
//       <View style={styles.rowTop}>
//         {/* Avatar */}
//         <View style={styles.avatar}>
//           <Text style={styles.avatarText}>
//             {getInitials(client.firstName, client.lastName)}
//           </Text>
//         </View>

//         {/* Info */}
//         <View style={styles.info}>
//           <Text style={styles.name} numberOfLines={1}>
//             {client.firstName} {client.lastName}
//           </Text>

//           <View style={styles.metaRow}>
//             <Mail size={11} color={colors.textDisabled} style={{ marginRight: 3 }} />
//             <Text style={styles.metaText} numberOfLines={1}>{client.email}</Text>
//           </View>

//           {client.phoneE164 ? (
//             <View style={styles.metaRow}>
//               <Phone size={11} color={colors.textDisabled} style={{ marginRight: 3 }} />
//               <Text style={styles.metaText}>{client.phoneE164}</Text>
//             </View>
//           ) : null}

//           <View style={styles.metaRow}>
//             <Calendar size={11} color={colors.textDisabled} style={{ marginRight: 3 }} />
//             <Text style={styles.metaText}>Joined {formatDate(client.createdAt)}</Text>
//           </View>

//           {/* Client type badge */}
//           <View style={styles.badgesRow}>
//             <View style={[styles.badge, { backgroundColor: typeStyle.bg, borderColor: typeStyle.border }]}>
//               <Text style={[styles.badgeText, { color: typeStyle.text }]}>
//                 {typeStyle.label}
//               </Text>
//             </View>
//           </View>
//         </View>

//         {/* Call action */}
//         <View style={styles.actions}>
//           <TouchableOpacity
//             style={[styles.iconBtn, !client.phoneE164 && styles.iconBtnDisabled]}
//             onPress={() => client.phoneE164 && Linking.openURL(`tel:${client.phoneE164}`)}
//             disabled={!client.phoneE164}
//           >
//             <Phone size={15} color={client.phoneE164 ? colors.brand : colors.textDisabled} />
//           </TouchableOpacity>
//         </View>
//       </View>
//     </TouchableOpacity>
//   );
// }

// const styles = StyleSheet.create({
//   row: {
//     paddingHorizontal: spacing.lg,
//     paddingVertical: spacing.md,
//     backgroundColor: colors.bgCard,
//   },
//   rowTop: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//     gap: spacing.sm + 2,
//   },

//   avatar: {
//     width: 42,
//     height: 42,
//     borderRadius: radius.pill,
//     backgroundColor: '#7c3aed',
//     justifyContent: 'center',
//     alignItems: 'center',
//     flexShrink: 0,
//     opacity: 0.85,
//   },
//   avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },

//   info:     { flex: 1, minWidth: 0, gap: 3 },
//   name:     { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
//   metaRow:  { flexDirection: 'row', alignItems: 'center' },
//   metaText: { fontSize: 11, color: colors.textMuted, flex: 1 },

//   badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 2 },
//   badge: {
//     borderRadius: 4,
//     paddingHorizontal: 6,
//     paddingVertical: 2,
//     borderWidth: 1,
//   },
//   badgeText: { fontSize: 10, fontWeight: '600' },

//   actions:  { flexShrink: 0 },
//   iconBtn: {
//     width: 32,
//     height: 32,
//     borderRadius: 8,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#eff6ff',
//     borderWidth: 1,
//     borderColor: '#dbeafe',
//   },
//   iconBtnDisabled: {
//     backgroundColor: colors.bgPage,
//     borderColor: colors.border,
//   },
// });
