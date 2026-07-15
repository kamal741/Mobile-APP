import type { NavigatorScreenParams } from "@react-navigation/native";

export type RootStackParamList = {
  Auth: undefined;
  Login: undefined;
  Register: { role?: 'agent' | 'client'; inviteCode?: string } | undefined;
  Main:
    | NavigatorScreenParams<ClientTabParamList>
    | NavigatorScreenParams<AgentTabParamList>
    | undefined;

  Dashboard: undefined;
  Browse: { userType?: string } | undefined;
  MyTours: undefined;
  Chat: undefined;


  AgentDashboard: undefined;
  Clients: undefined;
  Tours: undefined;
  AgentBrowse: { userType: 'agent' };
  AgentChat: undefined;
  AgentHelpSupport: undefined;
  Branding: undefined;

    // ✅ Brokerage top-level screens (BrokerageTabs removed)
  BrokerageDashboard: undefined;
  BrokerageAgents: undefined;
  BrokerageClients: undefined;
  BrokerAnalytics: undefined;
  
  PropertyDetails: { propertyId: number | string; userType?: 'agent' | 'client' };
  TourDetails: { tourId: string; clientProfileId?: string };
  TourCart: undefined;
  CreateTour: undefined;
  CreateOffer: undefined;
  AgentProfile: { agentId: string; agent: unknown };
  ClientProfile: { clientId: string; client?: unknown };
  TourHistory: { clientId: string };
  ClientRequirements: { clientId: string };
  ClientDocuments: { clientId: string };
  ClientMedia: { clientId: string };
  ClientShortlists: { clientId: string };
  ClientNotes: { clientId: string };
  ClientGroups: { clientId: string };
  Settings: undefined;
  BrokerProfile: undefined;
  BrokerBranding: undefined;
  AddPropertyToTour: { tourId: string };
  PropertyReview: {
    tourId: string;
    propertyId: string;
    propertyAddress: string;
    userRole: "client" | "agent";
  };
  MyDocuments: undefined;
  MyProfile: undefined;
  HelpSupport: undefined;
  More: undefined;
  Notifications: undefined;
  // ChatRoom: { conversationId: string; otherUserName: string };
  OfferDetail: { offerId: string };
  RoutePlanning: { showingRequestId: string };
  RouteDetails: { tourId: string };

  PersonalCalendar: undefined;

ChatRoom: {
  conversationId: string;
  otherUserName: string;
  sharedProperty?: {
    id: number;
    address: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    city?: string | null;
    province?: string | null;
    propertyType?: string | null;
    imageUrl?: string | null;
  };
};



  // ClientPreferences: undefined;

  ClientPreferences:
    | {
        userType?: "Client" | "Agent";
        clientProfileId?: string | number;
      }
    | undefined;

  ClientOfferList: undefined;
  ClientOfferDetails: { offerId: string };

  PropertyRatings: { initialTab?: "all" | "liked" | "rejected" };
  SavedProperties: undefined;

  ClientAgentProfile: undefined;
  AgentClientPreferences: {
    clientProfileId: string | number;
    clientName?: string;
  };
  MediaUpload: { propertyId: number; propertyAddress: string } | undefined;

MediaCenter: { userType: 'Agent' | 'Client'; propertyId?: number } | undefined;
  Recommendations: undefined;
};

// After
export type AgentTabParamList = {
  Dashboard: { showingRequestId?: string } | undefined;
  Clients: undefined;
  Tours: undefined;
  Chat: undefined;
  Browse: { userType?: string } | undefined; // ← accepts optional userType
};

export type ClientTabParamList = {
  Dashboard: undefined;
  Browse: undefined;
  MyTours: undefined;
  Chat: undefined;
  TourCart: undefined;
};

export type BrokerageTabParamList = {
  Dashboard: undefined;
  Agents: undefined;
  Clients: undefined;
  Profile: undefined;
  Settings: undefined;
  BrokerProfile: undefined;
  BrokerBranding: undefined;
  BrokerAnalytics: undefined;
};

export type SuperAdminTabParamList = {
  Dashboard: undefined;
  Brokerages: undefined;
  Agents: undefined;
  Clients: undefined;
  More: undefined;
};
