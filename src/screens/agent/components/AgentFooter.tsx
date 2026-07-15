import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useBottomInset } from '@/hooks/useSafeAreaPadding';
import { House, Users, CalendarDays, MessageCircle } from 'lucide-react-native';
import { RootStackParamList } from '@/navigation/types';
import { useChatUnreadConversationCount } from '@/hooks/useChat';

export type AgentFooterTab = 'dashboard' | 'clients' | 'tours' | 'chat';

interface TabConfig {
  key: AgentFooterTab;
  screen: keyof RootStackParamList;
  label: string;
}

const TABS: TabConfig[] = [
  { key: 'dashboard', screen: 'AgentDashboard', label: 'Dashboard' },
  { key: 'clients',   screen: 'Clients',        label: 'Clients'   },
  { key: 'tours',     screen: 'Tours',          label: 'Tours'     },
  { key: 'chat',      screen: 'AgentChat',      label: 'Chat'      },
];

/**
 * Returns the total rendered height of the AgentFooter (tab bar + safe-area
 * bottom inset). Use this to add matching `paddingBottom` to scrollable
 * content on screens that render <AgentFooter />, so content isn't hidden
 * behind the absolutely-positioned tab bar.
 *
 * Usage:
 *   const footerHeight = useAgentFooterHeight();
 *   <ScrollView contentContainerStyle={{ paddingBottom: footerHeight + 16 }} />
 */
export function useAgentFooterHeight(): number {
  const { width } = useWindowDimensions();
  const bottomInset = useBottomInset();
  const compact = width < 380;
  const tabBarBaseHeight = compact ? 62 : 68;
  return tabBarBaseHeight + bottomInset;
}

function TabIcon({
  tabKey,
  focused,
  size,
  unreadCount,
}: Readonly<{
  tabKey: AgentFooterTab;
  focused: boolean;
  size: number;
  unreadCount: number;
}>) {
  const color = focused ? '#1e40af' : '#64748b';
  switch (tabKey) {
    case 'dashboard': return <House        size={size} color={color} />;
    case 'clients':   return <Users        size={size} color={color} />;
    case 'tours':     return <CalendarDays size={size} color={color} />;
    case 'chat':
      return (
        <View style={styles.chatIconWrapper}>
          <MessageCircle size={size} color={color} />
          {unreadCount > 0 ? (
            <View style={styles.chatBadge}>
              <Text style={styles.chatBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      );
    default:          return null;
  }
}

interface AgentFooterProps {
  /**
   * Which tab should be visually highlighted as active.
   * Pass `undefined` / omit for "no tab active" (e.g. on detail screens).
   */
  active?: AgentFooterTab;
}

/**
 * Reusable bottom tab bar for Agent screens.
 * Drop this into any screen (including ones outside a Tab.Navigator)
 * to show the agent footer. Tapping a tab navigates to the corresponding
 * top-level stack screen.
 *
 * Usage:
 *   <AgentFooter active="dashboard" />
 *   <AgentFooter />  // no tab highlighted
 *
 * NOTE: This component is absolutely positioned at the bottom of the
 * screen. Add bottom padding to your scrollable content using
 * `useAgentFooterHeight()` so content isn't hidden behind it.
 */
export function AgentFooter({ active }: Readonly<AgentFooterProps>) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const unreadCount = useChatUnreadConversationCount();
  const { width } = useWindowDimensions();

  const compact = width < 380;
  const iconSize = compact ? 18 : 20;

  return (
    <SafeAreaView edges={['bottom']} style={styles.tabBarSafe}>
      <View style={styles.tabBar}>
      {TABS.map((tab) => {
        const focused = active === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => navigation.navigate(tab.screen as never)}
            activeOpacity={0.8}
          >
            <TabIcon
              tabKey={tab.key}
              focused={focused}
              size={iconSize}
              unreadCount={unreadCount}
            />
            <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabBarSafe: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  tabBar: {
    flexDirection: 'row',
    paddingVertical: 7,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 12,
    marginTop: 2,
    color: '#64748b',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#1e40af',
  },
  chatIconWrapper: {
    position: 'relative',
  },
  chatBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 10,
    backgroundColor: '#ef4444',
  },
  chatBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
