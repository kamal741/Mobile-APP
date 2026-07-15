import { useLayoutEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ChevronRight,
  Mail,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react-native";
import { api, apiRequest } from "../../lib/api";
import { API_GLOBAL_PATHS } from "../../lib/apiGlobalPaths";
import { queryClient } from "../../lib/queryClient";
import { NavbarBroker } from "./components/NavbarBroker";
import { BrokerageFooter, useBrokerageFooterHeight } from "./components/BrokerageFooter";
import { useAndroidNavBarHeight } from "@/hooks/useAndroidNavBarHeight";

interface BrokerageAgent {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phoneE164?: string;
  brokerageRole?: string;
}

interface PageDto<T> {
  content: T[];
}

interface BrokerAgentApiItem {
  id: number;
  displayName?: string | null;
  email?: string | null;
  phoneE164?: string | null;
  status?: string | null;
}

function splitDisplayName(displayName?: string | null) {
  const raw = (displayName ?? "").trim();
  if (!raw) return { firstName: "Agent", lastName: "" };
  const parts = raw.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function titleCase(value?: string | null) {
  const raw = (value ?? "").trim();
  if (!raw) return "Active";
  return raw
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getInitials(agent: BrokerageAgent) {
  const first = agent.firstName?.[0] ?? "";
  const last = agent.lastName?.[0] ?? "";
  const initials = `${first}${last}`.trim();
  return (initials || agent.displayName.slice(0, 2) || "AG").toUpperCase();
}

function parseApiError(error: any): { title: string; message: string } {
  const status: number | undefined = error?.response?.status ?? error?.status;
  const detail: string | undefined = error?.response?.data?.detail;

  if (status === 409) {
    return {
      title: "Agent Already Registered",
      message:
        detail ||
        "This email is already registered as a broker owner, agent, or client.",
    };
  }

  return {
    title: "Unable to Link Agent",
    message: detail || error?.message || "Something went wrong. Please try again.",
  };
}

export function BrokerageAgentsScreen() {
  const navigation = useNavigation<any>();
  const footerHeight = useBrokerageFooterHeight();
  const [searchQuery, setSearchQuery] = useState("");
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [agentEmail, setAgentEmail] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const {
    data: agents,
    isLoading,
    isRefetching,
    isError,
    refetch,
  } = useQuery<BrokerageAgent[]>({
    queryKey: ["broker-agents"],
    queryFn: async () => {
      const response = await api.get<PageDto<BrokerAgentApiItem>>(
        `${API_GLOBAL_PATHS.brokerAgents}?page=0&size=200`,
      );
      return (response.data.content ?? []).map((item) => {
        const name = splitDisplayName(item.displayName);
        const displayName = item.displayName?.trim() || `${name.firstName} ${name.lastName}`.trim() || "Agent";
        return {
          id: String(item.id),
          firstName: name.firstName,
          lastName: name.lastName,
          displayName,
          email: item.email ?? "Not available",
          phoneE164: item.phoneE164 ?? undefined,
          brokerageRole: item.status ?? undefined,
        } satisfies BrokerageAgent;
      });
    },
  });

  const linkAgentMutation = useMutation({
    mutationFn: (data: { agentEmail: string }) =>
      apiRequest("POST", API_GLOBAL_PATHS.brokerAgentInvites, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broker-agents"] });
      setAgentEmail("");
      setLinkError(null);
      setShowLinkModal(false);
      Alert.alert("Invite sent", "Agent invite email has been sent.");
    },
    onError: (error: any) => {
      const { message } = parseApiError(error);
      setLinkError(message);
    },
  });

  const allAgents = agents ?? [];
  const activeAgents = allAgents.filter((agent) => (agent.brokerageRole ?? "").toUpperCase() === "ACTIVE").length;
  const pendingAgents = allAgents.filter((agent) => (agent.brokerageRole ?? "").toUpperCase() === "PENDING").length;

  const filteredAgents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allAgents;
    return allAgents.filter((agent) =>
      `${agent.displayName} ${agent.email} ${agent.phoneE164 ?? ""} ${agent.brokerageRole ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [allAgents, searchQuery]);

  const closeModal = () => {
    setShowLinkModal(false);
    setAgentEmail("");
    setLinkError(null);
  };

  const handleLinkAgent = () => {
    setLinkError(null);
    if (!agentEmail.trim() || !agentEmail.includes("@")) {
      setLinkError("Please enter a valid agent email address.");
      return;
    }
    linkAgentMutation.mutate({ agentEmail: agentEmail.trim() });
  };

  const renderAgent = ({ item }: { item: BrokerageAgent }) => (
    <AgentRow
      agent={item}
      onPress={() =>
        navigation.navigate("AgentProfile", {
          agentId: item.id,
          agent: item,
        })
      }
    />
  );

  return (
    <View style={styles.container}>
      <NavbarBroker title="Agents" />

      <FlatList
        data={filteredAgents}
        keyExtractor={(item) => item.id}
        renderItem={renderAgent}
        contentContainerStyle={[styles.list, { paddingBottom: footerHeight + 22 }]}
        refreshControl={<RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} />}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.heroIcon}>
                  <Users size={23} color="#1e40af" />
                </View>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroEyebrow}>Agent Network</Text>
                  <Text style={styles.heroTitle}>Manage your team</Text>
                  <Text style={styles.heroBody}>
                    Link agents, review their status, and open their client assignments from one place.
                  </Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                <SummaryPill label="Total" value={allAgents.length} tone="#1e40af" />
                <SummaryPill label="Active" value={activeAgents} tone="#16a34a" />
                <SummaryPill label="Pending" value={pendingAgents} tone="#f59e0b" />
              </View>
            </View>

            <View style={styles.toolbar}>
              <View style={styles.searchCard}>
                <Search size={17} color="#94a3b8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search agents, email, phone, or status"
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {isError && <AlertCircle size={17} color="#ef4444" />}
              </View>
              <Pressable
                style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
                onPress={() => setShowLinkModal(true)}
              >
                <Plus size={18} color="#ffffff" />
              </Pressable>
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>Results</Text>
                <Text style={styles.sectionTitle}>
                  {filteredAgents.length} {filteredAgents.length === 1 ? "agent" : "agents"}
                </Text>
              </View>
              <Pressable style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]} onPress={() => refetch()}>
                <RefreshCcw size={17} color="#1e40af" />
              </Pressable>
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.rowGap} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              {isError ? <AlertCircle size={30} color="#ef4444" /> : <UserPlus size={30} color="#94a3b8" />}
            </View>
            <Text style={styles.emptyText}>{isError ? "Unable to load agents" : "No agents found"}</Text>
            <Text style={styles.emptySubtext}>
              {isError
                ? "Pull to refresh after the backend is ready."
                : searchQuery.trim()
                  ? "Try another name, email, phone, or status."
                  : "Link agents to see them here."}
            </Text>
          </View>
        }
      />

      <LinkAgentModal
        visible={showLinkModal}
        agentEmail={agentEmail}
        linkError={linkError}
        isPending={linkAgentMutation.isPending}
        onChangeEmail={(text) => {
          setAgentEmail(text);
          if (linkError) setLinkError(null);
        }}
        onClose={closeModal}
        onSubmit={handleLinkAgent}
      />

      <BrokerageFooter active="agents" />
    </View>
  );
}

function SummaryPill({
  label,
  value,
  tone,
}: Readonly<{ label: string; value: number; tone: string }>) {
  return (
    <View style={styles.summaryPill}>
      <Text style={[styles.summaryValue, { color: tone }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function AgentRow({
  agent,
  onPress,
}: Readonly<{ agent: BrokerageAgent; onPress: () => void }>) {
  const status = titleCase(agent.brokerageRole);
  const statusTone = (agent.brokerageRole ?? "").toUpperCase() === "ACTIVE" ? "#16a34a" : "#f59e0b";

  return (
    <Pressable style={({ pressed }) => [styles.agentCard, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(agent)}</Text>
      </View>

      <View style={styles.agentInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.agentName} numberOfLines={1}>{agent.displayName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusTone}1A` }]}>
            <Text style={[styles.statusText, { color: statusTone }]}>{status}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Mail size={12} color="#94a3b8" />
          <Text style={styles.metaText} numberOfLines={1}>{agent.email}</Text>
        </View>

        {agent.phoneE164 ? (
          <View style={styles.metaRow}>
            <Phone size={12} color="#94a3b8" />
            <Text style={styles.metaText} numberOfLines={1}>{agent.phoneE164}</Text>
          </View>
        ) : (
          <View style={styles.metaRow}>
            <Phone size={12} color="#cbd5e1" />
            <Text style={styles.metaTextMuted}>No mobile number</Text>
          </View>
        )}
      </View>

      <View style={styles.rowAction}>
        <ShieldCheck size={17} color="#1e40af" />
        <ChevronRight size={18} color="#94a3b8" />
      </View>
    </Pressable>
  );
}

