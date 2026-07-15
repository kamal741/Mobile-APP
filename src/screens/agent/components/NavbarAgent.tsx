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
import Svg, {
  Circle,
  Line,
  Path,
  Polyline,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { NotificationBellButton } from "../../../components/NotificationBellButton";

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

// ─── Showing Trails Brand Logo (SVG recreation of gold map-pin + trail) ──────
function ShowingTrailsBrandMark({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#F5D280" />
          <Stop offset="50%" stopColor="#C9980A" />
          <Stop offset="100%" stopColor="#A67C00" />
        </LinearGradient>
      </Defs>
      {/* Map pin body */}
      <Path
        d="M28 14 C18 14 10 22 10 32 C10 46 28 62 28 62 C28 62 46 46 46 32 C46 22 38 14 28 14 Z"
        fill="url(#goldGrad)"
      />
      <Circle cx={28} cy={32} r={8} fill="#0a0a0a" />
      {/* Winding trail */}
      <Path
        d="M46 52 Q60 36 62 28 Q64 20 72 20 Q80 20 80 28 Q80 38 70 42 Q60 46 62 56 Q64 64 74 64"
        fill="none"
        stroke="url(#goldGrad)"
        strokeWidth={9}
        strokeLinecap="round"
      />
      {/* Small pin at top of trail */}
      <Path
        d="M72 8 C67 8 63 12 63 17 C63 23 72 30 72 30 C72 30 81 23 81 17 C81 12 77 8 72 8 Z"
        fill="url(#goldGrad)"
      />
      <Circle cx={72} cy={17} r={4} fill="#0a0a0a" />
    </Svg>
  );
}

function withAlpha(hexColor: string | undefined | null, alphaHex: string): string {
  const color = hexColor?.trim();
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) {
    return `#C9980A${alphaHex}`;
  }
  return `${color}${alphaHex}`;
}

// ─── Quick-Add Dropdown ───────────────────────────────────────────────────────
interface QuickAddDropdownProps {
  visible: boolean;
  anchorRight: number;
  anchorTop: number;
  onClose: () => void;
  onNewOffer: () => void;
  onNewTour: () => void;
}

function QuickAddDropdown({
  visible,
  anchorRight,
  anchorTop,
  onClose,
  onNewOffer,
  onNewTour,
}: QuickAddDropdownProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 18,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View
          style={[
            dropdownStyles.container,
            {
              top: anchorTop,
              right: anchorRight,
              opacity: opacityAnim,
              transform: [
                {
                  scale: scaleAnim,
                },
                {
                  translateY: scaleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-8, 0],
                  }),
                },
              ],
              transformOrigin: "top right",
            },
          ]}
        >
          {/* Caret / arrow pointing up-right */}
          <View style={dropdownStyles.caret} />

          <TouchableOpacity
            activeOpacity={0.75}
            style={dropdownStyles.item}
            onPress={onNewOffer}
          >
            <View style={dropdownStyles.itemIconWrapper}>
              <Svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#C9980A"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <Polyline points="14 2 14 8 20 8" />
                <Line x1={12} y1={18} x2={12} y2={12} />
                <Line x1={9} y1={15} x2={15} y2={15} />
              </Svg>
            </View>
            <View style={dropdownStyles.itemTextGroup}>
              <Text style={dropdownStyles.itemLabel}>New Offer</Text>
              <Text style={dropdownStyles.itemSub}>Draft a property offer</Text>
            </View>
          </TouchableOpacity>

          <View style={dropdownStyles.divider} />

          <TouchableOpacity
            activeOpacity={0.75}
            style={dropdownStyles.item}
            onPress={onNewTour}
          >
            <View style={dropdownStyles.itemIconWrapper}>
              <Svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1e40af"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <Polyline points="9 22 9 12 15 12 15 22" />
              </Svg>
            </View>
            <View style={dropdownStyles.itemTextGroup}>
              <Text style={dropdownStyles.itemLabel}>New Tour</Text>
              <Text style={dropdownStyles.itemSub}>
                Schedule a showing tour
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const dropdownStyles = StyleSheet.create({
  container: {
    position: "absolute",
    width: 210,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 16,
    overflow: "visible",
  },
  caret: {
    position: "absolute",
    top: -7,
    right: 14,
    width: 14,
    height: 14,
    backgroundColor: "#ffffff",
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    transform: [{ rotate: "45deg" }],
    zIndex: 1,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 11,
    borderRadius: 14,
  },
  itemIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  itemTextGroup: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    letterSpacing: 0.1,
  },
  itemSub: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginHorizontal: 12,
  },
});

// ─── Navbar Props ─────────────────────────────────────────────────────────────
export interface NavbarAgentProps {
  title: string;
  showBack?: boolean;
  onBackPress?: () => void;
  onSearchPress?: () => void;
  onNotificationsPress?: () => void;
  backgroundColor?: string;
  titleColor?: string;
}

