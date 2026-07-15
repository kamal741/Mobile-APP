import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AgentDashboardScreen } from '../screens/agent/AgentDashboard/AgentDashboardScreen';
import { ClientsScreen } from '../screens/agent/ClientDashboard/index';
import { ToursScreen } from '../screens/agent/TourDashboard/screens/ToursScreen';
import { AgentTabParamList } from './types';
import { useWindowDimensions } from 'react-native';
import { useBottomInset } from '@/hooks/useSafeAreaPadding';
import { ChatListScreen } from '../screens/ChatListScreen';
import { CalendarDays, House, MessageCircle, Users } from 'lucide-react-native';
import { BrowseProperty } from '../screens/agent/BrowseProperty/BrowseProperty';

const Tab = createBottomTabNavigator<AgentTabParamList>();

function TabIcon({
  name,
  focused,
  size,
}: Readonly<{ name: string; focused: boolean; size: number }>) {
  const color = focused ? '#1e40af' : '#64748b';
  if (name === 'Dashboard') {
    return <House size={size} color={color} />;
  }
  if (name === 'Clients') {
    return <Users size={size} color={color} />;
  }
  if (name === 'Tours') {
    return <CalendarDays size={size} color={color} />;
  }
  return <MessageCircle size={size} color={color} />;
}

function buildAgentTabScreenOptions(
  iconSize: number,
  tabBarHeight: number,
  tabBarPaddingTop: number,
  tabBarPaddingBottom: number
) {
  return ({ route }: { route: { name: string } }) => ({
    tabBarIcon: ({ focused }: { focused: boolean }) => (
      <TabIcon name={route.name} focused={focused} size={iconSize} />
    ),
    tabBarActiveTintColor: '#1e40af',
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

export function AgentTabs() {
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
      screenOptions={buildAgentTabScreenOptions(iconSize, tabBarHeight, tabBarPaddingTop, tabBarPaddingBottom)}
    >
      <Tab.Screen
        name="Dashboard"
        component={AgentDashboardScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Clients"
        component={ClientsScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Tours"
        component={ToursScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatListScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Browse"
        component={BrowseProperty}
        // Pass userType="agent" so BrowseProperty and PropertyDetailsScreen
        // can hide the cart button for agents.
        initialParams={{ userType: 'agent' }}
        options={{
          headerShown: false,
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </Tab.Navigator>
  );
}
