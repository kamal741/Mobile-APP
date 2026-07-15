import { useCallback, useEffect, useRef } from "react";
import type { ReactElement } from "react";
import {
  NavigationContainer,
  type LinkingOptions,
  useNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../contexts/AuthContext";
import { ActivityIndicator, View, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import type { RootStackParamList } from "./types";
import { SuperAdminTabs } from "./SuperAdminTabs";
import { PropertyDetailsScreen } from "../screens/PropertyDetailsScreen";
import { TourDetailsScreen } from "../screens/TourDetailsScreen";
import { TourCartScreen } from "../screens/TourCartScreen";
import { ClientProfileScreen } from "../screens/agent/ClientDashboard/index";
import { AgentProfileScreen } from "../screens/brokerage/AgentProfileScreen";
import { TourHistoryScreen } from "../screens/agent/TourDashboard/screens/TourHistoryScreen";
import { MoreScreen } from "../screens/agent/MoreScreen";
import { ClientRequirementsScreen } from "../screens/agent/ClientDashboard/index";
import { ClientShortlistsScreen } from "../screens/agent/ClientDashboard/index";
import { ClientDocumentsScreen } from "../screens/agent/ClientDashboard/index";
import { ClientMediaScreen } from "../screens/agent/ClientDashboard/index";
import { ClientNotesScreen } from "../screens/agent/ClientDashboard/index";
import { ClientGroupsScreen } from "../screens/agent/ClientDashboard/index";
import { CreateTourScreen } from "../screens/agent/TourDashboard/screens/CreateTourScreen";
import {
  CreateOfferScreen,
  OfferDetailScreen,
} from "../screens/agent/OffersDashboard";
import { AddPropertyToTourScreen } from "../screens/client/AddPropertyToTourScreen";
import { PropertyReviewScreen } from "../screens/PropertyReviewScreen";
import { MyDocumentsScreen } from "../screens/client/MyDocumentsScreen";
import { MyProfileScreen } from "../screens/MyProfileScreen";
import { ChatRoomScreen } from "../screens/ChatRoomScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { BrokerProfileScreen } from "@/screens/brokerage/screens/BrokerProfileScreen";
import { NotificationRealtimeProvider } from "../contexts/NotificationRealtimeProvider";
import { ClientPreferencesScreen } from "../screens/client/preferences/Screens/index";
import ClientOfferListScreen from "../screens/client/dashboard/screens/ClientOfferListScreen";
import ClientOfferDetailScreen from "@/screens/client/dashboard/screens/ClientOfferDetailScreen";
import { PropertyRatingsScreen } from "@/screens/client/dashboard/screens/PropertyRatingsScreen";
import { SavedPropertiesListScreen } from "@/screens/client/screens/SavedPropertiesListScreen";
import ClientAgentProfileScreen from "@/screens/client/dashboard/screens/ClientAgentProfileScreen";
import AgentClientPreferences from "@/screens/agent/ClientDashboard/screens/AgentClientPreferences";
// import MediaUploadScreen from "@/screens/agent/MediaCenter/screens/MediaUploadScreen";
import MediaCenterScreen from "@/screens/agent/MediaCenter/screens/MediaCenterScreen";
import RecommendationScreen from "@/screens/client/recommendations/RecommendationScreen";

// ✅ Agent tab-equivalent screens
import { AgentDashboardScreen } from "../screens/agent/AgentDashboard/AgentDashboardScreen";
import { AgentBrandingScreen } from "../screens/agent/AgentBrandingScreen";
import { AgentHelpSupportScreen } from "../screens/agent/AgentHelpSupportScreen";
import { ClientsScreen } from "../screens/agent/ClientDashboard/index";
import { ToursScreen } from "../screens/agent/TourDashboard/screens/ToursScreen";
import { BrowseProperty } from "../screens/agent/BrowseProperty/BrowseProperty";

// ✅ Client tab-equivalent screens
import { ClientDashboardScreen } from "../screens/client/dashboard/screens/ClientDashboardScreen";
import { BrowseScreen } from "../screens/client/BrowseScreen";
import { MyToursScreen } from "../screens/client/MyToursScreen";
import { ChatListScreen } from "../screens/ChatListScreen";
import { HelpSupportScreen } from "../screens/client/HelpSupportScreen";

// ✅ Brokerage tab-equivalent screens (BrokerageTabs removed)
import { BrokerageDashboardScreen } from "../screens/brokerage/BrokerageDashboardScreen";
import { BrokerageAgentsScreen } from "../screens/brokerage/BrokerageAgentsScreen";
import { BrokerageClientsScreen } from "../screens/brokerage/BrokerageClientsScreen";
import { BrokerAnalyticsScreen } from "@/screens/brokerage/screens/BrokerAnalyticsScreen";

import { NavbarClient } from "../screens/client/components/NavbarClient";
import { NavbarSecondary } from "@/components/NavbarSecondary";
import { NavbarAgent } from "@/screens/agent/components/NavbarAgent";
import { BrokerageSettingsScreen } from "@/screens/brokerage/BrokerageSettingsScreen";
import MediaUploadScreen from "@/screens/agent/MediaUpload/Screens/MediaUploadScreen";
import RoutePlanningScreen from "@/screens/agent/RoutePlanning/RoutePlanningScreen";
import RouteDetailsScreen from "@/screens/agent/RoutePlanning/screens/RouteDetailsScreen";
import PersonalCalendarScreen from "@/screens/PersonalCalendarScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

type PushNotificationData = Record<string, unknown>;

function pushDataString(data: PushNotificationData, key: string): string | null {
  const value = data[key];
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function resolveMainTabsComponent(role: string | undefined) {
  if (role === "agent") return AgentDashboardScreen;
  if (role === "brokerage") return BrokerageDashboardScreen;
  if (role === "superadmin") return SuperAdminTabs;
  return ClientDashboardScreen;
}

function resolveMainScreenOptions(role: string | undefined) {
  if (role === "agent") return agentHeaderShown("Dashboard");
  if (role === "brokerage") return brokerageHeaderShown("Dashboard");
  if (role === "superadmin") return { headerShown: false };
  return clientHeaderShown("Dashboard");
}

function clientHeaderShown(title: string) {
  return {
    headerShown: true,
    header: () => <NavbarClient title={title} />,
  };
}

function agentHeaderShown(title: string) {
  return {
    headerShown: true,
    header: () => <NavbarAgent title={title} />,
  };
}

function agentHeaderWithBack(title: string) {
  return {
    headerShown: true,
    header: () => <NavbarAgent title={title} showBack />,
  };
}

// ✅ Brokerage uses NavbarAgent style (same design, adjust if you have NavbarBrokerage)
function brokerageHeaderShown(title: string) {
  return {
    headerShown: true,
    header: () => <NavbarAgent title={title} />,
  };
}

function secondaryHeaderShown(
  title: string,
  opts?: Partial<
    Pick<
      React.ComponentProps<typeof NavbarSecondary>,
      "showSearch" | "showNotifications"
    >
  >,
): { headerShown: boolean; header: () => ReactElement } {
  return {
    headerShown: true,
    header: () => (
      <NavbarSecondary
        title={title}
        showSearch={opts?.showSearch}
        showNotifications={opts?.showNotifications}
      />
    ),
  };
}

export function RootNavigator() {
  const { user, isLoading, isAuthenticated, justLoggedIn, clearJustLoggedIn } =
    useAuth();
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const pendingPushDataRef = useRef<PushNotificationData | null>(null);
  const handledNotificationIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!justLoggedIn || !isAuthenticated) return;
    clearJustLoggedIn();
  }, [justLoggedIn, isAuthenticated, clearJustLoggedIn]);

  const openFromPushData = useCallback(
    (data: PushNotificationData) => {
      if (!navigationRef.isReady()) {
        pendingPushDataRef.current = data;
        return;
      }

      const kind = pushDataString(data, "kind")?.toLowerCase();
      if (kind === "chat") {
        const conversationId = pushDataString(data, "conversationId");
        if (conversationId) {
          navigationRef.navigate("ChatRoom", {
            conversationId,
            otherUserName: pushDataString(data, "title") ?? "Chat",
          });
          return;
        }
      }

      navigationRef.navigate("Notifications");
    },
    [navigationRef],
  );

  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse | null | undefined) => {
      if (!response || !isAuthenticated) return;

      const notificationId = response.notification.request.identifier;
      if (handledNotificationIdsRef.current.has(notificationId)) {
        return;
      }
      handledNotificationIdsRef.current.add(notificationId);

      const data = response.notification.request.content.data ?? {};
      openFromPushData(data as PushNotificationData);
    },
    [isAuthenticated, openFromPushData],
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse,
    );

    // getLastNotificationResponseAsync is not available on web
    if (Platform.OS !== 'web') {
      void Notifications.getLastNotificationResponseAsync().then(
        handleNotificationResponse,
      );
    }

    return () => subscription.remove();
  }, [handleNotificationResponse, isAuthenticated]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  const mainTabsComponent = resolveMainTabsComponent(user?.role);
  const mainScreenOptions = resolveMainScreenOptions(user?.role);

  const linking: LinkingOptions<RootStackParamList> = {
    prefixes: ["showingTrail://"],
    config: {
      screens: {
        Register: "register/agent",
      },
    },
  };

  const navigator = (
    <NavigationContainer
      linking={linking}
      ref={navigationRef}
      onReady={() => {
        const data = pendingPushDataRef.current;
        if (!data) return;
        pendingPushDataRef.current = null;
        openFromPushData(data);
      }}
    >
      <Stack.Navigator
        key={isAuthenticated ? "app" : "auth"}
        initialRouteName={isAuthenticated ? "Main" : "Login"}
        screenOptions={{ headerShown: false }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen
              name="Main"
              component={mainTabsComponent}
              options={mainScreenOptions}
            />

            {/* ================================================================
                AGENT tab-equivalent screens
            ================================================================ */}
            <Stack.Screen
              name="AgentDashboard"
              component={AgentDashboardScreen}
              options={agentHeaderShown("Dashboard")}
            />
            <Stack.Screen
              name="Clients"
              component={ClientsScreen}
              options={agentHeaderShown("Clients")}
            />
            <Stack.Screen
              name="Tours"
              component={ToursScreen}
              options={agentHeaderShown("Tours")}
            />
            <Stack.Screen
              name="AgentBrowse"
              component={BrowseProperty}
              initialParams={{ userType: "agent" }}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Branding"
              component={AgentBrandingScreen}
              options={agentHeaderWithBack("Branding Settings")}
            />
            <Stack.Screen
              name="AgentHelpSupport"
              component={AgentHelpSupportScreen}
              options={secondaryHeaderShown("Help & Support")}
            />

            {/* ================================================================
                BROKERAGE tab-equivalent screens (BrokerageTabs removed)
                BrokerageFooter is dropped manually into each screen component.
            ================================================================ */}
            <Stack.Screen
              name="BrokerageDashboard"
              component={BrokerageDashboardScreen}
              options={brokerageHeaderShown("Dashboard")}
            />
            <Stack.Screen
              name="BrokerageAgents"
              component={BrokerageAgentsScreen}
              options={brokerageHeaderShown("Agents")}
            />
            <Stack.Screen
              name="BrokerageClients"
              component={BrokerageClientsScreen}
              options={brokerageHeaderShown("Clients")}
            />
            <Stack.Screen
              name="BrokerAnalytics"
              component={BrokerAnalyticsScreen}
              options={brokerageHeaderShown("Analytics")}
            />

            {/* ================================================================
                CLIENT tab-equivalent screens
            ================================================================ */}
            <Stack.Screen
              name="Dashboard"
              component={ClientDashboardScreen}
              options={clientHeaderShown("Dashboard")}
            />
            <Stack.Screen
              name="Browse"
              component={BrowseScreen}
              options={clientHeaderShown("Browse")}
            />
            <Stack.Screen
              name="MyTours"
              component={MyToursScreen}
              options={clientHeaderShown("My Tours")}
            />
            <Stack.Screen
              name="Chat"
              component={ChatListScreen}
              options={clientHeaderShown("Chat")}
            />
            <Stack.Screen
              name="HelpSupport"
              component={HelpSupportScreen}
              options={secondaryHeaderShown("Help & Support")}
            />
            <Stack.Screen
              name="AgentChat"
              component={ChatListScreen}
              options={clientHeaderShown("Chat")}
            />

            {/* ================================================================
                SHARED / DETAIL screens
            ================================================================ */}
            <Stack.Screen
              name="PropertyDetails"
              component={PropertyDetailsScreen}
              options={secondaryHeaderShown("Property Details")}
            />
            <Stack.Screen
              name="TourDetails"
              component={TourDetailsScreen}
              options={secondaryHeaderShown("Tour Details")}
            />
            <Stack.Screen
              name="TourCart"
              component={TourCartScreen}
              options={clientHeaderShown("Tour Cart")}
            />
            <Stack.Screen
              name="CreateTour"
              component={CreateTourScreen}
              options={secondaryHeaderShown("Create Tour")}
            />
            <Stack.Screen
              name="CreateOffer"
              component={CreateOfferScreen}
              options={secondaryHeaderShown("Create Offer")}
            />
            <Stack.Screen
              name="AgentProfile"
              component={AgentProfileScreen}
              options={{ headerShown: true, title: "Agent Profile" }}
            />
            <Stack.Screen
              name="ClientProfile"
              component={ClientProfileScreen}
              options={secondaryHeaderShown("Client Profile")}
            />
            <Stack.Screen
              name="TourHistory"
              component={TourHistoryScreen}
              options={secondaryHeaderShown("Tour History")}
            />
            <Stack.Screen
              name="ClientRequirements"
              component={ClientRequirementsScreen}
              options={secondaryHeaderShown("Requirements")}
            />
            <Stack.Screen
              name="ClientShortlists"
              component={ClientShortlistsScreen}
              options={secondaryHeaderShown("Shortlists")}
            />
            <Stack.Screen
              name="ClientDocuments"
              component={ClientDocumentsScreen}
              options={secondaryHeaderShown("Documents")}
            />
            <Stack.Screen
              name="ClientMedia"
              component={ClientMediaScreen}
              options={secondaryHeaderShown("Media Gallery")}
            />
            <Stack.Screen
              name="ClientNotes"
              component={ClientNotesScreen}
              options={secondaryHeaderShown("Client Notes")}
            />
            <Stack.Screen
              name="ClientGroups"
              component={ClientGroupsScreen}
              options={secondaryHeaderShown("Groups")}
            />
            <Stack.Screen
              name="AddPropertyToTour"
              component={AddPropertyToTourScreen}
              options={secondaryHeaderShown("Add Property to Tour")}
            />
            <Stack.Screen
              name="PropertyReview"
              component={PropertyReviewScreen}
              options={secondaryHeaderShown("Property Review")}
            />
            <Stack.Screen
              name="MyDocuments"
              component={MyDocumentsScreen}
              options={secondaryHeaderShown("My Documents")}
            />
            <Stack.Screen
              name="MyProfile"
              component={MyProfileScreen}
              options={secondaryHeaderShown("My profile")}
            />
            <Stack.Screen
              name="More"
              component={MoreScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={secondaryHeaderShown("Notifications")}
            />
            <Stack.Screen
              name="ChatRoom"
              component={ChatRoomScreen}
              options={secondaryHeaderShown("Chat")}
            />
            <Stack.Screen
              name="OfferDetail"
              component={OfferDetailScreen}
              options={secondaryHeaderShown("Offer Details")}
            />
            <Stack.Screen
              name="BrokerProfile"
              component={BrokerProfileScreen}
              options={brokerageHeaderShown("Profile")}
            />
            <Stack.Screen
              name="BrokerBranding"
              component={BrokerageSettingsScreen}
              options={brokerageHeaderShown("Branding Settings")}
            />
            <Stack.Screen
              name="ClientPreferences"
              component={ClientPreferencesScreen}
              options={secondaryHeaderShown("Preferences")}
            />
            <Stack.Screen
              name="ClientOfferList"
              component={ClientOfferListScreen}
              options={secondaryHeaderShown("Offers")}
            />
            <Stack.Screen
              name="ClientOfferDetails"
              component={ClientOfferDetailScreen}
              options={secondaryHeaderShown("Offer Details")}
            />
            <Stack.Screen
              name="PropertyRatings"
              component={PropertyRatingsScreen}
              options={secondaryHeaderShown("Property Ratings")}
            />
            <Stack.Screen
              name="SavedProperties"
              component={SavedPropertiesListScreen}
              options={secondaryHeaderShown("Saved Properties")}
            />
            <Stack.Screen
              name="ClientAgentProfile"
              component={ClientAgentProfileScreen}
              options={clientHeaderShown("Agent Profile")}
            />
            <Stack.Screen
              name="AgentClientPreferences"
              component={AgentClientPreferences}
              options={secondaryHeaderShown("Client Preferences")}
            />
            <Stack.Screen
              name="MediaUpload"
              component={MediaUploadScreen}
              options={{ headerShown: false, title: "Media Upload" }}
            />
            <Stack.Screen
              name="Recommendations"
              component={RecommendationScreen}
              options={secondaryHeaderShown("Recommendations")}
            />
            <Stack.Screen
              name="MediaCenter"
              component={MediaCenterScreen}
              options={secondaryHeaderShown("Media Center")}
            />
            <Stack.Screen
              name="PersonalCalendar"
              component={PersonalCalendarScreen}
              options={secondaryHeaderShown("Personal Calendar")}
            />
            <Stack.Screen
              name="RoutePlanning"
              options={{ headerShown: false }}
            >
              {({ route }) => (
                <RoutePlanningScreen
                  showingRequestId={route.params.showingRequestId}
                />
              )}
            </Stack.Screen>
            <Stack.Screen
              name="RouteDetails"
              options={secondaryHeaderShown("Route Details")}
            >
              {({ route }) => (
                <RouteDetailsScreen
                  tourId={route.params.tourId}
                />
              )}
            </Stack.Screen>

            
           
           
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );

  if (isAuthenticated) {
    return (
      <NotificationRealtimeProvider>{navigator}</NotificationRealtimeProvider>
    );
  }

  return navigator;
}
