import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useWindowDimensions } from 'react-native';
import { useBottomInset } from '@/hooks/useSafeAreaPadding';
import { BrokerageTabParamList } from './types';
import { BrokerageDashboardScreen } from '../screens/brokerage/BrokerageDashboardScreen';
import { BrokerageAgentsScreen } from '../screens/brokerage/BrokerageAgentsScreen';
import { BrokerageClientsScreen } from '../screens/brokerage/BrokerageClientsScreen';
import { BrokerProfileScreen } from '@/screens/brokerage/screens/BrokerProfileScreen';
import { LayoutDashboard, Users, Home, UserCircle } from 'lucide-react-native';

const Tab = createBottomTabNavigator<BrokerageTabParamList>();

function TabIcon({
  name,
  focused,
  size,
}: Readonly<{ name: string; focused: boolean; size: number }>) {
  const color = focused ? '#7c3aed' : '#64748b';
  if (name === 'Dashboard') return <Home size={size} color={color} />;
  if (name === 'Agents') return <Users size={size} color={color} />;
  if (name === 'Clients') return <LayoutDashboard size={size} color={color} />;
  return <UserCircle size={size} color={color} />;
}

function buildBrokerageTabScreenOptions(
  iconSize: number,
  tabBarHeight: number,
  tabBarPaddingTop: number,
  tabBarPaddingBottom: number
) {
  return ({ route }: { route: { name: string } }) => ({
    tabBarIcon: ({ focused }: { focused: boolean }) => (
      <TabIcon name={route.name} focused={focused} size={iconSize} />
    ),
    tabBarActiveTintColor: '#7c3aed',
    tabBarInactiveTintColor: '#64748b',
    headerShown: true,
    tabBarShowLabel: true,
    tabBarLabelPosition: 'below-icon' as const,
    tabBarItemStyle: {
      paddingHorizontal: 0,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    tabBarIconStyle: {
      marginTop: 0,
      marginBottom: 2,
    },
    tabBarLabelStyle: {
      fontSize: 11,
      lineHeight: 12,
      marginTop: 0,
      marginBottom: 0,
      textAlign: 'center' as const,
    },
    tabBarStyle: {
      margin: 0,
      paddingLeft: 0,
      paddingRight: 0,
      paddingHorizontal: 0,
      paddingBottom: tabBarPaddingBottom,
      paddingTop: tabBarPaddingTop,
      height: tabBarHeight,
    },
  });
}

export function BrokerageTabs() {
  const { width } = useWindowDimensions();
  const bottomInset = useBottomInset();
  const compact = width < 380;
  const iconSize = compact ? 18 : 20;
  const tabBarBaseHeight = compact ? 62 : 68;
  const tabBarPaddingTop = compact ? 6 : 7;
  const tabBarPaddingBottom = (compact ? 6 : 7) + bottomInset;
  const tabBarHeight = tabBarBaseHeight + bottomInset;

  return (
    <Tab.Navigator
      screenOptions={buildBrokerageTabScreenOptions(iconSize, tabBarHeight, tabBarPaddingTop, tabBarPaddingBottom)}
    >
      <Tab.Screen name="Dashboard" component={BrokerageDashboardScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Agents" component={BrokerageAgentsScreen} />
      <Tab.Screen name="Clients" component={BrokerageClientsScreen} />
      <Tab.Screen name="Profile" component={BrokerProfileScreen} />
    </Tab.Navigator>
  );
}


