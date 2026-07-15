import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  TOUR_PRIORITIES,
  type TourRequestFeedback,
} from "../lib/tourRequestFeedback";

type Props = {
  value: TourRequestFeedback;
  onChange: (next: TourRequestFeedback) => void;
};

const INITIAL_PRIORITY_COUNT = 7;

function StepHeader({
  step,
  title,
  optional,
}: {
  step: number;
  title: string;
  optional?: boolean;
}) {
  return (
    <View style={styles.stepHeader}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{step}</Text>
      </View>
      <Text style={styles.stepTitle}>{title}</Text>
      {optional ? <Text style={styles.optional}>Optional</Text> : null}
    </View>
  );
}

export function TourRequestFeedbackForm({ value, onChange }: Props) {
  const [showAllPriorities, setShowAllPriorities] = useState(false);

  const togglePriority = (priority: string) => {
    const priorities = value.priorities.includes(priority)
      ? value.priorities.filter((item) => item !== priority)
      : [...value.priorities, priority];
    onChange({ ...value, priorities });
  };

  const visiblePriorities = showAllPriorities
    ? TOUR_PRIORITIES
    : TOUR_PRIORITIES.slice(0, INITIAL_PRIORITY_COUNT);
  const hiddenCount = TOUR_PRIORITIES.length - INITIAL_PRIORITY_COUNT;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Help your agent prepare</Text>
        <Text style={styles.subtitle}>
          Your answers are shared with your agent before the tour.
        </Text>
      </View>

      <StepHeader step={1} title="What matters most?" optional />
      <View style={styles.priorityGrid}>
        {visiblePriorities.map((option) => {
          const selected = value.priorities.includes(option.value);
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.priorityChip, selected && styles.selectedChip]}
              onPress={() => togglePriority(option.value)}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.checkmark, selected && styles.checkmarkSelected]}
              >
                {selected ? "✓" : "+"}
              </Text>
              <Text style={[styles.chipText, selected && styles.selectedText]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        {!showAllPriorities && hiddenCount > 0 && (
          <TouchableOpacity
            style={styles.moreLink}
            onPress={() => setShowAllPriorities(true)}
            activeOpacity={0.6}
          >
            <Text style={styles.moreLinkText}>More (+{hiddenCount})</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.divider} />
      <StepHeader
        step={2}
        title="Anything else your agent should know?"
        optional
      />
      <TextInput
        value={value.comments}
        onChangeText={(comments) => onChange({ ...value, comments })}
        placeholder="Share accessibility needs, questions, or features you want to inspect closely..."
        placeholderTextColor="#94a3b8"
        multiline
        numberOfLines={4}
        maxLength={1000}
        textAlignVertical="top"
        style={styles.textarea}
      />
      <Text style={styles.characterCount}>{value.comments.length}/1000</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 16,
  },
  header: { marginBottom: 18 },
  title: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  subtitle: { marginTop: 3, fontSize: 12, lineHeight: 17, color: "#64748b" },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 10,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#16715b",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  stepTitle: { flex: 1, color: "#334155", fontSize: 14, fontWeight: "700" },
  optional: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 18 },
  priorityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  priorityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#dbe2ea",
    borderRadius: 20,
    backgroundColor: "#f8fafc",
  },
  selectedChip: { borderColor: "#9acbbb", backgroundColor: "#edf7f2" },
  chipText: { color: "#526174", fontSize: 12, fontWeight: "600" },
  checkmark: { color: "#94a3b8", fontSize: 13, fontWeight: "700" },
  checkmarkSelected: { color: "#16715b" },
  moreLink: {
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 9,
  },
  moreLinkText: {
    color: "#1e293b",
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  textarea: {
    minHeight: 96,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
    fontSize: 14,
    lineHeight: 20,
  },
  characterCount: {
    marginTop: 5,
    color: "#94a3b8",
    fontSize: 10,
    textAlign: "right",
  },
  selectedText: { color: "#0f5e4b", fontWeight: "700" },
});










