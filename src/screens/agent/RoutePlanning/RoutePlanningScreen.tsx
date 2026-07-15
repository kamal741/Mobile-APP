/**
 * RoutePlanningScreen
 *
 * Responsibilities:
 *  - Fetches the AgentShowingRequest via useAgentShowingRequest
 *  - Resolves the agent's work address from /me (AgentMeResponse.addresses)
 *  - Passes showingRequest data + agentWorkAddress down to InitialScreen
 *  - Owns all modal state and RouteScreen navigation
 *  - Passes the RoutePlanResponse down to RouteScreen after calculation
 *  - Passes preferredTime from the showing request to RouteScreen so all
 *    properties are seeded with that start time and 30 min viewing by default
 *  - Property deletion (✕ on RoutePropertyCard) is handled entirely inside
 *    RouteScreen — it owns the confirmation modal and calls the API directly.
 *  - Route recalculation triggered from RouteScreen (after dirty edits) is
 *    also handled inside RouteScreen; RoutePlanningScreen simply stores the
 *    fresh RoutePlanResponse via onRouteRecalculated.
 *  - Owns its own NavbarSecondary so the back button on RouteScreen navigates
 *    back to InitialScreen instead of popping the native stack to AgentDashboard.
 */

import React, { useCallback, useMemo, useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

import {
  ActiveModal,
  Property,
  Screen,
  SortOption,
  StartPointOption,
} from "./types";
import { colors } from "./theme";

import {
  useAgentShowingRequest,
  RoutePlanResponse,
} from "@/lib/agentRoutePlanningAPI";
import { useAgentMe } from "@/lib/agentApi";
import { AgentWorkAddress } from "./screens/InitialScreen";

import InitialScreen from "./screens/InitialScreen";
import RouteScreen from "./screens/RouteScreen";
import ErrorModal from "./components/modals/ErrorModal";
import { AgentFooter } from "../components/AgentFooter";
import { NavbarSecondary } from "@/components/NavbarSecondary";

// ─── Props ────────────────────────────────────────────────────────────────────

interface RoutePlanningScreenProps {
  /** Passed via navigation route params */
  showingRequestId: string;
}

// ─── Helper: format AgentAddress → AgentWorkAddress ───────────────────────────

function formatWorkAddress(
  addresses:
    | Array<{
        addressType: string;
        line1?: string | null;
        line2?: string | null;
        city?: string | null;
        region?: string | null;
        postalCode?: string | null;
        countryCode?: string | null;
        latitude?: number | null;
        longitude?: number | null;
      }>
    | null
    | undefined,
): AgentWorkAddress | null {
  const work = addresses?.find((a) => a.addressType === "WORK");
  if (!work?.line1?.trim()) return null;

  const street = work.line1.trim();
  const unit = work.line2?.trim() ?? "";
  const city = work.city?.trim() ?? "";
  const province = work.region?.trim() ?? "";
  const postalCode = work.postalCode?.trim() ?? "";
  const country = work.countryCode?.trim() ?? "";

  const label = [street, city, province].filter(Boolean).join(", ");
  const addressText = [street, unit, city, province, postalCode, country]
    .filter(Boolean)
    .join(", ");

  return {
    street,
    unit,
    city,
    province,
    postalCode,
    country,
    label,
    addressText,
    latitude: work.latitude ?? 0,
    longitude: work.longitude ?? 0,
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const RoutePlanningScreen: React.FC<RoutePlanningScreenProps> = ({
  showingRequestId,
}) => {
  // ── Fetch showing request ─────────────────────────────────────────────────
  const {
    data: showingRequest,
    isLoading: isLoadingRequest,
    isError: isRequestError,
  } = useAgentShowingRequest(showingRequestId);

  const navigation = useNavigation<any>();

  // ── Fetch agent /me to get work address ───────────────────────────────────
  const { data: agentMe, isLoading: isLoadingAgentMe } = useAgentMe();

  const agentWorkAddress = useMemo(
    () => formatWorkAddress(agentMe?.addresses),
    [agentMe?.addresses],
  );

  // ── Navigation state ──────────────────────────────────────────────────────
  const [currentScreen, setCurrentScreen] = useState<Screen>("initial");
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // ── Domain state ──────────────────────────────────────────────────────────
  const [startPoint, setStartPoint] =
    useState<StartPointOption>("Agent Address");
  const [sortBy, setSortBy] = useState<SortOption>("Distance");
  const [properties, setProperties] = useState<Property[]>([]);

  // routePlan is set by InitialScreen after a successful calculate call,
  // and updated again whenever RouteScreen recalculates after dirty edits.
  const [routePlan, setRoutePlan] = useState<RoutePlanResponse | null>(null);
  // preferredTime is passed from InitialScreen's onCalculate, e.g. "10:30 AM"
  const [preferredTime, setPreferredTime] = useState<string>("");

  // ── Navbar back handler ───────────────────────────────────────────────────
  // When on RouteScreen the navbar back arrow goes back to InitialScreen.
  // When on InitialScreen it pops the native stack (back to AgentDashboard).
  const handleNavbarBack = useCallback(() => {
    if (currentScreen === "route") {
      setCurrentScreen("initial");
    } else {
      navigation.goBack();
    }
  }, [currentScreen, navigation]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handlePropertiesLoaded = (loaded: Property[]) => setProperties(loaded);

  /**
   * Called by InitialScreen on successful route calculation.
   * Stores both the route plan and the preferred start time, then navigates
   * to RouteScreen which will seed all properties with that time + 30 min viewing.
   */
  const handleCalculateDone = (plan: RoutePlanResponse, preferred: string) => {
    setRoutePlan(plan);
    setPreferredTime(preferred);
    setCurrentScreen("route");
  };

  /**
   * Called by RouteScreen after the agent recalculates from within the route
   * view (e.g. after changing sort order, property times, or removing a stop).
   * We just update the stored plan — RouteScreen will clear its own dirty flag.
   */
  const handleRouteRecalculated = (freshPlan: RoutePlanResponse) => {
    setRoutePlan(freshPlan);
  };

  const handleRecalculate = () => setActiveModal("error");

  const closeModal = () => setActiveModal(null);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Navbar — onBackPress is always routed through handleNavbarBack so
          RouteScreen's back arrow goes to InitialScreen, not AgentDashboard */}
      <NavbarSecondary
        title="Showing Request"
        onBackPress={handleNavbarBack}
        showSearch={false}
        showNotifications={false}
      />

      {currentScreen === "initial" ? (
        <InitialScreen
          showingRequestId={showingRequestId}
          agentWorkAddress={agentWorkAddress}
          isLoadingAgentMe={isLoadingAgentMe}
          startPoint={startPoint}
          onStartPointChange={setStartPoint}
          properties={properties}
          onPropertiesLoaded={handlePropertiesLoaded}
          showingRequest={showingRequest}
          isLoadingRequest={isLoadingRequest}
          onCalculate={handleCalculateDone}
        />
      ) : (
        // routePlan is guaranteed non-null here: we only set currentScreen='route'
        // inside handleCalculateDone which always receives a RoutePlanResponse.
        <RouteScreen
          showingRequestId={showingRequestId}
          properties={properties}
          sortBy={sortBy}
          routePlan={routePlan!}
          onSortChange={setSortBy}
          onBack={() => setCurrentScreen("initial")}
          onUpdateProperties={setProperties}
          preferredTime={preferredTime}
          onApproveSuccess={() => {
            setActiveModal(null);
            navigation.navigate("AgentDashboard");
          }}
          onRecalculate={handleRecalculate}
          onRouteRecalculated={handleRouteRecalculated}
        />
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      <ErrorModal
        visible={activeModal === "error"}
        onAddProperty={closeModal}
        onTryAgain={closeModal}
        onClose={closeModal}
      />
      <AgentFooter />
    </SafeAreaView>
  );
};

export default RoutePlanningScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