export function NavbarAgent({
  title,
  showBack = false,
  onBackPress,
  onSearchPress,
  onNotificationsPress,
  backgroundColor = "#ffffff",
  titleColor = "#1e293b",
}: Readonly<NavbarAgentProps>) {
  const { logout, user } = useAuth();
  const { topInset, bottomInset, navbarStyle } = useNavbarLayout();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const drawerTranslateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  // Quick-add dropdown state
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const plusButtonRef = useRef<TouchableOpacity>(null);
  const [dropdownAnchor, setDropdownAnchor] = useState({ top: 0, right: 0 });
  const plusRotateAnim = useRef(new Animated.Value(0)).current;

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

  const brokerBranding = useMemo(() => {
    const branding = user?.branding;
    const primaryColor = branding?.primaryColor?.trim() || "#C9980A";
    const secondaryColor = branding?.secondaryColor?.trim() || "#64748b";
    return {
      logoUrl: user?.brokerLogoUrl || branding?.logoUrl?.trim() || null,
      titleText: user?.brokerDisplayName?.trim() || branding?.brokerageName?.trim() || "Showing Trails",
      subtitleText: "Brokerage branding",
      primaryColor,
      secondaryColor,
      closeBackgroundColor: withAlpha(primaryColor, "20"),
    };
  }, [user?.branding, user?.brokerDisplayName, user?.brokerLogoUrl]);

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
    if (user?.role === "agent") {
      navigation.navigate("AgentBrowse", { userType: "agent" });
      return;
    } else {
        navigation.navigate("Browse");
    }
    Alert.alert("Search", "Search will be available here soon.");
  };

  const handleNotifications = () => {
    if (onNotificationsPress) {
      onNotificationsPress();
      return;
    }
    navigation.navigate("Notifications");
  };

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("AgentDashboard");
  };

  const showComingSoon = (label: string) => {
    handleNavAction(() =>
      Alert.alert("Coming Soon", `${label} feature is coming soon!`),
    );
  };

  // ── Quick-add handlers ────────────────────────────────────────────────────
  const handlePlusPress = () => {
    plusButtonRef.current?.measure((_fx, _fy, width, height, px, py) => {
      const rightEdgeFromScreenRight =
        // distance from button's right edge to screen right edge
        // We position the dropdown so its right aligns with the button's right
        // In RN, right in absolute positioning = distance from parent's right
        // Modal is full screen, so right = screenWidth - (px + width)
        0; // We'll compute below
      setDropdownAnchor({
        top: py + height + topInset + 6,
        right: 12,
      });
      setQuickAddVisible(true);
      Animated.spring(plusRotateAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 18,
      }).start();
    });
  };

  const handleQuickAddClose = () => {
    setQuickAddVisible(false);
    Animated.spring(plusRotateAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 200,
      friction: 18,
    }).start();
  };

  const handleNewOffer = () => {
    handleQuickAddClose();
    navigation.navigate("CreateOffer");
  };

  const handleNewTour = () => {
    handleQuickAddClose();
    navigation.navigate("CreateTour");
  };

  const plusRotate = plusRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

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
              stroke="#334155"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Line x1={19} y1={12} x2={5} y2={12} />
              <Line x1={12} y1={19} x2={5} y2={12} />
              <Line x1={12} y1={5} x2={5} y2={12} />
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
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        )}

        <Text
          style={[styles.navTitle, { color: titleColor }]}
          numberOfLines={1}
        >
          {title}
        </Text>

        <View style={styles.rightActions}>
          {/* ── Plus / Quick-Add button ── */}
          {/* <TouchableOpacity
            ref={plusButtonRef}
            onPress={handlePlusPress}
            style={[styles.iconButton, quickAddVisible && styles.iconButtonActive]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Quick add"
            accessibilityRole="button"
          >
            <Animated.View style={{ transform: [{ rotate: plusRotate }] }}>
              <Svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke={quickAddVisible ? '#C9980A' : '#334155'}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Line x1={12} y1={5} x2={12} y2={19} />
                <Line x1={5} y1={12} x2={19} y2={12} />
              </Svg>
            </Animated.View>
          </TouchableOpacity> */}

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

          <NotificationBellButton onPress={handleNotifications} />
        </View>
      </View>

      {/* ── Quick-Add Dropdown ── */}
      <QuickAddDropdown
        visible={quickAddVisible}
        anchorTop={dropdownAnchor.top}
        anchorRight={dropdownAnchor.right}
        onClose={handleQuickAddClose}
        onNewOffer={handleNewOffer}
        onNewTour={handleNewTour}
      />

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
            {/* <View style={styles.brandBanner}>
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
            </View> */}

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
      <ShowingTrailsBrandMark size={44} />
    )}
  </View>
  <View style={styles.brandTextGroup}>
    <Text style={[styles.brandName, { color: brokerBranding.primaryColor }]} numberOfLines={1}>
      {brokerBranding.titleText}
    </Text>
    <Text style={[styles.brandTagline, { color: brokerBranding.secondaryColor }]} numberOfLines={1}>
      {brokerBranding.subtitleText}
    </Text>
  </View>
  <TouchableOpacity
    onPress={() => closeDrawer()}
    style={[styles.drawerCloseButtonBrand, { backgroundColor: brokerBranding.closeBackgroundColor }]}
    accessibilityLabel="Close drawer"
    accessibilityRole="button"
  >
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"
      stroke={brokerBranding.primaryColor} strokeWidth={2.5}
      strokeLinecap="round" strokeLinejoin="round"
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
                  <Text style={styles.roleBadgeText}>Role: {roleLabel}</Text>
                </View>
              </View>
            </View>

            <ScrollView
              style={styles.drawerMenu}
              contentContainerStyle={styles.drawerMenuContent}
            >
              <Text style={styles.sectionTitle}>Features</Text>

              <MenuItem
                icon={<Text style={styles.emojiIcon}>📸</Text>}
                label="Media Center"
                onPress={() =>
                  handleNavAction(() =>
                    navigation.navigate("MediaCenter", { userType: "Agent" }),
                  )
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
                  handleNavAction(() =>
                    navigation.navigate(
                      user?.role === "brokerage" ? "BrokerBranding" : "Branding",
                    ),
                  )
                }
              />


              <MenuItem
                icon={<Text style={styles.emojiIcon}>📅</Text>}
                label="Personal Calendar"
                onPress={() => handleNavAction(() => navigation.navigate("PersonalCalendar"))}
              />


              <Text style={styles.sectionTitle}>Account</Text>
              {PROFILE_PICTURE_NAV_OPT_IN ? (
                <MenuItem
                  icon={<Text style={styles.emojiIcon}>🖼️</Text>}
                  label="Profile Picture"
                  onPress={() =>
                    handleNavAction(() => navigation.navigate("MyProfile"))
                  }
                />
              ) : null}
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
                  handleNavAction(() =>
                    navigation.navigate(
                      user?.role === "brokerage" ? "BrokerProfile" : "MyProfile",
                    ),
                  )
                }
              />
              <MenuItem
                icon={<Text style={styles.emojiIcon}>❓</Text>}
                label="Help & Support"
                onPress={() =>
                  handleNavAction(() => navigation.navigate("AgentHelpSupport"))
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

const NAVBAR_HEIGHT = 56;
const DRAWER_WIDTH = 300;

const PROFILE_PICTURE_NAV_OPT_IN =
  (process.env.EXPO_PUBLIC_SHOW_PROFILE_PICTURE_NAV ?? "")
    .trim()
    .toLowerCase() === "true";

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
  backButton: {
    width: 36,
    height: 36,
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
  iconButtonActive: {
    backgroundColor: "rgba(201, 152, 10, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(201, 152, 10, 0.35)",
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
  fontSize: 11,
  marginTop: 2,
  color: "#64748b",
  fontWeight: "500",
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
  drawerCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
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
  menuItemBorder: {},
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
  emojiIcon: {
    fontSize: 18,
    lineHeight: 18,
  },
});

export default NavbarAgent;










// import React, { useMemo, useRef, useState } from "react";
// import {
//   Alert,
//   Animated,
//   Modal,
//   Platform,
//   Pressable,
//   ScrollView,
//   StatusBar,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
//   Image,
// } from "react-native";
// import { useNavigation } from "@react-navigation/native";
// import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
// import type { RootStackParamList } from "../../../navigation/types";
// import { useAuth } from "../../../contexts/AuthContext";
// import Svg, {
//   Circle,
//   Line,
//   Path,
//   Polyline,
//   Defs,
//   LinearGradient,
//   Stop,
// } from "react-native-svg";
// import { NotificationBellButton } from "../../../components/NotificationBellButton";

// // ─── Menu Item ────────────────────────────────────────────────────────────────
// interface MenuItemProps {
//   icon: React.ReactNode;
//   label: string;
//   onPress: () => void;
//   isDestructive?: boolean;
// }

// function MenuItem({
//   icon,
//   label,
//   onPress,
//   isDestructive,
// }: Readonly<MenuItemProps>) {
//   return (
//     <TouchableOpacity
//       onPress={onPress}
//       activeOpacity={0.8}
//       style={styles.menuItem}
//     >
//       <View
//         style={[
//           styles.menuIconWrapper,
//           isDestructive && styles.menuIconDestructive,
//         ]}
//       >
//         {icon}
//       </View>
//       <Text
//         style={[styles.menuLabel, isDestructive && styles.menuLabelDestructive]}
//       >
//         {label}
//       </Text>
//     </TouchableOpacity>
//   );
// }

// // ─── Showing Trails Brand Logo (SVG recreation of gold map-pin + trail) ──────
// function ShowingTrailsBrandMark({ size = 32 }: { size?: number }) {
//   return (
//     <Svg width={size} height={size} viewBox="0 0 100 100">
//       <Defs>
//         <LinearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
//           <Stop offset="0%" stopColor="#F5D280" />
//           <Stop offset="50%" stopColor="#C9980A" />
//           <Stop offset="100%" stopColor="#A67C00" />
//         </LinearGradient>
//       </Defs>
//       {/* Map pin body */}
//       <Path
//         d="M28 14 C18 14 10 22 10 32 C10 46 28 62 28 62 C28 62 46 46 46 32 C46 22 38 14 28 14 Z"
//         fill="url(#goldGrad)"
//       />
//       <Circle cx={28} cy={32} r={8} fill="#0a0a0a" />
//       {/* Winding trail */}
//       <Path
//         d="M46 52 Q60 36 62 28 Q64 20 72 20 Q80 20 80 28 Q80 38 70 42 Q60 46 62 56 Q64 64 74 64"
//         fill="none"
//         stroke="url(#goldGrad)"
//         strokeWidth={9}
//         strokeLinecap="round"
//       />
//       {/* Small pin at top of trail */}
//       <Path
//         d="M72 8 C67 8 63 12 63 17 C63 23 72 30 72 30 C72 30 81 23 81 17 C81 12 77 8 72 8 Z"
//         fill="url(#goldGrad)"
//       />
//       <Circle cx={72} cy={17} r={4} fill="#0a0a0a" />
//     </Svg>
//   );
// }

// // ─── Quick-Add Dropdown ───────────────────────────────────────────────────────
// interface QuickAddDropdownProps {
//   visible: boolean;
//   anchorRight: number;
//   anchorTop: number;
//   onClose: () => void;
//   onNewOffer: () => void;
//   onNewTour: () => void;
// }

// function QuickAddDropdown({
//   visible,
//   anchorRight,
//   anchorTop,
//   onClose,
//   onNewOffer,
//   onNewTour,
// }: QuickAddDropdownProps) {
//   const scaleAnim = useRef(new Animated.Value(0)).current;
//   const opacityAnim = useRef(new Animated.Value(0)).current;

//   React.useEffect(() => {
//     if (visible) {
//       Animated.parallel([
//         Animated.spring(scaleAnim, {
//           toValue: 1,
//           useNativeDriver: true,
//           tension: 200,
//           friction: 18,
//         }),
//         Animated.timing(opacityAnim, {
//           toValue: 1,
//           duration: 120,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     } else {
//       Animated.parallel([
//         Animated.timing(scaleAnim, {
//           toValue: 0,
//           duration: 120,
//           useNativeDriver: true,
//         }),
//         Animated.timing(opacityAnim, {
//           toValue: 0,
//           duration: 100,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   }, [visible]);

//   if (!visible) return null;

//   return (
//     <Modal
//       transparent
//       visible={visible}
//       animationType="none"
//       onRequestClose={onClose}
//       statusBarTranslucent
//     >
//       <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
//         <Animated.View
//           style={[
//             dropdownStyles.container,
//             {
//               top: anchorTop,
//               right: anchorRight,
//               opacity: opacityAnim,
//               transform: [
//                 {
//                   scale: scaleAnim,
//                 },
//                 {
//                   translateY: scaleAnim.interpolate({
//                     inputRange: [0, 1],
//                     outputRange: [-8, 0],
//                   }),
//                 },
//               ],
//               transformOrigin: "top right",
//             },
//           ]}
//         >
//           {/* Caret / arrow pointing up-right */}
//           <View style={dropdownStyles.caret} />

//           <TouchableOpacity
//             activeOpacity={0.75}
//             style={dropdownStyles.item}
//             onPress={onNewOffer}
//           >
//             <View style={dropdownStyles.itemIconWrapper}>
//               <Svg
//                 width={16}
//                 height={16}
//                 viewBox="0 0 24 24"
//                 fill="none"
//                 stroke="#C9980A"
//                 strokeWidth={2}
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//               >
//                 <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
//                 <Polyline points="14 2 14 8 20 8" />
//                 <Line x1={12} y1={18} x2={12} y2={12} />
//                 <Line x1={9} y1={15} x2={15} y2={15} />
//               </Svg>
//             </View>
//             <View style={dropdownStyles.itemTextGroup}>
//               <Text style={dropdownStyles.itemLabel}>New Offer</Text>
//               <Text style={dropdownStyles.itemSub}>Draft a property offer</Text>
//             </View>
//           </TouchableOpacity>

//           <View style={dropdownStyles.divider} />

//           <TouchableOpacity
//             activeOpacity={0.75}
//             style={dropdownStyles.item}
//             onPress={onNewTour}
//           >
//             <View style={dropdownStyles.itemIconWrapper}>
//               <Svg
//                 width={16}
//                 height={16}
//                 viewBox="0 0 24 24"
//                 fill="none"
//                 stroke="#1e40af"
//                 strokeWidth={2}
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//               >
//                 <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
//                 <Polyline points="9 22 9 12 15 12 15 22" />
//               </Svg>
//             </View>
//             <View style={dropdownStyles.itemTextGroup}>
//               <Text style={dropdownStyles.itemLabel}>New Tour</Text>
//               <Text style={dropdownStyles.itemSub}>
//                 Schedule a showing tour
//               </Text>
//             </View>
//           </TouchableOpacity>
//         </Animated.View>
//       </Pressable>
//     </Modal>
//   );
// }

// const dropdownStyles = StyleSheet.create({
//   container: {
//     position: "absolute",
//     width: 210,
//     backgroundColor: "#ffffff",
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: "#e2e8f0",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 8 },
//     shadowOpacity: 0.14,
//     shadowRadius: 20,
//     elevation: 16,
//     overflow: "visible",
//   },
//   caret: {
//     position: "absolute",
//     top: -7,
//     right: 14,
//     width: 14,
//     height: 14,
//     backgroundColor: "#ffffff",
//     borderLeftWidth: 1,
//     borderTopWidth: 1,
//     borderColor: "#e2e8f0",
//     transform: [{ rotate: "45deg" }],
//     zIndex: 1,
//   },
//   item: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 14,
//     paddingVertical: 12,
//     gap: 11,
//     borderRadius: 14,
//   },
//   itemIconWrapper: {
//     width: 34,
//     height: 34,
//     borderRadius: 9,
//     backgroundColor: "#f8fafc",
//     alignItems: "center",
//     justifyContent: "center",
//     borderWidth: 1,
//     borderColor: "#e2e8f0",
//   },
//   itemTextGroup: {
//     flex: 1,
//   },
//   itemLabel: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#0f172a",
//     letterSpacing: 0.1,
//   },
//   itemSub: {
//     fontSize: 11,
//     color: "#94a3b8",
//     marginTop: 1,
//   },
//   divider: {
//     height: 1,
//     backgroundColor: "#f1f5f9",
//     marginHorizontal: 12,
//   },
// });

