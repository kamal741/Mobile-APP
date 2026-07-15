// components/SharePropertySheet.tsx
import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Animated,
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Share2, Check } from "lucide-react-native";
import { api } from "@/lib/api";
import { useOpenDirectConversation } from "@/hooks/useChat";
import { API_GLOBAL_PATHS } from "@/lib/apiGlobalPaths";

const { height: SCREEN_H } = Dimensions.get("window");

interface ShareClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  clientType: string;
}

export interface ShareProperty {
  id: number;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  city?: string;
  province?: string;
  propertyType?: string;
  imageUrl?: string | null;
}

type Props = {
  visible: boolean;
  property: ShareProperty | null;
  onClose: () => void;
};

export function SharePropertySheet({ visible, property, onClose }: Props) {
  const navigation = useNavigation<any>();
  const openDirectConversation = useOpenDirectConversation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ShareClient | null>(null);
  const [search, setSearch] = useState("");
  const slideAnim = useRef(new Animated.Value(0)).current;

  const { data: clients = [], isLoading } = useQuery<ShareClient[]>({
    queryKey: [API_GLOBAL_PATHS.agentClients, "for-share"],
    queryFn: async () => {
      const response = await api.get<{
        content?: Array<{
          id: number;
          firstName?: string | null;
          lastName?: string | null;
          email?: string | null;
          clientType?: string | null;
        }>;
      }>(`${API_GLOBAL_PATHS.agentClients}?page=0&size=100`);
      return (response.data.content ?? []).map((c) => ({
        id: String(c.id),
        firstName: c.firstName ?? "",
        lastName: c.lastName ?? "",
        email: c.email ?? "—",
        clientType: c.clientType ?? "buyer",
      }));
    },
    enabled: visible,
  });

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(0);
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(0);
      setSelectedId(null);
      setSelectedClient(null);
      setSearch("");
    }
  }, [visible]);

  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  const toggleClient = (client: ShareClient) => {
    if (selectedId === client.id) {
      setSelectedId(null);
      setSelectedClient(null);
    } else {
      setSelectedId(client.id);
      setSelectedClient(client);
    }
  };

  const handleSend = async () => {
    if (!property || !selectedId || !selectedClient) return;
    try {
      const conversation = await openDirectConversation.mutateAsync(Number(selectedId));
      const otherUserName =
        `${selectedClient.firstName} ${selectedClient.lastName}`.trim() || "Client";
      onClose();
      navigation.navigate("ChatRoom", {
        conversationId: conversation.id,
        otherUserName,
        sharedProperty: {
          id: property.id,
          address: property.address,
          price: property.price,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          city: property.city ?? null,
          province: property.province ?? null,
          propertyType: property.propertyType ?? null,
          imageUrl: property.imageUrl ?? null,
        },
      });
    } catch {
      Alert.alert("Unable to open chat", "Please try again in a moment.");
    }
  };

  const isSending = openDirectConversation.isPending;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  const initials = (c: ShareClient) =>
    `${c.firstName.charAt(0)}${c.lastName.charAt(0)}`.toUpperCase();

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.handle} />

        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Share Property</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.closeX}>✕</Text>
          </TouchableOpacity>
        </View>

        {property && (
          <View style={styles.propertyPreview}>
            <Text style={styles.previewPrice}>{formatPrice(property.price)}</Text>
            <Text style={styles.previewAddress} numberOfLines={1}>
              {property.address}
            </Text>
            <Text style={styles.previewMeta}>
              {property.bedrooms} bed · {property.bathrooms} bath
              {property.city ? ` · ${property.city}` : ""}
            </Text>
          </View>
        )}

        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search clients…"
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
        </View>

        {isLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="small" color="#1e40af" />
          </View>
        ) : (
          <FlatList
            data={filteredClients}
            keyExtractor={(c) => c.id}
            style={styles.clientList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyClients}>No clients found</Text>
            }
            renderItem={({ item: c }) => {
              const selected = selectedId === c.id;
              return (
                <TouchableOpacity
                  style={[styles.clientRow, selected && styles.clientRowSelected]}
                  onPress={() => toggleClient(c)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.clientAvatar, selected && styles.clientAvatarSelected]}>
                    {selected ? (
                      <Check size={14} color="#fff" strokeWidth={3} />
                    ) : (
                      <Text style={styles.clientAvatarText}>{initials(c)}</Text>
                    )}
                  </View>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{c.firstName} {c.lastName}</Text>
                    <Text style={styles.clientEmail} numberOfLines={1}>{c.email}</Text>
                  </View>
                  <View
                    style={[
                      styles.clientType,
                      c.clientType === "renter" && styles.clientTypeRenter,
                    ]}
                  >
                    <Text
                      style={[
                        styles.clientTypeText,
                        c.clientType === "renter" && styles.clientTypeTextRenter,
                      ]}
                    >
                      {c.clientType}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}

        <View style={styles.sendWrap}>
          {selectedClient && (
            <Text style={styles.selectedCount}>
              Sending to {selectedClient.firstName} {selectedClient.lastName}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.sendBtn, (!selectedId || isSending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!selectedId || isSending}
            activeOpacity={0.85}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
            ) : (
              <Share2 size={16} color="#fff" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.sendBtnText}>
              {isSending ? "Opening Chat…" : "Send to Client"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#00000055",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: SCREEN_H * 0.8,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e2e8f0",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  closeX: { fontSize: 16, color: "#94a3b8", fontWeight: "600" },
  propertyPreview: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  previewPrice: { fontSize: 16, fontWeight: "700", color: "#1e40af" },
  previewAddress: { fontSize: 13, color: "#1e293b", marginTop: 2 },
  previewMeta: { fontSize: 12, color: "#64748b", marginTop: 2 },
  searchWrap: { marginHorizontal: 20, marginTop: 12, marginBottom: 4 },
  searchInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
  },
  loaderWrap: { paddingVertical: 32, alignItems: "center" },
  clientList: { marginTop: 4, paddingHorizontal: 20, flex: 1 },
  emptyClients: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 14,
    paddingVertical: 24,
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  clientRowSelected: { backgroundColor: "#eff6ff", borderColor: "#93c5fd" },
  clientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  clientAvatarSelected: { backgroundColor: "#1e40af" },
  clientAvatarText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  clientEmail: { fontSize: 12, color: "#64748b", marginTop: 1 },
  clientType: {
    backgroundColor: "#dbeafe",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  clientTypeRenter: { backgroundColor: "#d1fae5" },
  clientTypeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1e40af",
    textTransform: "capitalize",
  },
  clientTypeTextRenter: { color: "#065f46" },
  sendWrap: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 8,
  },
  selectedCount: { fontSize: 12, color: "#64748b", textAlign: "center" },
  sendBtn: {
    flexDirection: "row",
    backgroundColor: "#1e40af",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#94a3b8" },
  sendBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
