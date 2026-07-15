import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavbarLayout } from "@/hooks/useNavbarLayout";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../../navigation/types";
import { useAuth } from "../../../contexts/AuthContext";
import { useBrokerSettings } from "../../../lib/brokerApi";
import Svg, { Circle, Line, Path, Polyline } from "react-native-svg";

// ─── Menu Item ────────────────────────────────────────────────────────────────
interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
}

function MenuItem({
  icon,
  label,
  onPress,
  isDestructive,
}: Readonly<MenuItemProps>) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.menuItem}
    >
      <View
        style={[
          styles.menuIconWrapper,
          isDestructive && styles.menuIconDestructive,
        ]}
      >
        {icon}
      </View>
      <Text
        style={[styles.menuLabel, isDestructive && styles.menuLabelDestructive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Navbar Broker Props ──────────────────────────────────────────────────────
export interface NavbarBrokerProps {
  title: string;
  onSearchPress?: () => void;
  onNotificationsPress?: () => void;
  backgroundColor?: string;
  titleColor?: string;
  showBack?: boolean;
}

export function NavbarBroker({
  title,
  onSearchPress,
  onNotificationsPress,
  backgroundColor = "#ffffff",
  titleColor = "#1e293b",
  showBack = false,
}: Readonly<NavbarBrokerProps>) {
  const { logout, user } = useAuth();
  const { data: brokerSettings } = useBrokerSettings();
  const { topInset, bottomInset, navbarStyle } = useNavbarLayout();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const drawerTranslateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  const initials = useMemo(() => {
    const first = user?.firstName?.trim().at(0)?.toUpperCase() ?? "";
    const last = user?.lastName?.trim().at(0)?.toUpperCase() ?? "";
    return `${first}${last}` || "U";
  }, [user?.firstName, user?.lastName]);

  const roleLabel = useMemo(() => {
    switch (user?.role) {
      case "brokerage":
        return "Broker Owner";
      case "client":
        return "Client";
      case "admin":
        return "Super Admin";
      default:
        return "Agent";
    }
  }, [user?.role]);

  const brokerBrandingLogoUrl = useMemo(() => {
    if (user?.role !== "brokerage") return null;
    const branding = (brokerSettings?.settings as { logoUrl?: unknown } | null) ?? null;
    const logoUrl =
      typeof branding?.logoUrl === "string" ? branding.logoUrl.trim() : "";
    return logoUrl || null;
  }, [brokerSettings?.settings, user?.role]);

  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.timing(drawerTranslateX, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = (callback?: () => void) => {
    Animated.timing(drawerTranslateX, {
      toValue: -DRAWER_WIDTH,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setDrawerVisible(false);
      callback?.();
    });
  };

  const handleNavAction = (handler: () => void) => {
    closeDrawer(handler);
  };

  const handleLogout = () => {
    closeDrawer(() => {
      if (Platform.OS === "web") {
        const confirmed = globalThis.confirm(
          "Are you sure you want to sign out?",
        );
        if (confirmed) {
          void logout();
        }
      } else {
        Alert.alert("Sign Out", "Are you sure you want to sign out?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign Out",
            style: "destructive",
            onPress: () => void logout(),
          },
        ]);
      }
    });
  };

  const handleSearch = () => {
    if (onSearchPress) {
      onSearchPress();
      return;
    }
    Alert.alert("Search", "Search will be available here soon.");
  };

  const handleNotifications = () => {
    if (onNotificationsPress) {
      onNotificationsPress();
      return;
    }
    Alert.alert("Notifications", "No new notifications right now.");
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("BrokerageDashboard");
  };

  return (
    <>
      <StatusBar style="dark" />
      <View style={[styles.navbar, navbarStyle, { backgroundColor }]}>
        {showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Svg
              width={22}
              height={22}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1e293b"
              strokeWidth={2.3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Line x1={19} x2={5} y1={12} y2={12} />
              <Polyline points="12 19 5 12 12 5" />
            </Svg>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={openDrawer}
            style={styles.avatarButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Open profile menu"
            accessibilityRole="button"
          >
            {brokerBrandingLogoUrl ? (
              <Image
                source={{ uri: brokerBrandingLogoUrl }}
                style={styles.avatarLogoImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </TouchableOpacity>
        )}

        <Text
          style={[styles.navTitle, { color: titleColor }]}
          numberOfLines={1}
        >
          {title}
        </Text>

      
      </View>

      <Modal
        transparent
        visible={drawerVisible}
        animationType="none"
        onRequestClose={() => closeDrawer()}
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={() => closeDrawer()} />
          <Animated.View
            style={[
              styles.drawer,
              {
                top: 0,
                bottom: 0,
                paddingTop: topInset,
                paddingBottom: bottomInset,
                transform: [{ translateX: drawerTranslateX }],
              },
            ]}
          >
            {/* ── Brand Banner ─────────────────────────────────────────── */}
            <View style={styles.brandBanner}>
              <View style={styles.brandLogoWrapper}>
                <Image
                  source={require("../../../images/showing-trails-logo.png")}
                  style={styles.brandLogoImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.brandTextGroup}>
                <Text style={styles.brandName}>Showing Trails</Text>
                <Text style={styles.brandTagline}>Navigate Every Showing</Text>
              </View>
              <TouchableOpacity
                onPress={() => closeDrawer()}
                style={styles.drawerCloseButtonBrand}
                accessibilityLabel="Close drawer"
                accessibilityRole="button"
              >
                <Svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#C9980A"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Line x1={18} x2={6} y1={6} y2={18} />
                  <Line x1={6} x2={18} y1={6} y2={18} />
                </Svg>
              </TouchableOpacity>
            </View>

            {/* ── User Profile Row ──────────────────────────────────────── */}
            <View style={styles.drawerHeader}>
              {brokerBrandingLogoUrl ? (
                <Image
                  source={{ uri: brokerBrandingLogoUrl }}
                  style={styles.drawerProfileImage}
                  resizeMode="cover"
                />
              ) : user?.profileImageUrl ? (
                <Image
                  source={{ uri: user.profileImageUrl }}
                  style={styles.drawerProfileImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.drawerAvatar}>
                  <Text style={styles.drawerAvatarText}>{initials}</Text>
                </View>
              )}
              <View style={styles.drawerHeaderContent}>
                <Text style={styles.drawerName}>
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text style={styles.drawerEmail} numberOfLines={1}>
                  {user?.email}
                </Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>Role: {roleLabel}</Text>
                </View>
              </View>
            </View>

            {/* ── Menu: Settings + Sign Out only ───────────────────────── */}
            <ScrollView
              style={styles.drawerMenu}
              contentContainerStyle={styles.drawerMenuContent}
            >
              <Text style={styles.sectionTitle}>Features</Text>
              <MenuItem
                icon={
                  <Svg
                    width={18}
                    height={18}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <Line x1={18} x2={18} y1={20} y2={10} />
                    <Line x1={12} x2={12} y1={20} y2={4} />
                    <Line x1={6} x2={6} y1={20} y2={14} />
                  </Svg>
                }
                label="Analytics"
                onPress={() =>
                  handleNavAction(() => navigation.navigate("BrokerAnalytics"))
                }
              />
              <MenuItem
                icon={
                  <Svg
                    width={18}
                    height={18}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <Path d="M12 20h9" />
                    <Path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </Svg>
                }
                label="Branding Settings"
                onPress={() =>
                  handleNavAction(() => navigation.navigate("BrokerBranding"))
                }
              />
              <Text style={styles.sectionTitle}>Account</Text>
              <MenuItem
                icon={
                  <Svg
                    width={18}
                    height={18}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#64748b"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {/* User/Profile Icon */}
                    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <Circle cx={12} cy={7} r={4} />
                  </Svg>
                }
                label="Profile"
                onPress={() =>
                  handleNavAction(() => navigation.navigate("BrokerProfile"))
                }
              />

              <MenuItem
                icon={
                  <Svg
                    width={18}
                    height={18}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <Polyline points="16 17 21 12 16 7" />
                    <Line x1={21} x2={9} y1={12} y2={12} />
                  </Svg>
                }
                label="Sign Out"
                onPress={handleLogout}
                isDestructive
              />
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const DRAWER_WIDTH = 300;

const styles = StyleSheet.create({
  navbar: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1e40af",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  avatarLogoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "System",
    flex: 1,
    marginHorizontal: 12,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.32)",
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: "#ffffff",
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  brandBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  brandLogoWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: "hidden",
  },
  brandLogoImage: {
    width: 44,
    height: 44,
  },
  brandTextGroup: {
    flex: 1,
  },
  brandName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#C9980A",
    letterSpacing: 0.3,
  },
  brandTagline: {
    fontSize: 10,
    marginTop: 1,
    letterSpacing: 0.5,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  drawerCloseButtonBrand: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(201, 152, 10, 0.15)",
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginBottom: 4,
  },
  drawerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#1e40af",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  drawerProfileImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
    backgroundColor: "#e2e8f0",
  },
  drawerAvatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  drawerHeaderContent: {
    flex: 1,
  },
  drawerName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },
  drawerEmail: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  roleBadge: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleBadgeText: {
    fontSize: 11,
    color: "#1e40af",
    fontWeight: "600",
  },
  drawerMenu: {
    flex: 1,
  },
  drawerMenuContent: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 41,
    paddingHorizontal: 16,
    gap: 12,
    marginHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },
  menuIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  menuIconDestructive: {
    backgroundColor: "#fff1f2",
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1e293b",
  },
  menuLabelDestructive: {
    color: "#ef4444",
  },
});

export default NavbarBroker;