// // ─── Navbar Props ─────────────────────────────────────────────────────────────
// export interface NavbarAgentProps {
//   title: string;
//   onSearchPress?: () => void;
//   onNotificationsPress?: () => void;
//   backgroundColor?: string;
//   titleColor?: string;
// }

// export function NavbarAgent({
//   title,
//   onSearchPress,
//   onNotificationsPress,
//   backgroundColor = "#ffffff",
//   titleColor = "#1e293b",
// }: Readonly<NavbarAgentProps>) {
//   const { logout, user } = useAuth();
//   const navigation =
//     useNavigation<NativeStackNavigationProp<RootStackParamList>>();
//   const [drawerVisible, setDrawerVisible] = useState(false);
//   const drawerTranslateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

//   // Quick-add dropdown state
//   const [quickAddVisible, setQuickAddVisible] = useState(false);
//   const plusButtonRef = useRef<TouchableOpacity>(null);
//   const [dropdownAnchor, setDropdownAnchor] = useState({ top: 0, right: 0 });
//   const plusRotateAnim = useRef(new Animated.Value(0)).current;

//   const initials = useMemo(() => {
//     const first = user?.firstName?.trim().at(0)?.toUpperCase() ?? "";
//     const last = user?.lastName?.trim().at(0)?.toUpperCase() ?? "";
//     return `${first}${last}` || "U";
//   }, [user?.firstName, user?.lastName]);