function LinkAgentModal({
  visible,
  agentEmail,
  linkError,
  isPending,
  onChangeEmail,
  onClose,
  onSubmit,
}: Readonly<{
  visible: boolean;
  agentEmail: string;
  linkError: string | null;
  isPending: boolean;
  onChangeEmail: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}>) {
  const androidNavBarHeight = useAndroidNavBarHeight();
  const footerHeight = useBrokerageFooterHeight();
  const modalBottomPadding = 18 + Math.max(androidNavBarHeight, footerHeight * 0.35);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalSheet, { paddingBottom: modalBottomPadding }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>Invite Agent</Text>
              <Text style={styles.modalTitle}>Link an agent</Text>
            </View>
            <Pressable style={({ pressed }) => [styles.modalCloseButton, pressed && styles.pressed]} onPress={onClose}>
              <X size={18} color="#64748b" />
            </Pressable>
          </View>

          <Text style={styles.modalSubtitle}>
            Enter the agent's email address and we will send an invite to join your brokerage.
          </Text>

          <TextInput
            style={[styles.input, linkError && styles.inputError]}
            placeholder="agent@example.com"
            placeholderTextColor="#94a3b8"
            value={agentEmail}
            onChangeText={onChangeEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {linkError && <Text style={styles.errorText}>{linkError}</Text>}

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              (isPending || pressed) && styles.submitBtnPressed,
              isPending && styles.submitBtnDisabled,
            ]}
            onPress={onSubmit}
            disabled={isPending}
          >
            <UserPlus size={18} color="#ffffff" />
            <Text style={styles.submitBtnText}>
              {isPending ? "Sending invite..." : "Send invite"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  headerContent: {
    gap: 14,
    marginBottom: 14,
  },
  heroCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dbe4ef",
    padding: 17,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  heroTop: {
    flexDirection: "row",
    gap: 13,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroEyebrow: {
    color: "#1e40af",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  heroTitle: {
    color: "#0f172a",
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 31,
    marginTop: 4,
  },
  heroBody: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    fontWeight: "600",
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  summaryPill: {
    minWidth: "23%",
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  summaryValue: {
    fontSize: 19,
    fontWeight: "800",
  },
  summaryLabel: {
    marginTop: 2,
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
  },
  toolbar: {
    flexDirection: "row",
    gap: 10,
  },
  searchCard: {
    flex: 1,
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ffffff",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#dbe4ef",
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: "#0f172a",
    fontSize: 14,
  },
  addButton: {
    width: 50,
    minHeight: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e40af",
    shadowColor: "#1e40af",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionEyebrow: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 19,
    fontWeight: "800",
    marginTop: 2,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  rowGap: {
    height: 10,
  },
  agentCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#ffffff",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#dbe4ef",
    padding: 14,
  },
  pressed: {
    opacity: 0.72,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e40af",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  agentInfo: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  agentName: {
    flex: 1,
    minWidth: 0,
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    flex: 1,
    minWidth: 0,
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  metaTextMuted: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  rowAction: {
    alignItems: "center",
    gap: 10,
    paddingTop: 2,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 54,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dbe4ef",
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    marginBottom: 14,
  },
  emptyText: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800",
  },
  emptySubtext: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.38)",
  },
  modalSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 34,
  },
  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
  },
  modalEyebrow: {
    color: "#1e40af",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  modalTitle: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 3,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  modalSubtitle: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dbe4ef",
    paddingHorizontal: 14,
    minHeight: 50,
    fontSize: 15,
    color: "#0f172a",
  },
  inputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fff7f7",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  submitBtn: {
    marginTop: 16,
    minHeight: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1e40af",
  },
  submitBtnPressed: {
    opacity: 0.82,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
});
