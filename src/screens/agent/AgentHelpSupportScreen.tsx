import type { ReactNode } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  HelpCircle,
  Mail,
  MessageCircle,
  Palette,
  Route,
  Search,
  ShieldCheck,
  UploadCloud,
  Users,
} from "lucide-react-native";
import type { RootStackParamList } from "@/navigation/types";
import { APP_VERSION } from "@/constants/appVersion";
import { AgentFooter, useAgentFooterHeight } from "./components/AgentFooter";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

type SupportAction = {
  label: string;
  description: string;
  icon: ReactNode;
  onPress: () => void;
};

function SectionTitle({ children }: Readonly<{ children: string }>) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function ActionRow({
  label,
  description,
  icon,
  onPress,
}: Readonly<SupportAction>) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.82}>
      <View style={styles.actionIcon}>{icon}</View>
      <View style={styles.actionText}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      <ChevronRight size={18} color="#94a3b8" />
    </TouchableOpacity>
  );
}

function FaqItem({
  question,
  answer,
}: Readonly<{ question: string; answer: string }>) {
  return (
    <View style={styles.faqItem}>
      <Text style={styles.faqQuestion}>{question}</Text>
      <Text style={styles.faqAnswer}>{answer}</Text>
    </View>
  );
}

export function AgentHelpSupportScreen() {
  const navigation = useNavigation<Navigation>();
  const footerHeight = useAgentFooterHeight();

  const openSupportEmail = () => {
    const subject = encodeURIComponent("Showing Trail agent support request");
    const body = encodeURIComponent(
      `Hi Showing Trail support,\n\nI need help with:\n\n\nRole: Agent\nApp version: ${APP_VERSION}`,
    );
    const url = `mailto:support@showing-trail.com?subject=${subject}&body=${body}`;

    void Linking.openURL(url).catch(() => {
      Alert.alert(
        "Email unavailable",
        "No email app is configured on this device. Please use Chat or contact your brokerage admin.",
      );
    });
  };

  const actions: SupportAction[] = [
    {
      label: "Client dashboard",
      description: "Review clients, requirements, notes, media, and activity.",
      icon: <Users size={20} color="#1d4ed8" />,
      onPress: () => navigation.navigate("Clients"),
    },
    {
      label: "Tour management",
      description: "Create tours, review schedules, and manage showings.",
      icon: <CalendarDays size={20} color="#0f766e" />,
      onPress: () => navigation.navigate("Tours"),
    },
    {
      label: "Media Center",
      description: "Upload and manage property photos, videos, and shared media.",
      icon: <UploadCloud size={20} color="#7c3aed" />,
      onPress: () => navigation.navigate("MediaCenter", { userType: "Agent" }),
    },
    {
      label: "Agent chat",
      description: "Message clients and continue property conversations.",
      icon: <MessageCircle size={20} color="#1d4ed8" />,
      onPress: () => navigation.navigate("AgentChat"),
    },
    {
      label: "Branding settings",
      description: "Adjust your visible brand details and profile presentation.",
      icon: <Palette size={20} color="#c9980a" />,
      onPress: () => navigation.navigate("Branding"),
    },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: footerHeight + 24 },
        ]}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <HelpCircle size={28} color="#ffffff" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Agent Help & Support</Text>
            <Text style={styles.heroSubtitle}>
              Quick help for client work, tours, route planning, media, chat,
              and agent profile workflows.
            </Text>
          </View>
        </View>

        <SectionTitle>Quick Help</SectionTitle>
        <View style={styles.card}>
          {actions.map((action, index) => (
            <View key={action.label}>
              <ActionRow {...action} />
              {index < actions.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </View>

        <SectionTitle>Common Questions</SectionTitle>
        <View style={styles.card}>
          <FaqItem
            question="Where do I manage client preferences?"
            answer="Open Clients, select a client, then use their preference and requirement views to review buying criteria before creating a tour."
          />
          <View style={styles.divider} />
          <FaqItem
            question="How do I create or update a showing tour?"
            answer="Open Tours to create a new tour, choose the client, add properties, schedule the showing, then review before sending or approving."
          />
          <View style={styles.divider} />
          <FaqItem
            question="Where do I upload property media?"
            answer="Use Media Center or the upload action on a property to add photos, documents, and media that can be shared with clients."
          />
          <View style={styles.divider} />
          <FaqItem
            question="How do I troubleshoot route planning?"
            answer="Confirm the client, property order, starting address, date, and viewing time. Recalculate the route after changing stops."
          />
        </View>

        <SectionTitle>Support</SectionTitle>
        <View style={styles.card}>
          <ActionRow
            label="Email support"
            description="Send app issues, route problems, or account questions."
            icon={<Mail size={20} color="#1d4ed8" />}
            onPress={openSupportEmail}
          />
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Route size={20} color="#1d4ed8" />
            <Text style={styles.infoTitle}>Route Workflows</Text>
            <Text style={styles.infoBody}>Check tour timing and property order before approval.</Text>
          </View>
          <View style={styles.infoCard}>
            <BarChart3 size={20} color="#16a34a" />
            <Text style={styles.infoTitle}>Agent Tools</Text>
            <Text style={styles.infoBody}>Use clients, tours, chat, and media together.</Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <ShieldCheck size={18} color="#92400e" />
          <Text style={styles.tipText}>
            For faster support, include the client name, tour date, property
            address, and a screenshot of the issue.
          </Text>
        </View>

        <View style={styles.versionRow}>
          <Search size={15} color="#64748b" />
          <Text style={styles.versionText}>Showing Trail v{APP_VERSION}</Text>
        </View>
      </ScrollView>
      <AgentFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  hero: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    backgroundColor: "#1d4ed8",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 3,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#ffffff",
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#dbeafe",
  },
  sectionTitle: {
    marginTop: 22,
    marginBottom: 9,
    fontSize: 12,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  actionRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
  },
  actionText: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  actionDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: "#64748b",
  },
  divider: {
    height: 1,
    marginLeft: 66,
    backgroundColor: "#f1f5f9",
  },
  faqItem: {
    padding: 14,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  faqAnswer: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#64748b",
  },
  infoGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  infoCard: {
    flex: 1,
    minHeight: 110,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
  },
  infoTitle: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  infoBody: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#64748b",
  },
  tipCard: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#92400e",
    fontWeight: "600",
  },
  versionRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  versionText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
});
