import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useClientStats } from "../../../../lib/clientApi";
import { useAuth } from "../../../../contexts/AuthContext";
import { useTourCart } from "../../../../contexts/TourCartContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../../../components/Card";
import { NavbarClient } from "../../components/NavbarClient";
import { PropertiesSeen } from "../components/PropertiesSeen";
import { useEffect, useLayoutEffect } from "react";
import { UpcomingTourSection } from "../components/UpcomingTourSection";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { ClientFooter, useClientFooterHeight } from "../../components/ClientFooter";
import {
  colors,
  typography,
  spacing,
  border,
  shadows,
  globalStyles,
} from '@/theme';

export function ClientDashboardScreen() {
  const { user } = useAuth();
  const { cartCount } = useTourCart();
  const navigation = useNavigation<any>();
  const footerHeight = useClientFooterHeight();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (user && user.hasAllPreferences === false) {
      navigation.navigate("ClientPreferences");
    }
  }, [user, navigation]);

  const {
    data: clientStats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useClientStats();

  const isLoading = statsLoading;

  const refetch = () => {
    refetchStats();
  };

  return (
    <View style={styles.screen}>
      {/* ── Custom Client Navbar (replaces default header) ── */}
      <NavbarClient
        title="Dashboard"
        onSearchPress={() => navigation.navigate("Browse")}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: footerHeight + 16 }]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {/* ── Viewing Journey Stats ── */}
        <PropertiesSeen />

        {cartCount > 0 && (
          <TouchableOpacity onPress={() => navigation.navigate("TourCart")}>
            <Card style={styles.cartBanner}>
              <CardContent style={styles.cartContent}>
                <View style={styles.cartInfo}>
                  <Text style={styles.cartIcon}>🛒</Text>
                  <View>
                    <Text style={styles.cartTitle}>Tour Cart</Text>
                    <Text style={styles.cartSubtitle}>
                      {cartCount} {cartCount === 1 ? "property" : "properties"}{" "}
                      ready to schedule
                    </Text>
                  </View>
                </View>
                <Text style={styles.cartArrow}>→</Text>
              </CardContent>
            </Card>
          </TouchableOpacity>
        )}

        <UpcomingTourSection />

        <Card style={styles.section}>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("ClientPreferences")}
            >
              <Svg
                width={32}
                height={32}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1e40af"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Line x1={4} y1={21} x2={4} y2={14} />
                <Line x1={4} y1={10} x2={4} y2={3} />
                <Line x1={12} y1={21} x2={12} y2={12} />
                <Line x1={12} y1={8} x2={12} y2={3} />
                <Line x1={20} y1={21} x2={20} y2={16} />
                <Line x1={20} y1={12} x2={20} y2={3} />
                <Line x1={1} y1={14} x2={7} y2={14} />
                <Line x1={9} y1={8} x2={15} y2={8} />
                <Line x1={17} y1={16} x2={23} y2={16} />
              </Svg>
              <Text style={styles.actionLabel}>Preferences</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("Recommendations")}
            >
              <Svg
                width={32}
                height={32}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1e40af"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </Svg>
              <Text style={styles.actionLabel}>Recommendations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("ClientAgentProfile")}
            >
              <Svg
                width={32}
                height={32}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1e40af"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <Circle cx={12} cy={7} r={4} />
                <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
                <Path d="M21 21v-2a4 4 0 0 0-3-3.87" />
              </Svg>
              <Text style={styles.actionLabel}>Your Agent</Text>
            </TouchableOpacity>
          </CardContent>
        </Card>
      </ScrollView>
      <ClientFooter active="dashboard" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: "#64748b",
  },
  name: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e293b",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
  },
  statContent: {
    alignItems: "center",
    paddingVertical: 20,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1e40af",
  },
  statValueLiked: {
    color: "#16a34a",
  },
  statValueRejected: {
    color: "#dc2626",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
  },
  cartBanner: {
    backgroundColor: "#1e40af",
    marginBottom: 16,
  },
  cartContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cartInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  cartIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  cartSubtitle: {
    fontSize: 14,
    color: "#93c5fd",
    marginTop: 2,
  },
  cartArrow: {
    fontSize: 24,
    color: "#ffffff",
  },
  section: {
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: 80,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginTop: 6,
  },
    bottomPad: {
      height: 20,
    },
});
