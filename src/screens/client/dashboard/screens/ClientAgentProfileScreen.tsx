import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Clipboard,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { ReactNode } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  Gift,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  X,
} from 'lucide-react-native';

import {
  colors,
  typography,
  spacing,
  border,
  shadows,
} from '@/theme';
import { useAuth } from '../../../../contexts/AuthContext';
import { useOpenClientDirectConversation } from '../../../../hooks/useChat';
import { useClientTours } from '../../../../lib/clientApi';
import { ClientFooter } from '../../components/ClientFooter';

const ICON_SIZE = 20;
const AVATAR_SIZE = 88;
const ONLINE_GREEN = '#22C55E';

function formatPhone(e164: string): string {
  if (!e164) return 'Not available';
  const cleaned = e164.replace(/\s+/g, '');
  if (cleaned.startsWith('+91') && cleaned.length === 13) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 8)} ${cleaned.slice(8)}`;
  }
  return e164;
}

function getInitials(displayName: string): string {
  if (!displayName) return '?';
  const parts = displayName.trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatAgentTime(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0:00';
  const total = Math.round(totalMinutes);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

function formatDistance(km: number): string {
  if (km <= 0) return '0 km';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

interface ActionButtonProps {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

function ActionButton({
  icon,
  label,
  onPress,
  variant = 'secondary',
  loading = false,
}: Readonly<ActionButtonProps>) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  const isPrimary = variant === 'primary';

  return (
    <Animated.View style={[styles.actionShell, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[styles.actionBtn, isPrimary && styles.actionBtnPrimary]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        disabled={loading}
      >
        <View style={[styles.actionIconWrap, isPrimary && styles.actionIconWrapPrimary]}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.text.inverse} />
          ) : (
            icon
          )}
        </View>
        <Text style={[styles.actionBtnLabel, isPrimary && styles.actionBtnLabelPrimary]}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface InfoRowProps {
  icon: ReactNode;
  label: string;
  value: string;
  copiable?: boolean;
}

function InfoRow({ icon, label, value, copiable }: Readonly<InfoRowProps>) {
  const handleCopy = () => {
    Clipboard.setString(value);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };

  return (
    <TouchableOpacity
      activeOpacity={copiable ? 0.7 : 1}
      onPress={copiable ? handleCopy : undefined}
      style={styles.infoRow}
    >
      <View style={styles.infoIconWrap}>{icon}</View>
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
      </View>
      {copiable ? (
        <View style={styles.copyBadge}>
          <Copy size={12} color={colors.primary.default} strokeWidth={2.2} />
          <Text style={styles.copyBadgeText}>Copy</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function AgentMetric({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.agentMetric} accessibilityLabel={`${label}: ${value}`}>
      <View style={[styles.agentIconCircle, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <View style={styles.agentText}>
        <Text style={styles.agentValue} numberOfLines={1}>{value}</Text>
        <Text style={styles.agentLabel} numberOfLines={2}>{label}</Text>
      </View>
    </View>
  );
}

export default function ClientAgentProfileScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { data: tours = [] } = useClientTours();
  const openClientDirectConversation = useOpenClientDirectConversation();
  const [bioModalVisible, setBioModalVisible] = useState(false);

  const completedTours = tours.filter((t) => t.status === 'completed');
  const completedCount = completedTours.length;
  const agentKm = completedTours.reduce((sum, t) => sum + (t.totalDistance ?? 0), 0);
  const agentMinutes = completedTours.reduce((sum, t) => sum + (t.actualDurationMinutes ?? 0), 0);

  const agent = user?.agentDetails;
  const displayName = agent?.displayName ?? 'Your Agent';
  const referralCode = agent?.referralCode ?? 'N/A';
  const phone = agent?.phoneE164 ?? '';
  const email = agent?.email ?? '';
  const profileImageUrl = agent?.profileImageUrl ?? null;

  const bioText = agent?.bio
    ? agent.bio.replace(/#\w+/g, '').trim()
    : `${displayName} is your dedicated real-estate professional, here to guide you through every step of your home-buying journey. Reach out anytime via call, email, or chat.`;
  const tags = agent?.bio
    ? (agent.bio.match(/#\w+/g) ?? []).map((tag) => tag.slice(1))
    : ['Home Buying', 'Negotiation', 'Market Analysis', 'Property Tours'];

  const handleCall = () => {
    if (!phone) return Alert.alert('No phone number available');
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = () => {
    if (!email) return Alert.alert('No email available');
    Linking.openURL(`mailto:${email}`);
  };

  const handleChat = async () => {
    const agentId = agent?.id;
    if (!agentId) {
      Alert.alert(
        'Chat not ready',
        'Your agent chat will be available once your agent profile is fully linked.',
      );
      return;
    }

    try {
      const conversation = await openClientDirectConversation.mutateAsync(agentId);
      navigation.navigate('ChatRoom', {
        conversationId: conversation.id,
        otherUserName: displayName,
      });
    } catch {
      Alert.alert('Unable to open chat', 'Please try again in a moment.');
    }
  };

  const handleCopyReferral = () => {
    Clipboard.setString(referralCode);
    Alert.alert('Copied', 'Referral code copied to clipboard.');
  };

  return (
    <>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.profileCard}>
            <View style={styles.heroBanner} />
            <View style={styles.avatarWrap}>
              {profileImageUrl ? (
                <Image source={{ uri: profileImageUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{getInitials(displayName)}</Text>
                </View>
              )}
              <View style={styles.onlineDot} />
            </View>

            <Text style={styles.agentName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.agentTitle}>Licensed Real Estate Agent</Text>

            <View style={styles.brokerBadge}>
              <Building2 size={14} color={colors.primary.default} strokeWidth={2.2} />
              <Text style={styles.brokerBadgeText}>Verified Broker Agent</Text>
            </View>

            <View style={styles.trustRow}>
              <View style={styles.trustPill}>
                <CheckCircle2 size={14} color={colors.success.default} strokeWidth={2.2} />
                <Text style={styles.trustText}>Active</Text>
              </View>
              <View style={styles.trustPill}>
                <Text style={styles.trustText}>{user?.clientType ?? 'Buyer'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionRow}>
            <ActionButton
              icon={<Phone size={18} color={colors.primary.default} strokeWidth={2.2} />}
              label="Call"
              onPress={handleCall}
            />
            <ActionButton
              icon={<Mail size={18} color={colors.primary.default} strokeWidth={2.2} />}
              label="Email"
              onPress={handleEmail}
            />
            <ActionButton
              icon={<MessageCircle size={18} color={colors.text.inverse} strokeWidth={2.2} />}
              label="Chat"
              onPress={handleChat}
              variant="primary"
              loading={openClientDirectConversation.isPending}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Your Agent</Text>
          <TouchableOpacity
            style={styles.aboutCard}
            activeOpacity={0.85}
            onPress={() => setBioModalVisible(true)}
          >
            <Text style={styles.aboutText} numberOfLines={4}>{bioText}</Text>
            {tags.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.aboutTagsRow}
              >
                {tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </TouchableOpacity>
        </View>

        {agent?.hasSharedStats ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Agent Investment</Text>
            <Text style={styles.agentSectionSubtitle}>
              {completedCount === 0
                ? 'Shows after you complete a tour together'
                : 'Time and distance on completed tours with you'}
            </Text>
            <View style={styles.agentRow}>
              <AgentMetric
                icon={<Clock size={ICON_SIZE} color={colors.primary.mid} strokeWidth={2.2} />}
                iconBg={colors.primary.light}
                label="Time with you"
                value={formatAgentTime(agentMinutes)}
              />
              <View style={styles.agentDivider} />
              <AgentMetric
                icon={<MapPin size={ICON_SIZE} color={colors.success.default} strokeWidth={2.2} />}
                iconBg={colors.success.light}
                label="Distance for you"
                value={formatDistance(agentKm)}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Details</Text>
          <View style={styles.infoCard}>
            <InfoRow
              icon={<Phone size={18} color={colors.primary.default} strokeWidth={2.1} />}
              label="Phone"
              value={formatPhone(phone)}
              copiable={!!phone}
            />
            <View style={styles.infoSep} />
            <InfoRow
              icon={<Mail size={18} color={colors.primary.default} strokeWidth={2.1} />}
              label="Email"
              value={email || 'Not available'}
              copiable={!!email}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Referral Code</Text>
          <TouchableOpacity
            style={styles.referralCard}
            activeOpacity={0.85}
            onPress={handleCopyReferral}
          >
            <View style={styles.referralIconWrap}>
              <Gift size={24} color={colors.text.inverse} strokeWidth={2.2} />
            </View>
            <View style={styles.referralTextWrap}>
              <Text style={styles.referralHint}>Tap to copy and share</Text>
              <Text style={styles.referralCode} selectable numberOfLines={1}>
                {referralCode}
              </Text>
            </View>
            <View style={styles.referralCopyBtn}>
              <Copy size={14} color={colors.text.inverse} strokeWidth={2.2} />
            </View>
          </TouchableOpacity>
          <Text style={styles.referralNote}>
            Share this code with friends to connect them with your agent.
          </Text>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      <Modal
        visible={bioModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBioModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setBioModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalCard}
            activeOpacity={1}
            onPress={() => undefined}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>About {displayName}</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setBioModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color={colors.text.muted} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBodyScroll}>
              <Text style={styles.modalBioText}>{bioText}</Text>
              {tags.length > 0 ? (
                <View style={styles.modalTagsRow}>
                  {tags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ClientFooter active="dashboard" />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.screen,
  },
  scroll: {
    paddingBottom: spacing['9xl'],
  },
  hero: {
    paddingHorizontal: spacing['3xl'],
    paddingTop: spacing['2xl'],
  },
  profileCard: {
    backgroundColor: colors.background.surface,
    borderRadius: border.radius.card,
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
    paddingTop: 70,
    paddingBottom: spacing['2xl'],
    ...shadows.card,
    overflow: 'hidden',
  },
  heroBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 106,
    backgroundColor: colors.primary.default,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.background.surface,
    backgroundColor: colors.background.subtle,
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.primary.default,
    borderWidth: 3,
    borderColor: colors.background.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text.inverse,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 7,
    right: 7,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: ONLINE_GREEN,
    borderWidth: 2.5,
    borderColor: colors.background.surface,
  },
  agentName: {
    fontSize: 23,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
    maxWidth: '100%',
  },
  agentTitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: 0,
    textAlign: 'center',
  },
  brokerBadge: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary.hover,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xs,
    borderRadius: border.radius.pill,
  },
  brokerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary.default,
  },
  trustRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  trustPill: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: border.radius.pill,
    backgroundColor: colors.background.subtle,
    borderWidth: border.width.thin,
    borderColor: colors.border.light,
  },
  trustText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.dark,
    textTransform: 'capitalize',
  },
  section: {
    marginTop: spacing['2xl'],
    paddingHorizontal: spacing['3xl'],
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionShell: {
    flex: 1,
    minWidth: 0,
  },
  actionBtn: {
    minHeight: 68,
    backgroundColor: colors.background.surface,
    borderRadius: border.radius.card,
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    ...shadows.card,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary.default,
    borderColor: colors.primary.default,
  },
  actionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary.hover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconWrapPrimary: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  actionBtnLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.dark,
  },
  actionBtnLabelPrimary: {
    color: colors.text.inverse,
  },
  aboutCard: {
    backgroundColor: colors.background.surface,
    borderRadius: border.radius.card,
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    padding: spacing['3xl'],
    gap: spacing.xl,
    ...shadows.card,
  },
  aboutText: {
    ...typography.bodySmall,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.body,
  },
  aboutTagsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingRight: spacing.xs,
  },
  tag: {
    backgroundColor: colors.background.subtle,
    borderRadius: border.radius.chipSm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs + 1,
    borderWidth: border.width.thin,
    borderColor: colors.border.light,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  agentSectionSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
    lineHeight: 17,
  },
  agentRow: {
    flexDirection: 'row',
    backgroundColor: colors.background.surface,
    borderRadius: border.radius.card,
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    ...shadows.card,
  },
  agentDivider: {
    width: 1,
    backgroundColor: colors.border.light,
    marginVertical: 2,
  },
  agentMetric: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  agentIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentText: {
    flex: 1,
    minWidth: 0,
  },
  agentValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text.primary,
  },
  agentLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: 1,
  },
  infoCard: {
    backgroundColor: colors.background.surface,
    borderRadius: border.radius.card,
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    overflow: 'hidden',
    ...shadows.card,
  },
  infoRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  infoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.hover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: colors.text.muted,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  infoSep: {
    height: 1,
    backgroundColor: colors.border.light,
    marginLeft: spacing['3xl'] + 40,
  },
  copyBadge: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.primary.hover,
    paddingHorizontal: spacing.md,
    borderRadius: border.radius.pill,
  },
  copyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary.default,
  },
  referralCard: {
    minHeight: 92,
    backgroundColor: colors.primary.default,
    borderRadius: border.radius.card,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing['3xl'],
    gap: spacing.md,
    ...shadows.card,
  },
  referralIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  referralHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    marginBottom: 3,
  },
  referralCode: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text.inverse,
    letterSpacing: 3,
  },
  referralCopyBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralNote: {
    ...typography.caption,
    fontSize: 11,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.background.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  modalCard: {
    backgroundColor: colors.background.surface,
    borderRadius: border.radius.card,
    width: '100%',
    maxHeight: '75%',
    padding: spacing['3xl'],
    ...shadows.card,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.md,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: border.width.thin,
    borderColor: colors.border.light,
  },
  modalBodyScroll: {
    flexShrink: 1,
  },
  modalBioText: {
    ...typography.bodySmall,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.body,
    marginBottom: spacing.xl,
  },
  modalTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  bottomPad: {
    height: spacing['6xl'],
  },
});
