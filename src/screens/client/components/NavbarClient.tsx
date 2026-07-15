import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavbarLayout } from "@/hooks/useNavbarLayout";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../../navigation/types";
import { useAuth } from "../../../contexts/AuthContext";
import Svg, { Circle, Line, Path, Polyline } from "react-native-svg";
import { NotificationBellButton } from "@/components/NotificationBellButton";
import { useUnreadCount } from "../../../hooks/useNotifications";
import { Sparkles, SlidersHorizontal, ArrowLeft } from "lucide-react-native";
import { colors } from "@/screens/agent/ClientDashboard/styles/shared.styles";
import { APP_VERSION } from "@/constants/appVersion";

// ─── Menu Item ────────────────────────────────────────────────────────────────
interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
  badgeCount?: number;
}

function MenuItem({
  icon,
  label,
  onPress,
  isDestructive,
  badgeCount,
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
      {badgeCount !== undefined && badgeCount > 0 && (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>
            {badgeCount > 99 ? "99+" : badgeCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── NavbarClient Props ───────────────────────────────────────────────────────
export interface NavbarClientProps {
  title: string;
  onSearchPress?: () => void;
  onNotificationsPress?: () => void;
  backgroundColor?: string;
  titleColor?: string;
}

export function NavbarClient({
  title,
  onSearchPress,
  onNotificationsPress,
  backgroundColor = "#ffffff",
  titleColor = "#1e293b",
}: Readonly<NavbarClientProps>) {
  const { logout, user } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const drawerTranslateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const { data: unreadCount = 0 } = useUnreadCount();
  const canGoBack = navigation.canGoBack();

  const initials = useMemo(() => {
    const first = user?.firstName?.trim().at(0)?.toUpperCase() ?? "";
    const last = user?.lastName?.trim().at(0)?.toUpperCase() ?? "";
    return `${first}${last}` || "U";
  }, [user?.firstName, user?.lastName]);

  // Branding derived from client session's branding + agentDetails fields.
  // Falls back to default Showing Trails values when anything is missing.
  const brokerBranding = useMemo(() => {
    const branding = (user as any)?.branding;
    const agentDetails = (user as any)?.agentDetails;
    const agentName =
      branding?.agentName?.trim?.() ||
      agentDetails?.displayName?.trim?.() ||
      null;
    const brokerageName =
      branding?.brokerageName?.trim?.() ||
      user?.brokerDisplayName?.trim?.() ||
      null;
    const displayName =
      branding?.useOwnBranding === true
        ? agentName || brokerageName
        : brokerageName || agentName;
    return {
      logoUrl: branding?.logoUrl ?? null,
      displayName,
      email: agentDetails?.email ?? null,
    };
  }, [(user as any)?.branding, (user as any)?.agentDetails, user?.brokerDisplayName]);

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
        if (confirmed) void logout();
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
    navigation.navigate("Browse");
  };

  const handleNotifications = () => {
    if (onNotificationsPress) {
      onNotificationsPress();
      return;
    }
    navigation.navigate("Notifications");
  };

  const showComingSoon = (label: string) => {
    handleNavAction(() =>
      Alert.alert("Coming Soon", `${label} feature is coming soon!`),
    );
  };

  const { topInset, bottomInset, navbarStyle } = useNavbarLayout();

  return (
    <>
      <StatusBar style="dark" />
      {/* ── Navbar Bar ──────────────────────────────────────────────────── */}
      <View style={[styles.navbar, navbarStyle, { backgroundColor }]}>
        {/* Avatar / Drawer trigger */}
        <TouchableOpacity
          onPress={openDrawer}
          style={styles.avatarButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Open profile menu"
          accessibilityRole="button"
        >
          {user?.profileImageUrl ? (
            <Image
              source={{ uri: user.profileImageUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </TouchableOpacity>

        <Text
          style={[styles.navTitle, { color: titleColor }]}
          numberOfLines={1}
        >
          {title}
        </Text>

        <View style={styles.rightActions}>
          {/* Search */}
          <TouchableOpacity
            onPress={handleSearch}
            style={styles.iconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Search"
            accessibilityRole="button"
          >
            <Svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#334155"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Circle cx={11} cy={11} r={8} />
              <Line x1={21} x2={16.65} y1={21} y2={16.65} />
            </Svg>
          </TouchableOpacity>

          {/* Notifications */}
          <NotificationBellButton onPress={handleNotifications} />
        </View>
      </View>

      {/* ── Side Drawer ─────────────────────────────────────────────────── */}
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
                {brokerBranding.logoUrl ? (
                  <Image
                    source={{ uri: brokerBranding.logoUrl }}
                    style={styles.brandLogoImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Image
                    source={require("../../../images/showing-trails-logo.png")}
                    style={styles.brandLogoImage}
                    resizeMode="contain"
                  />
                )}
              </View>
              <View style={styles.brandTextGroup}>
                <Text style={styles.brandName} numberOfLines={1}>
                  {brokerBranding.displayName ?? "Showing Trails"}
                </Text>
                <Text style={styles.brandTagline} numberOfLines={1}>
                  {(user as any)?.branding?.emailFooter ??
                    "Navigate Every Showing"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => closeDrawer()}
                style={styles.drawerCloseButton}
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
              {user?.profileImageUrl ? (
                <Image
                  source={{ uri: user.profileImageUrl }}
                  style={styles.drawerProfileImage}
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
                  <Text style={styles.roleBadgeText}>Client</Text>
                </View>
              </View>
            </View>

            <ScrollView
              style={styles.drawerMenu}
              contentContainerStyle={styles.drawerMenuContent}
            >
              {/* ── Features Section ─────────────────────────────────── */}
              <Text style={styles.sectionTitle}>Features</Text>

              {/* <MenuItem
                icon={<Text style={styles.emojiIcon}>📄</Text>}
                label="My Documents"
                onPress={() => handleNavAction(() => navigation.navigate('MyDocuments'))}
              /> */}
              <MenuItem
                icon={<Text style={styles.emojiIcon}>❤️</Text>}
                label="Saved Properties"
                onPress={() =>
                  handleNavAction(() => navigation.navigate("SavedProperties"))
                }
              />
              <MenuItem
                icon={<Sparkles size={20} color="#c9980a" />}
                label="Recommendations"
                onPress={() =>
                  handleNavAction(() => navigation.navigate("Recommendations"))
                }
              />
              <MenuItem
                icon={
                  <SlidersHorizontal size={20} color={colors.textPrimary} />
                }
                label="My Preferences"
                onPress={() =>
                  handleNavAction(() =>
                    navigation.navigate("ClientPreferences"),
                  )
                }
              />
              <MenuItem
                icon={<Text style={styles.emojiIcon}>📸</Text>}
                label="Media Center"
                onPress={() =>
                  handleNavAction(() =>
                    navigation.navigate("MediaCenter", { userType: "Client" }),
                  )
                }
              />
              <MenuItem
                icon={<Text style={styles.emojiIcon}>📅</Text>}
                label="Personal Calendar"
                onPress={() =>
                  handleNavAction(() => navigation.navigate("PersonalCalendar"))
                }
              />
              
              {/* <MenuItem
                icon={<Text style={styles.emojiIcon}>🔔</Text>}
                label="Notifications"
                onPress={() => handleNavAction(() => navigation.navigate('Notifications'))}
                badgeCount={unreadCount}
              /> */}

              {/* Account Section */}
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
                    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <Circle cx={12} cy={7} r={4} />
                  </Svg>
                }
                label="My Profile"
                onPress={() =>
                  handleNavAction(() => navigation.navigate("MyProfile"))
                }
              />
              <MenuItem
                icon={<Text style={styles.emojiIcon}>❓</Text>}
                label="Help & Support"
                onPress={() =>
                  handleNavAction(() => navigation.navigate("HelpSupport"))
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


              <Text style={styles.versionText}>
                Showing Trail v{APP_VERSION}
              </Text>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const DRAWER_WIDTH = 300;

const styles = StyleSheet.create({
  // ── Navbar ──────────────────────────────────────────────────────────────────
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
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "600",
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

  // ── Modal / Drawer ───────────────────────────────────────────────────────────
  overlay: { flex: 1 },
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

  // ── Brand Banner ─────────────────────────────────────────────────────────────
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
  brandTextGroup: { flex: 1 },
  brandName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#C9980A",
    letterSpacing: 0.3,
  },
  brandTagline: {
    fontSize: 11,
    marginTop: 2,
    color: "#64748b",
    fontWeight: "500",
  },
  drawerCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(201, 152, 10, 0.15)",
  },

  // ── Profile Row ──────────────────────────────────────────────────────────────
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  drawerProfileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: "#e2e8f0",
  },
  drawerAvatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  drawerHeaderContent: { flex: 1 },
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
    backgroundColor: "#d1fae5",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleBadgeText: {
    fontSize: 11,
    color: "#065f46",
    fontWeight: "600",
  },

  // ── Menu ─────────────────────────────────────────────────────────────────────
  drawerMenu: { flex: 1 },
  drawerMenuContent: { paddingBottom: 20 },
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
    minHeight: 44,
    paddingHorizontal: 16,
    gap: 12,
    marginHorizontal: 8,
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
  menuIconDestructive: { backgroundColor: "#fff1f2" },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#1e293b",
  },
  menuLabelDestructive: { color: "#ef4444" },
  menuBadge: {
    backgroundColor: "#dc2626",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  menuBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  emojiIcon: {
    fontSize: 18,
    lineHeight: 18,
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 24,
    paddingBottom: 8,
  },
});

export default NavbarClient;