//   const roleLabel = useMemo(() => {
//     switch (user?.role) {
//       case "brokerage":
//         return "Broker Owner";
//       case "client":
//         return "Client";
//       case "admin":
//         return "Super Admin";
//       default:
//         return "Agent";
//     }
//   }, [user?.role]);

//   const openDrawer = () => {
//     setDrawerVisible(true);
//     Animated.timing(drawerTranslateX, {
//       toValue: 0,
//       duration: 200,
//       useNativeDriver: true,
//     }).start();
//   };

//   const closeDrawer = (callback?: () => void) => {
//     Animated.timing(drawerTranslateX, {
//       toValue: -DRAWER_WIDTH,
//       duration: 180,
//       useNativeDriver: true,
//     }).start(() => {
//       setDrawerVisible(false);
//       callback?.();
//     });
//   };

//   const handleNavAction = (handler: () => void) => {
//     closeDrawer(handler);
//   };

//   const handleLogout = () => {
//     closeDrawer(() => {
//       if (Platform.OS === "web") {
//         const confirmed = globalThis.confirm(
//           "Are you sure you want to sign out?",
//         );
//         if (confirmed) {
//           void logout();
//         }
//       } else {
//         Alert.alert("Sign Out", "Are you sure you want to sign out?", [
//           { text: "Cancel", style: "cancel" },
//           {
//             text: "Sign Out",
//             style: "destructive",
//             onPress: () => void logout(),
//           },
//         ]);
//       }
//     });
//   };

