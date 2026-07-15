import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useBottomInset } from '@/hooks/useSafeAreaPadding';
import { SuperAdminTabParamList } from './types';
import { SuperAdminDashboardScreen } from '../screens/superadmin/SuperAdminDashboardScreen';
import { AdminBrokeragesScreen } from '../screens/superadmin/AdminBrokeragesScreen';
import { AdminAgentsScreen } from '../screens/superadmin/AdminAgentsScreen';
import { AdminClientsScreen } from '../screens/superadmin/AdminClientsScreen';
import { SuperAdminMoreScreen } from '../screens/superadmin/SuperAdminMoreScreen';

const Tab = createBottomTabNavigator<SuperAdminTabParamList>();

function TabIcon({ name, focused }: Readonly<{ name: string; focused: boolean }>) {
  const icons: Record<string, string> = {
    Dashboard: '📊',
    Brokerages: '🏛️',
    Agents: '👤',
    Clients: '👥',
    More: '⋯',
  };
  return (
    <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>
      {icons[name] || '•'}
    </Text>
  );
}

function buildSuperAdminTabScreenOptions(insetBottom: number) {
  return ({ route }: { route: { name: string } }) => ({
    tabBarIcon: ({ focused }: { focused: boolean }) => (
      <TabIcon name={route.name} focused={focused} />
    ),
    tabBarActiveTintColor: '#dc2626',
    tabBarInactiveTintColor: '#64748b',
    headerShown: true,
    tabBarStyle: {
      paddingBottom: 8 + Math.max(insetBottom, 0),
      paddingTop: 8,
      height: 64 + Math.max(insetBottom, 0),
    },
  });
}

export function SuperAdminTabs() {
  const bottomInset = useBottomInset();

  return (
    <Tab.Navigator
      screenOptions={buildSuperAdminTabScreenOptions(bottomInset)}
    >
      <Tab.Screen name="Dashboard" component={SuperAdminDashboardScreen} />
      <Tab.Screen name="Brokerages" component={AdminBrokeragesScreen} />
      <Tab.Screen name="Agents" component={AdminAgentsScreen} />
      <Tab.Screen name="Clients" component={AdminClientsScreen} />
      <Tab.Screen name="More" component={SuperAdminMoreScreen} />
    </Tab.Navigator>
  );
}