// import {
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import {
//   TOUR_PRIORITIES,
//   type TourRequestFeedback,
// } from "../lib/tourRequestFeedback";

// type Props = {
//   value: TourRequestFeedback;
//   onChange: (next: TourRequestFeedback) => void;
// };

// function StepHeader({
//   step,
//   title,
//   optional,
// }: {
//   step: number;
//   title: string;
//   optional?: boolean;
// }) {
//   return (
//     <View style={styles.stepHeader}>
//       <View style={styles.stepBadge}>
//         <Text style={styles.stepBadgeText}>{step}</Text>
//       </View>
//       <Text style={styles.stepTitle}>{title}</Text>
//       {optional ? <Text style={styles.optional}>Optional</Text> : null}
//     </View>
//   );
// }

// export function TourRequestFeedbackForm({ value, onChange }: Props) {
//   const togglePriority = (priority: string) => {
//     const priorities = value.priorities.includes(priority)
//       ? value.priorities.filter((item) => item !== priority)
//       : [...value.priorities, priority];
//     onChange({ ...value, priorities });
//   };

//   return (
//     <View style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.title}>Help your agent prepare</Text>
//         <Text style={styles.subtitle}>
//           Your answers are shared with your agent before the tour.
//         </Text>
//       </View>

//       <StepHeader step={1} title="What matters most?" optional />
//       <View style={styles.priorityGrid}>
//         {TOUR_PRIORITIES.map((option) => {
//           const selected = value.priorities.includes(option.value);
//           return (
//             <TouchableOpacity
//               key={option.value}
//               style={[styles.priorityChip, selected && styles.selectedChip]}
//               onPress={() => togglePriority(option.value)}
//               activeOpacity={0.8}
//             >
//               <Text
//                 style={[styles.checkmark, selected && styles.checkmarkSelected]}
//               >
//                 {selected ? "✓" : "+"}
//               </Text>
//               <Text style={[styles.chipText, selected && styles.selectedText]}>
//                 {option.label}
//               </Text>
//             </TouchableOpacity>
//           );
//         })}
//       </View>

//       <View style={styles.divider} />
//       <StepHeader
//         step={2}
//         title="Anything else your agent should know?"
//         optional
//       />
//       <TextInput
//         value={value.comments}
//         onChangeText={(comments) => onChange({ ...value, comments })}
//         placeholder="Share accessibility needs, questions, or features you want to inspect closely..."
//         placeholderTextColor="#94a3b8"
//         multiline
//         numberOfLines={4}
//         maxLength={1000}
//         textAlignVertical="top"
//         style={styles.textarea}
//       />
//       <Text style={styles.characterCount}>{value.comments.length}/1000</Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     marginTop: 16,
//     borderTopWidth: 1,
//     borderTopColor: "#e2e8f0",
//     paddingTop: 16,
//   },
//   header: { marginBottom: 18 },
//   title: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
//   subtitle: { marginTop: 3, fontSize: 12, lineHeight: 17, color: "#64748b" },
//   stepHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 9,
//     marginBottom: 10,
//   },
//   stepBadge: {
//     width: 24,
//     height: 24,
//     borderRadius: 12,
//     backgroundColor: "#16715b",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   stepBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
//   stepTitle: { flex: 1, color: "#334155", fontSize: 14, fontWeight: "700" },
//   optional: {
//     color: "#94a3b8",
//     fontSize: 10,
//     fontWeight: "600",
//     textTransform: "uppercase",
//   },
//   divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 18 },
//   priorityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
//   priorityChip: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 5,
//     paddingHorizontal: 11,
//     paddingVertical: 9,
//     borderWidth: 1,
//     borderColor: "#dbe2ea",
//     borderRadius: 20,
//     backgroundColor: "#f8fafc",
//   },
//   selectedChip: { borderColor: "#9acbbb", backgroundColor: "#edf7f2" },
//   chipText: { color: "#526174", fontSize: 12, fontWeight: "600" },
//   checkmark: { color: "#94a3b8", fontSize: 13, fontWeight: "700" },
//   checkmarkSelected: { color: "#16715b" },
//   textarea: {
//     minHeight: 96,
//     padding: 12,
//     borderWidth: 1.5,
//     borderColor: "#e2e8f0",
//     borderRadius: 12,
//     color: "#1e293b",
//     backgroundColor: "#f8fafc",
//     fontSize: 14,
//     lineHeight: 20,
//   },
//   characterCount: {
//     marginTop: 5,
//     color: "#94a3b8",
//     fontSize: 10,
//     textAlign: "right",
//   },
//   selectedText: { color: "#0f5e4b", fontWeight: "700" },
// });