//   const handleSearch = () => {
//     if (onSearchPress) {
//       onSearchPress();
//       return;
//     }
//     if (user?.role === "agent") {
//       navigation.navigate("AgentBrowse", { userType: "agent" });
//       return;
//     } else {
//         navigation.navigate("Browse");
//     }
//     Alert.alert("Search", "Search will be available here soon.");
//   };

//   const handleNotifications = () => {
//     if (onNotificationsPress) {
//       onNotificationsPress();
//       return;
//     }
//     navigation.navigate("Notifications");
//   };

//   const showComingSoon = (label: string) => {
//     handleNavAction(() =>
//       Alert.alert("Coming Soon", `${label} feature is coming soon!`),
//     );
//   };

//   // ── Quick-add handlers ────────────────────────────────────────────────────
//   const handlePlusPress = () => {
//     plusButtonRef.current?.measure((_fx, _fy, width, height, px, py) => {
//       const rightEdgeFromScreenRight =
//         // distance from button's right edge to screen right edge
//         // We position the dropdown so its right aligns with the button's right
//         // In RN, right in absolute positioning = distance from parent's right
//         // Modal is full screen, so right = screenWidth - (px + width)
//         0; // We'll compute below
//       setDropdownAnchor({
//         top: py + height + STATUS_BAR_HEIGHT + 6,
//         right: 12,
//       });
//       setQuickAddVisible(true);
//       Animated.spring(plusRotateAnim, {
//         toValue: 1,
//         useNativeDriver: true,
//         tension: 200,
//         friction: 18,
//       }).start();
//     });
//   };

//   const handleQuickAddClose = () => {
//     setQuickAddVisible(false);
//     Animated.spring(plusRotateAnim, {
//       toValue: 0,
//       useNativeDriver: true,
//       tension: 200,
//       friction: 18,
//     }).start();
//   };

