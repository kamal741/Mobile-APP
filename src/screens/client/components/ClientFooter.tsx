import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useBottomInset } from '@/hooks/useSafeAreaPadding';
import { House, Search, CalendarDays, MessageCircle, ShoppingCart } from 'lucide-react-native';
import { useTourCart } from '@/contexts/TourCartContext';
import { RootStackParamList, ClientTabParamList } from '@/navigation/types';
import { useChatUnreadConversationCount } from '@/hooks/useChat';

export type ClientFooterTab = 'dashboard' | 'browse' | 'mytours' | 'chat' | 'tourcart';

const TAB_TO_SCREEN: Record<ClientFooterTab, keyof ClientTabParamList> = {
  dashboard: 'Dashboard',
  browse: 'Browse',
  mytours: 'MyTours',
  chat: 'Chat',
  tourcart: 'TourCart',
};

interface TabConfig {
  key: ClientFooterTab;
  screen: keyof ClientTabParamList;
  label: string;
  hidden?: boolean;
}

const TABS: TabConfig[] = [
  { key: 'dashboard', screen: 'Dashboard', label: 'Dashboard' },
  { key: 'mytours', screen: 'MyTours', label: 'My Tours' },
  { key: 'chat', screen: 'Chat', label: 'Chat' },
  { key: 'tourcart', screen: 'TourCart', label: 'Cart' },
];

/**
 * Returns the total rendered height of the ClientFooter (tab bar + safe-area
 * bottom inset). Use this to add matching `paddingBottom` to scrollable
 * content on screens that render <ClientFooter />, so content isn't hidden
 * behind the absolutely-positioned tab bar.
 *
 * Usage:
 *   const footerHeight = useClientFooterHeight();
 *   <ScrollView contentContainerStyle={{ paddingBottom: footerHeight + 16 }} />
 */
export function useClientFooterHeight(): number {
  const { width } = useWindowDimensions();
  const bottomInset = useBottomInset();
  const compact = width < 380;
  const tabBarBaseHeight = compact ? 62 : 68;
  return tabBarBaseHeight + bottomInset;
}

function CartTabIcon({
  focused,
  size,
  cartCount,
}: Readonly<{ focused: boolean; size: number; cartCount: number }>) {
  const color = focused ? '#1e40af' : '#64748b';
  return (
    <View style={styles.cartIconWrapper}>
      <ShoppingCart size={size} color={color} />
      {cartCount > 0 && (
        <View style={styles.cartBadge}>
          <Text style={styles.cartBadgeText}>
            {cartCount > 99 ? '99+' : cartCount}
          </Text>
        </View>
      )}
    </View>
  );
}

function TabIcon({
  tabKey,
  focused,
  size,
  cartCount,
  unreadCount,
}: Readonly<{ tabKey: ClientFooterTab; focused: boolean; size: number; cartCount: number; unreadCount: number }>) {
  const color = focused ? '#1e40af' : '#64748b';
  switch (tabKey) {
    case 'dashboard':
      return <House size={size} color={color} />;
    case 'browse':
      return <Search size={size} color={color} />;
    case 'mytours':
      return <CalendarDays size={size} color={color} />;
    case 'chat':
      return (
        <View style={styles.chatIconWrapper}>
          <MessageCircle size={size} color={color} />
          {unreadCount > 0 && (
            <View style={styles.chatBadge}>
              <Text style={styles.chatBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      );
    case 'tourcart':
      return <CartTabIcon focused={focused} size={size} cartCount={cartCount} />;
    default:
      return null;
  }
}

interface ClientFooterProps {
  /**
   * Which tab should be visually highlighted as active.
   * Pass `undefined` / omit for "no tab active" (e.g. on screens
   * outside the ClientTabs navigator like a profile/details screen).
   */
  active?: ClientFooterTab;
}

/**
 * Reusable bottom tab bar that visually matches ClientTabs.
 * Drop this into any screen (including ones outside the Tab.Navigator)
 * to show the same footer. Tapping a tab navigates directly to the
 * corresponding top-level stack screen.
 *
 * Usage:
 *   <ClientFooter active="dashboard" />
 *   <ClientFooter />  // no tab highlighted
 *
 * NOTE: This component is absolutely positioned at the bottom of the
 * screen. Make sure to add bottom padding to your scrollable content
 * using `useClientFooterHeight()` so content isn't hidden behind it.
 */
export function ClientFooter({ active }: Readonly<ClientFooterProps>) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cartCount } = useTourCart();
  const unreadCount = useChatUnreadConversationCount();
  const { width } = useWindowDimensions();

  const compact = width < 380;
  const iconSize = compact ? 18 : 20;

  const goToClientTab = (screen: keyof ClientTabParamList) => {
    navigation.navigate(screen as never);
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.tabBarSafe}>
      <View style={styles.tabBar}>
      {TABS.filter((tab) => !tab.hidden).map((tab) => {
        const focused = active === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => goToClientTab(tab.screen)}
            activeOpacity={0.8}
          >
            <TabIcon
              tabKey={tab.key}
              focused={focused}
              size={iconSize}
              cartCount={cartCount}
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
    marginBottom: 0,
    textAlign: 'center',
    color: '#64748b',
  },
  tabLabelActive: {
    color: '#1e40af',
  },
  cartIconWrapper: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 12,
  },
  chatIconWrapper: {
    position: 'relative',
  },
  chatBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  chatBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 12,
  },
});

