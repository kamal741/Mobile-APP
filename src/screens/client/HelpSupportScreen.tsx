import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { ReactNode } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  CalendarDays,
  ChevronRight,
  Heart,
  HelpCircle,
  Home,
  Mail,
  MessageCircle,
  Search,
  Settings2,
  ShieldCheck,
} from "lucide-react-native";
import type { RootStackParamList } from "@/navigation/types";
import { APP_VERSION } from "@/constants/appVersion";
import { ClientFooter, useClientFooterHeight } from "./components/ClientFooter";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

type HelpAction = {
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
}: Readonly<HelpAction>) {
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

export function HelpSupportScreen() {
  const navigation = useNavigation<Navigation>();
  const footerHeight = useClientFooterHeight();

  const openSupportEmail = () => {
    const subject = encodeURIComponent("Showing Trail support request");
    const body = encodeURIComponent(
      `Hi Showing Trail support,\n\nI need help with:\n\n\nApp version: ${APP_VERSION}`,
    );
    const url = `mailto:support@showing-trail.com?subject=${subject}&body=${body}`;

    void Linking.openURL(url).catch(() => {
      Alert.alert(
        "Email unavailable",
        "No email app is configured on this device. Please contact your agent from Chat.",
      );
    });
  };

  const actions: HelpAction[] = [
    {
      label: "Message your agent",
      description: "Ask about tours, properties, offers, or next steps.",
      icon: <MessageCircle size={20} color="#1d4ed8" />,
      onPress: () => navigation.navigate("Chat"),
    },
    {
      label: "Update preferences",
      description: "Adjust budget, location, must-haves, and priorities.",
      icon: <Settings2 size={20} color="#7c3aed" />,
      onPress: () => navigation.navigate("ClientPreferences"),
    },
    {
      label: "Review saved properties",
      description: "Find homes you shortlisted while browsing.",
      icon: <Heart size={20} color="#ef4444" />,
      onPress: () => navigation.navigate("SavedProperties"),
    },
    {
      label: "Check tours",
      description: "View upcoming and completed showing tours.",
      icon: <CalendarDays size={20} color="#0f766e" />,
      onPress: () => navigation.navigate("MyTours"),
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
            <Text style={styles.heroTitle}>How can we help?</Text>
            <Text style={styles.heroSubtitle}>
              Get back to your home search quickly with help for tours,
              preferences, saved homes, chat, and offers.
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
            question="How do I change what kind of homes I want?"
            answer="Open Preferences and update your budget, location, must-haves, and priorities. Your agent can use this to recommend better matches."
          />
          <View style={styles.divider} />
          <FaqItem
            question="Where can I find homes I saved?"
            answer="Use Saved Properties from the menu. You can revisit listings and remove homes you are no longer interested in."
          />
          <View style={styles.divider} />
          <FaqItem
            question="How do I talk to my agent?"
            answer="Open Chat to message your agent. Use it for tour questions, property feedback, and follow-ups."
          />
          <View style={styles.divider} />
          <FaqItem
            question="Where are my scheduled showings?"
            answer="Open My Tours to see upcoming tours, route details, and completed visits."
          />
        </View>

        <SectionTitle>Support</SectionTitle>
        <View style={styles.card}>
          <ActionRow
            label="Email support"
            description="Send app issues or account questions to Showing Trail."
            icon={<Mail size={20} color="#1d4ed8" />}
            onPress={openSupportEmail}
          />
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Home size={20} color="#1d4ed8" />
            <Text style={styles.infoTitle}>Showing Trail</Text>
            <Text style={styles.infoBody}>Navigate every showing with your agent.</Text>
          </View>
          <View style={styles.infoCard}>
            <ShieldCheck size={20} color="#16a34a" />
            <Text style={styles.infoTitle}>App Version</Text>
            <Text style={styles.infoBody}>v{APP_VERSION}</Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Search size={18} color="#92400e" />
          <Text style={styles.tipText}>
            For the fastest help, include the property address, tour date, or a
            screenshot when contacting your agent or support.
          </Text>
        </View>
      </ScrollView>
      <ClientFooter />
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
});
