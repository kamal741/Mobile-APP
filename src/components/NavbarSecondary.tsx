import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavbarLayout } from "@/hooks/useNavbarLayout";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import Svg, { Circle, Line } from "react-native-svg";
import { NotificationBellButton } from "@/components/NotificationBellButton";

// ─── NavbarSecondary Props ─────────────────────────────────────────────────
export interface NavbarSecondaryProps {
  title?: string;
  onBackPress?: () => void;
  onSearchPress?: () => void;
  onNotificationsPress?: () => void;
  backgroundColor?: string;
  titleColor?: string;
  iconColor?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
}

export function NavbarSecondary({
  title,
  onBackPress,
  onSearchPress,
  onNotificationsPress,
  backgroundColor = "#ffffff",
  titleColor = "#1e293b",
  iconColor = "#334155",
  showSearch = true,
  showNotifications = true,
}: Readonly<NavbarSecondaryProps>) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { navbarStyle } = useNavbarLayout();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
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

  return (
    <>
      <StatusBar style="dark" />
      <View style={[styles.navbar, navbarStyle, { backgroundColor }]}>
      {/* Back Arrow (no background) */}
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
          stroke={iconColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Line x1={19} y1={12} x2={5} y2={12} />
          <Line x1={12} y1={19} x2={5} y2={12} />
          <Line x1={12} y1={5} x2={5} y2={12} />
        </Svg>
      </TouchableOpacity>

      {title ? (
        <Text
          style={[styles.navTitle, { color: titleColor }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      ) : (
        <View style={styles.spacer} />
      )}

      <View style={styles.rightActions}>
        {/* Search */}
        {showSearch && (
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
              stroke={iconColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Circle cx={11} cy={11} r={8} />
              <Line x1={21} x2={16.65} y1={21} y2={16.65} />
            </Svg>
          </TouchableOpacity>
        )}

        {/* Notifications */}
        {showNotifications && (
          <NotificationBellButton onPress={handleNotifications} />
        )}
      </View>
    </View>
    </>
  );
}

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
  backButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    marginHorizontal: 12,
  },
  spacer: {
    flex: 1,
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
});

export default NavbarSecondary;