//   const handleNewOffer = () => {
//     handleQuickAddClose();
//     navigation.navigate("CreateOffer");
//   };

//   const handleNewTour = () => {
//     handleQuickAddClose();
//     navigation.navigate("CreateTour");
//   };

//   const plusRotate = plusRotateAnim.interpolate({
//     inputRange: [0, 1],
//     outputRange: ["0deg", "45deg"],
//   });

//   return (
//     <>
//       <View style={[styles.navbar, { backgroundColor }]}>
//         <TouchableOpacity
//           onPress={openDrawer}
//           style={styles.avatarButton}
//           hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
//           accessibilityLabel="Open profile menu"
//           accessibilityRole="button"
//         >
//           <Text style={styles.avatarText}>{initials}</Text>
//         </TouchableOpacity>

//         <Text
//           style={[styles.navTitle, { color: titleColor }]}
//           numberOfLines={1}
//         >
//           {title}
//         </Text>

//         <View style={styles.rightActions}>
//           {/* ── Plus / Quick-Add button ── */}
//           {/* <TouchableOpacity
//             ref={plusButtonRef}
//             onPress={handlePlusPress}
//             style={[styles.iconButton, quickAddVisible && styles.iconButtonActive]}
//             hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
//             accessibilityLabel="Quick add"
//             accessibilityRole="button"
//           >
//             <Animated.View style={{ transform: [{ rotate: plusRotate }] }}>
//               <Svg
//                 width={18}
//                 height={18}
//                 viewBox="0 0 24 24"
//                 fill="none"
//                 stroke={quickAddVisible ? '#C9980A' : '#334155'}
//                 strokeWidth={2.5}
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//               >
//                 <Line x1={12} y1={5} x2={12} y2={19} />
//                 <Line x1={5} y1={12} x2={19} y2={12} />
//               </Svg>
//             </Animated.View>
//           </TouchableOpacity> */}

//           <TouchableOpacity
//             onPress={handleSearch}
//             style={styles.iconButton}
//             hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
//             accessibilityLabel="Search"
//             accessibilityRole="button"
//           >
//             <Svg
//               width={18}
//               height={18}
//               viewBox="0 0 24 24"
//               fill="none"
//               stroke="#334155"
//               strokeWidth={2}
//               strokeLinecap="round"
//               strokeLinejoin="round"
//             >
//               <Circle cx={11} cy={11} r={8} />
//               <Line x1={21} x2={16.65} y1={21} y2={16.65} />
//             </Svg>
//           </TouchableOpacity>

//           <NotificationBellButton onPress={handleNotifications} />
//         </View>
//       </View>

//       {/* ── Quick-Add Dropdown ── */}
//       <QuickAddDropdown
//         visible={quickAddVisible}
//         anchorTop={dropdownAnchor.top}
//         anchorRight={dropdownAnchor.right}
//         onClose={handleQuickAddClose}
//         onNewOffer={handleNewOffer}
//         onNewTour={handleNewTour}
//       />

//       <Modal
//         transparent
//         visible={drawerVisible}
//         animationType="none"
//         onRequestClose={() => closeDrawer()}
//         statusBarTranslucent
//       >
//         <View style={styles.overlay}>
//           <Pressable style={styles.backdrop} onPress={() => closeDrawer()} />
//           <Animated.View
//             style={[
//               styles.drawer,
//               {
//                 transform: [{ translateX: drawerTranslateX }],
//               },
//             ]}
//           >
//             {/* ── Brand Banner ─────────────────────────────────────────── */}
//             {/* <View style={styles.brandBanner}>
//               <View style={styles.brandLogoWrapper}>
//                 <Image
//                   source={require("../../../images/showing-trails-logo.png")}
//                   style={styles.brandLogoImage}
//                   resizeMode="contain"
//                 />
//               </View>
//               <View style={styles.brandTextGroup}>
//                 <Text style={styles.brandName}>Showing Trails</Text>
//                 <Text style={styles.brandTagline}>Navigate Every Showing</Text>
//               </View>
//               <TouchableOpacity
//                 onPress={() => closeDrawer()}
//                 style={styles.drawerCloseButtonBrand}
//                 accessibilityLabel="Close drawer"
//                 accessibilityRole="button"
//               >
//                 <Svg
//                   width={14}
//                   height={14}
//                   viewBox="0 0 24 24"
//                   fill="none"
//                   stroke="#C9980A"
//                   strokeWidth={2.5}
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                 >
//                   <Line x1={18} x2={6} y1={6} y2={18} />
//                   <Line x1={6} x2={18} y1={6} y2={18} />
//                 </Svg>
//               </TouchableOpacity>
//             </View> */}

