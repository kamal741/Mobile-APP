import React from "react";
import { View } from "react-native";
import {
  History,
  ClipboardList,
  Star,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { ProfileMenuItem } from "./ProfileMenuItem";
import { colors } from "../styles/shared.styles";

interface Props {
  clientId: string;
  clientName?: string;
  totalTours: number;
  shortlistsCount: number;
  documentsCount: number;
  mediaCount: number;
  notesCount: number;
  groupsCount: number;
  hasRequirementsEnhanced: boolean;
  offersCount: number;
}

export function ProfileMenuList({
  clientId,
  clientName,
  totalTours,
  shortlistsCount,
  documentsCount,
  mediaCount,
  notesCount,
  groupsCount,
  hasRequirementsEnhanced,
  offersCount,
}: Readonly<Props>) {
  const navigation = useNavigation<any>();
  const nav = (route: string) => navigation.navigate(route, { clientId });

  const ICON_COLOR = colors.textMuted;
  const ICON_SIZE = 22;

  const menuItems = [
    {
      key: "tourHistory",
      icon: <History size={ICON_SIZE} color={ICON_COLOR} />,
      label: "Tour History",
      badge: totalTours > 0 ? totalTours : undefined,
      onPress: () => nav("TourHistory"),
    },
    {
      key: "Preferences",
      icon: <ClipboardList size={ICON_SIZE} color={ICON_COLOR} />,
      label: "Client Preferences",
      showStarBadge: hasRequirementsEnhanced,
      onPress: () =>
        navigation.navigate("AgentClientPreferences", {
          clientProfileId: clientId,
          clientName,
        }),
    },
    {
      key: "SavedProperties",
      icon: <Star size={ICON_SIZE} color={ICON_COLOR} />,
      label: "Saved Properties",
      badge: shortlistsCount > 0 ? shortlistsCount : undefined,
      onPress: () =>
        navigation.navigate("SavedProperties", {
          clientId,
          userType: "Agent",
        }),
    },
    {
      key: "Offers",
      icon: <Star size={ICON_SIZE} color={ICON_COLOR} />,
      label: "Offers",
      badge: offersCount > 0 ? offersCount : undefined,
      onPress: () =>
        navigation.navigate("ClientOfferList", {
          clientId,
          userType: "Agent",
        }),
    },
  ];

  return (
    <View style={{ marginBottom: 24 }}>
      {menuItems.map((item) => (
        <ProfileMenuItem
          key={item.key}
          icon={item.icon}
          label={item.label}
          badge={item.badge}
          showStarBadge={item.showStarBadge}
          onPress={item.onPress}
        />
      ))}
    </View>
  );
}
