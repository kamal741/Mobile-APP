import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useBottomInset } from '@/hooks/useSafeAreaPadding';
import { LayoutDashboard, Users, Home, UserCircle } from 'lucide-react-native';
import { RootStackParamList } from '@/navigation/types';

export type BrokerageFooterTab = 'dashboard' | 'agents' | 'clients' | 'profile';

interface TabConfig {
  key: BrokerageFooterTab;
  screen: keyof RootStackParamList;
  label: string;
}

const TABS: TabConfig[] = [
  { key: 'dashboard', screen: 'BrokerageDashboard', label: 'Dashboard' },
  { key: 'agents',    screen: 'BrokerageAgents',    label: 'Agents'    },
  { key: 'clients',   screen: 'BrokerageClients',   label: 'Clients'   },
  { key: 'profile',   screen: 'BrokerProfile',      label: 'Profile'   },
];

/**
 * Returns the total rendered height of the BrokerageFooter (tab bar + safe-area
 * bottom inset). Use this to add matching `paddingBottom` to scrollable
 * content on screens that render <BrokerageFooter />, so content isn't hidden
 * behind the absolutely-positioned tab bar.
 *
 * Usage:
 *   const footerHeight = useBrokerageFooterHeight();
 *   <ScrollView contentContainerStyle={{ paddingBottom: footerHeight + 16 }} />
 */
export function useBrokerageFooterHeight(): number {
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
}: Readonly<{ tabKey: BrokerageFooterTab; focused: boolean; size: number }>) {
  const color = focused ? '#7c3aed' : '#64748b';
  switch (tabKey) {
    case 'dashboard': return <Home            size={size} color={color} />;
    case 'agents':    return <Users           size={size} color={color} />;
    case 'clients':   return <LayoutDashboard size={size} color={color} />;
    case 'profile':   return <UserCircle      size={size} color={color} />;
    default:          return null;
  }
}

interface BrokerageFooterProps {
  /**
   * Which tab should be visually highlighted as active.
   * Pass `undefined` / omit for "no tab active" (e.g. on detail screens).
   */
  active?: BrokerageFooterTab;
}

/**
 * Reusable bottom tab bar for Brokerage screens.
 * Drop this into any screen (including ones outside a Tab.Navigator)
 * to show the brokerage footer. Tapping a tab navigates to the corresponding
 * top-level stack screen.
 *
 * Usage:
 *   <BrokerageFooter active="dashboard" />
 *   <BrokerageFooter />  // no tab highlighted
 *
 * NOTE: This component is absolutely positioned at the bottom of the
 * screen. Add bottom padding to your scrollable content using
 * `useBrokerageFooterHeight()` so content isn't hidden behind it.
 */
export function BrokerageFooter({ active }: Readonly<BrokerageFooterProps>) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
            <TabIcon tabKey={tab.key} focused={focused} size={iconSize} />
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
    color: '#7c3aed',
  },
});