//             {/* ── Brand Banner ─────────────────────────────────────────── */}
// <View style={styles.brandBanner}>
//   <View style={styles.brandLogoWrapper}>
//     {user?.brokerLogoUrl ? (
//       <Image
//         source={{ uri: user.brokerLogoUrl }}
//         style={styles.brandLogoImage}
//         resizeMode="contain"
//       />
//     ) : (
//       <ShowingTrailsBrandMark size={44} />
//     )}
//   </View>
//   <View style={styles.brandTextGroup}>
//     <Text style={styles.brandName} numberOfLines={1}>
//       {user?.brokerDisplayName ?? "Showing Trails"}
//     </Text>
//     <Text style={styles.brandTagline} numberOfLines={1}>
//       {user?.email ?? "Navigate Every Showing"}
//     </Text>
//   </View>
//   <TouchableOpacity
//     onPress={() => closeDrawer()}
//     style={styles.drawerCloseButtonBrand}
//     accessibilityLabel="Close drawer"
//     accessibilityRole="button"
//   >
//     <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"
//       stroke="#C9980A" strokeWidth={2.5}
//       strokeLinecap="round" strokeLinejoin="round"
//     >
//       <Line x1={18} x2={6} y1={6} y2={18} />
//       <Line x1={6} x2={18} y1={6} y2={18} />
//     </Svg>
//   </TouchableOpacity>
// </View>

//             {/* ── User Profile Row ──────────────────────────────────────── */}
//             <View style={styles.drawerHeader}>
//               {user?.profileImageUrl ? (
//                 <Image
//                   source={{ uri: user.profileImageUrl }}
//                   style={styles.drawerProfileImage}
//                 />
//               ) : (
//                 <View style={styles.drawerAvatar}>
//                   <Text style={styles.drawerAvatarText}>{initials}</Text>
//                 </View>
//               )}
//               <View style={styles.drawerHeaderContent}>
//                 <Text style={styles.drawerName}>
//                   {user?.firstName} {user?.lastName}
//                 </Text>
//                 <Text style={styles.drawerEmail} numberOfLines={1}>
//                   {user?.email}
//                 </Text>
//                 <View style={styles.roleBadge}>
//                   <Text style={styles.roleBadgeText}>Role: {roleLabel}</Text>
//                 </View>
//               </View>
//             </View>

//             <ScrollView
//               style={styles.drawerMenu}
//               contentContainerStyle={styles.drawerMenuContent}
//             >
//               <Text style={styles.sectionTitle}>Features</Text>

//               <MenuItem
//                 icon={<Text style={styles.emojiIcon}>📸</Text>}
//                 label="Media Center"
//                 onPress={() =>
//                   handleNavAction(() =>
//                     navigation.navigate("MediaCenter", { userType: "Agent" }),
//                   )
//                 }
//               />

//               <MenuItem
//                 icon={<Text style={styles.emojiIcon}>📋</Text>}
//                 label="Requirements Hub"
//                 onPress={() => showComingSoon("Requirements Hub")}
//               />
//               <MenuItem
//                 icon={<Text style={styles.emojiIcon}>📒</Text>}
//                 label="Contact Directory"
//                 onPress={() => showComingSoon("Contact Directory")}
//               />

//               <MenuItem
//                 icon={<Text style={styles.emojiIcon}>📅</Text>}
//                 label="Personal Calendar"
//                 onPress={() => showComingSoon("Personal Calendar")}
//               />

//               <Text style={styles.sectionTitle}>Account</Text>
//               {PROFILE_PICTURE_NAV_OPT_IN ? (
//                 <MenuItem
//                   icon={<Text style={styles.emojiIcon}>🖼️</Text>}
//                   label="Profile Picture"
//                   onPress={() =>
//                     handleNavAction(() => navigation.navigate("MyProfile"))
//                   }
//                 />
//               ) : null}
//               <MenuItem
//                 icon={
//                   <Svg
//                     width={18}
//                     height={18}
//                     viewBox="0 0 24 24"
//                     fill="none"
//                     stroke="#64748b"
//                     strokeWidth={2}
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                   >
//                     <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
//                     <Circle cx={12} cy={7} r={4} />
//                   </Svg>
//                 }
//                 label="My Profile"
//                 onPress={() =>
//                   handleNavAction(() => navigation.navigate("MyProfile"))
//                 }
//               />
//               <MenuItem
//                 icon={<Text style={styles.emojiIcon}>❓</Text>}
//                 label="Help & Support"
//                 onPress={() => showComingSoon("Help & Support")}
//               />
//               <MenuItem
//                 icon={
//                   <Svg
//                     width={18}
//                     height={18}
//                     viewBox="0 0 24 24"
//                     fill="none"
//                     stroke="#ef4444"
//                     strokeWidth={2}
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                   >
//                     <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
//                     <Polyline points="16 17 21 12 16 7" />
//                     <Line x1={21} x2={9} y1={12} y2={12} />
//                   </Svg>
//                 }
//                 label="Sign Out"
//                 onPress={handleLogout}
//                 isDestructive
//               />
//             </ScrollView>
//           </Animated.View>
//         </View>
//       </Modal>
//     </>
//   );
// }

// const NAVBAR_HEIGHT = 56;
// const STATUS_BAR_HEIGHT =
//   Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
// const DRAWER_WIDTH = 300;

// const PROFILE_PICTURE_NAV_OPT_IN =
//   (process.env.EXPO_PUBLIC_SHOW_PROFILE_PICTURE_NAV ?? "")
//     .trim()
//     .toLowerCase() === "true";

// const styles = StyleSheet.create({
//   navbar: {
//     height: NAVBAR_HEIGHT + STATUS_BAR_HEIGHT,
//     paddingTop: STATUS_BAR_HEIGHT,
//     paddingHorizontal: 16,
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     borderBottomWidth: 1,
//     borderBottomColor: "#e2e8f0",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.06,
//     shadowRadius: 3,
//     elevation: 2,
//   },
//   avatarButton: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     backgroundColor: "#1e40af",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   avatarText: {
//     color: "#ffffff",
//     fontSize: 13,
//     fontWeight: "700",
//   },
//   navTitle: {
//     fontSize: 18,
//     fontWeight: "600",
//     fontFamily: "System",
//     flex: 1,
//     marginHorizontal: 12,
//   },
//   rightActions: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//   },
//   iconButton: {
//     width: 34,
//     height: 34,
//     borderRadius: 10,
//     backgroundColor: "#f1f5f9",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   iconButtonActive: {
//     backgroundColor: "rgba(201, 152, 10, 0.12)",
//     borderWidth: 1,
//     borderColor: "rgba(201, 152, 10, 0.35)",
//   },
//   overlay: {
//     flex: 1,
//   },
//   backdrop: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: "rgba(15, 23, 42, 0.32)",
//   },
//   drawer: {
//     position: "absolute",
//     left: 0,
//     top: 0,
//     bottom: 0,
//     width: DRAWER_WIDTH,
//     paddingTop: STATUS_BAR_HEIGHT,
//     backgroundColor: "#ffffff",
//     borderRightWidth: 1,
//     borderRightColor: "#e2e8f0",
//     shadowColor: "#000",
//     shadowOffset: { width: 6, height: 0 },
//     shadowOpacity: 0.12,
//     shadowRadius: 12,
//     elevation: 12,
//   },

//   brandBanner: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 14,
//     paddingVertical: 14,
//     gap: 10,
//   },
//   brandLogoWrapper: {
//     width: 44,
//     height: 44,
//     borderRadius: 10,
//     overflow: "hidden",
//   },
//   brandLogoImage: {
//     width: 44,
//     height: 44,
//   },
//   brandTextGroup: {
//     flex: 1,
//   },
//   brandName: {
//     fontSize: 16,
//     fontWeight: "800",
//     color: "#C9980A",
//     letterSpacing: 0.3,
//   },
// brandTagline: {
//   fontSize: 11,
//   marginTop: 2,
//   color: "#64748b",
//   fontWeight: "500",
// },
//   drawerCloseButtonBrand: {
//     width: 28,
//     height: 28,
//     borderRadius: 8,
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: "rgba(201, 152, 10, 0.15)",
//   },

//   drawerHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 16,
//     paddingTop: 14,
//     paddingBottom: 14,
//     borderBottomWidth: 1,
//     borderBottomColor: "#f1f5f9",
//     marginBottom: 4,
//   },
//   drawerAvatar: {
//     width: 42,
//     height: 42,
//     borderRadius: 21,
//     backgroundColor: "#1e40af",
//     alignItems: "center",
//     justifyContent: "center",
//     marginRight: 10,
//   },
//   drawerProfileImage: {
//     width: 42,
//     height: 42,
//     borderRadius: 21,
//     marginRight: 10,
//     backgroundColor: "#e2e8f0",
//   },
//   drawerAvatarText: {
//     color: "#fff",
//     fontWeight: "700",
//     fontSize: 14,
//   },
//   drawerHeaderContent: {
//     flex: 1,
//   },
//   drawerCloseButton: {
//     width: 30,
//     height: 30,
//     borderRadius: 8,
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: "#f1f5f9",
//   },
//   drawerName: {
//     fontSize: 15,
//     fontWeight: "600",
//     color: "#0f172a",
//   },
//   drawerEmail: {
//     fontSize: 12,
//     color: "#64748b",
//     marginTop: 2,
//   },
//   roleBadge: {
//     marginTop: 6,
//     alignSelf: "flex-start",
//     backgroundColor: "#eff6ff",
//     borderRadius: 12,
//     paddingHorizontal: 8,
//     paddingVertical: 3,
//   },
//   roleBadgeText: {
//     fontSize: 11,
//     color: "#1e40af",
//     fontWeight: "600",
//   },
//   drawerMenu: {
//     flex: 1,
//   },
//   drawerMenuContent: {
//     paddingBottom: 20,
//   },
//   sectionTitle: {
//     fontSize: 12,
//     fontWeight: "600",
//     color: "#94a3b8",
//     textTransform: "uppercase",
//     paddingHorizontal: 16,
//     paddingTop: 16,
//     paddingBottom: 6,
//   },
//   menuItem: {
//     flexDirection: "row",
//     alignItems: "center",
//     minHeight: 41,
//     paddingHorizontal: 16,
//     gap: 12,
//     marginHorizontal: 10,
//     borderRadius: 10,
//     backgroundColor: "#ffffff",
//   },
//   menuItemBorder: {},
//   menuIconWrapper: {
//     width: 32,
//     height: 32,
//     borderRadius: 8,
//     backgroundColor: "#f1f5f9",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   menuIconDestructive: {
//     backgroundColor: "#fff1f2",
//   },
//   menuLabel: {
//     fontSize: 16,
//     fontWeight: "500",
//     color: "#1e293b",
//   },
//   menuLabelDestructive: {
//     color: "#ef4444",
//   },
//   emojiIcon: {
//     fontSize: 18,
//     lineHeight: 18,
//   },
// });

// export default NavbarAgent;
