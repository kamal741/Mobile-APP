import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { MinusCircle, Plus, User, Users, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, border, fontSize, fontWeight } from "@/theme";
import { BottomSheetOverlay } from "@/components/common/BottomSheetOverlay";
import { conversationInitials } from "../../../lib/chat/display";
import type { GroupMemberDisplay } from "../../../lib/chat/participants";
const { height: SCREEN_H } = Dimensions.get("window");
// Base height is 80% of the screen, plus an extra 300px of room.
// Clamped so the sheet can never exceed the available screen height.
const SHEET_HEIGHT = Math.min(SCREEN_H * 0.8);

interface GroupMembersSheetProps {
  visible: boolean;
  groupTitle: string;
  members: GroupMemberDisplay[];
  canManage?: boolean;
  managing?: boolean;
  removeError?: string | null;
  onClose: () => void;
  onAddMembers?: () => void;
  onRemoveMember?: (member: GroupMemberDisplay) => void;
}

export function GroupMembersSheet({
  visible,
  groupTitle,
  members,
  canManage = false,
  managing = false,
  removeError = null,
  onClose,
  onAddMembers,
  onRemoveMember,
  avoidFooterHeight = 0,
}: Readonly<GroupMembersSheetProps> & { avoidFooterHeight?: number }) {
  // Renders via BottomSheetOverlay instead of RN's core Modal so it stays
  // in the same window as the rest of the app. Modal opens a separate
  // native Dialog window on Android that doesn't inherit the
  // absolute-positioned edge-to-edge nav bar set in App.tsx, which is what
  // caused the bottom row (list items) to sit under the system nav bar on
  // some devices.
  const insets = useSafeAreaInsets();
  const [pendingRemove, setPendingRemove] = useState<GroupMemberDisplay | null>(
    null,
  );

  useEffect(() => {
    if (!visible) {
      setPendingRemove(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!pendingRemove) return;
    const stillPresent = members.some(
      (member) =>
        member.kind === pendingRemove.kind && member.id === pendingRemove.id,
    );
    if (!stillPresent) {
      setPendingRemove(null);
    }
  }, [members, pendingRemove]);

  const canRemoveMember = (member: GroupMemberDisplay) =>
    canManage && !member.isSelf && onRemoveMember != null;

  const handleConfirmRemove = () => {
    if (!pendingRemove || !onRemoveMember || managing) return;
    const member = pendingRemove;
    setPendingRemove(null);
    onRemoveMember(member);
  };

  return (
    <BottomSheetOverlay visible={visible} onClose={onClose}>
      <View
        style={[
          styles.container,
          {
            marginBottom:  Math.max(avoidFooterHeight + 28, 28),
            paddingBottom: Math.max(insets.bottom + 28, 28),
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerBody}>
            <Text style={styles.title}>Group members</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {groupTitle}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={8}
          >
            <X size={22} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.countRow}>
          <Users size={16} color={colors.text.secondary} />
          <Text style={styles.countText}>
            {members.length} member{members.length === 1 ? "" : "s"}
          </Text>
          {managing ? (
            <ActivityIndicator size="small" color={colors.primary.default} />
          ) : null}
        </View>

        {removeError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{removeError}</Text>
          </View>
        ) : null}

        {canManage && onAddMembers ? (
          <TouchableOpacity
            style={styles.addRow}
            onPress={onAddMembers}
            disabled={managing}
            activeOpacity={0.85}
          >
            <View style={styles.addIconWrap}>
              <Plus size={18} color={colors.primary.default} />
            </View>
            <Text style={styles.addText}>Add clients</Text>
          </TouchableOpacity>
        ) : null}

        <FlatList
          data={members}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <View
                style={[
                  styles.avatar,
                  item.kind === "agent"
                    ? styles.avatarAgent
                    : styles.avatarClient,
                ]}
              >
                {item.kind === "agent" ? (
                  <User size={18} color={colors.text.inverse} />
                ) : (
                  <Text style={styles.avatarText}>
                    {conversationInitials(item.name)}
                  </Text>
                )}
              </View>
              <View style={styles.memberBody}>
                <Text style={styles.memberName}>
                  {item.name}
                  {item.isSelf ? " (You)" : ""}
                </Text>
                <Text style={styles.memberRole}>
                  {item.kind === "agent" ? "Agent" : "Client"}
                </Text>
              </View>
              {canRemoveMember(item) ? (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => setPendingRemove(item)}
                  disabled={managing}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.name}`}
                >
                  <MinusCircle size={22} color={colors.error.default} />
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        />

        {pendingRemove ? (
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>Remove member?</Text>
              <Text style={styles.confirmMessage}>
                Remove {pendingRemove.name} from this group? They will no
                longer see messages here.
              </Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setPendingRemove(null)}
                  disabled={managing}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.removeConfirmButton,
                    managing && styles.buttonDisabled,
                  ]}
                  onPress={handleConfirmRemove}
                  disabled={managing}
                >
                  {managing ? (
                    <ActivityIndicator
                      color={colors.text.inverse}
                      size="small"
                    />
                  ) : (
                    <Text style={styles.removeConfirmButtonText}>Remove</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </BottomSheetOverlay>
  );
}

const styles = StyleSheet.create({
  container: {
    height: SHEET_HEIGHT,
    backgroundColor: colors.background.screen,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  headerBody: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  title: {
    fontSize: fontSize["2xl"],
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  closeButton: {
    padding: 4,
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  countText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    fontWeight: fontWeight.medium,
  },
  errorBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.error.light,
    borderBottomWidth: 1,
    borderBottomColor: colors.error.default,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error.default,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  addIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.primary.default,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  addText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semiBold,
    color: colors.primary.default,
  },
  listContent: {
    paddingBottom: 24,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarAgent: {
    backgroundColor: colors.purple.default,
  },
  avatarClient: {
    backgroundColor: colors.primary.default,
  },
  avatarText: {
    color: colors.text.inverse,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
  },
  memberBody: {
    flex: 1,
    minWidth: 0,
  },
  memberName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semiBold,
    color: colors.text.primary,
  },
  memberRole: {
    marginTop: 2,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  removeButton: {
    padding: 8,
    zIndex: 2,
  },
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay.dark,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  confirmCard: {
    backgroundColor: colors.background.surface,
    borderRadius: border.radius.card,
    padding: 20,
  },
  confirmTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: border.radius.pill,
    backgroundColor: colors.background.subtle,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semiBold,
    color: colors.text.primary,
  },
  removeConfirmButton: {
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: border.radius.pill,
    backgroundColor: colors.error.default,
  },
  removeConfirmButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semiBold,
    color: colors.text.inverse,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});








// import { useEffect, useState } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   Modal,
//   TouchableOpacity,
//   FlatList,
//   ActivityIndicator,
//   Dimensions,
// } from "react-native";
// import { MinusCircle, Plus, User, Users, X } from "lucide-react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { colors, border, fontSize, fontWeight } from "@/theme";
// import { conversationInitials } from "../../../lib/chat/display";
// import type { GroupMemberDisplay } from "../../../lib/chat/participants";
// const { height: SCREEN_H } = Dimensions.get("window");
// // Base height is 80% of the screen, plus an extra 300px of room.
// // Clamped so the sheet can never exceed the available screen height.
// const SHEET_HEIGHT = Math.min(SCREEN_H * 0.8);

// interface GroupMembersSheetProps {
//   visible: boolean;
//   groupTitle: string;
//   members: GroupMemberDisplay[];
//   canManage?: boolean;
//   managing?: boolean;
//   removeError?: string | null;
//   onClose: () => void;
//   onAddMembers?: () => void;
//   onRemoveMember?: (member: GroupMemberDisplay) => void;
// }

// export function GroupMembersSheet({
//   visible,
//   groupTitle,
//   members,
//   canManage = false,
//   managing = false,
//   removeError = null,
//   onClose,
//   onAddMembers,
//   onRemoveMember,
//   avoidFooterHeight = 0,
// }: Readonly<GroupMembersSheetProps> & { avoidFooterHeight?: number }) {
//   const insets = useSafeAreaInsets();
//   const [pendingRemove, setPendingRemove] = useState<GroupMemberDisplay | null>(
//     null,
//   );

//   useEffect(() => {
//     if (!visible) {
//       setPendingRemove(null);
//     }
//   }, [visible]);

//   useEffect(() => {
//     if (!pendingRemove) return;
//     const stillPresent = members.some(
//       (member) =>
//         member.kind === pendingRemove.kind && member.id === pendingRemove.id,
//     );
//     if (!stillPresent) {
//       setPendingRemove(null);
//     }
//   }, [members, pendingRemove]);

//   const canRemoveMember = (member: GroupMemberDisplay) =>
//     canManage && !member.isSelf && onRemoveMember != null;

//   const handleConfirmRemove = () => {
//     if (!pendingRemove || !onRemoveMember || managing) return;
//     const member = pendingRemove;
//     setPendingRemove(null);
//     onRemoveMember(member);
//   };

//   return (
//     <Modal
//       visible={visible}
//       animationType="slide"
//       transparent
//       statusBarTranslucent
//       presentationStyle="overFullScreen"
//       onRequestClose={onClose}
//     >
//       <View style={styles.backdrop}>
//         <View style={styles.backdropOverlay} />
//         <View
//           style={[
//             styles.container,
//             {
//               marginBottom: avoidFooterHeight,
//               paddingBottom: Math.max(insets.bottom, 16),
//             },
//           ]}
//         >
//           <View style={styles.header}>
//             <View style={styles.headerBody}>
//               <Text style={styles.title}>Group members</Text>
//               <Text style={styles.subtitle} numberOfLines={1}>
//                 {groupTitle}
//               </Text>
//             </View>
//             <TouchableOpacity
//               onPress={onClose}
//               style={styles.closeButton}
//               hitSlop={8}
//             >
//               <X size={22} color={colors.text.secondary} />
//             </TouchableOpacity>
//           </View>

//           <View style={styles.countRow}>
//             <Users size={16} color={colors.text.secondary} />
//             <Text style={styles.countText}>
//               {members.length} member{members.length === 1 ? "" : "s"}
//             </Text>
//             {managing ? (
//               <ActivityIndicator size="small" color={colors.primary.default} />
//             ) : null}
//           </View>

//           {removeError ? (
//             <View style={styles.errorBanner}>
//               <Text style={styles.errorText}>{removeError}</Text>
//             </View>
//           ) : null}

//           {canManage && onAddMembers ? (
//             <TouchableOpacity
//               style={styles.addRow}
//               onPress={onAddMembers}
//               disabled={managing}
//               activeOpacity={0.85}
//             >
//               <View style={styles.addIconWrap}>
//                 <Plus size={18} color={colors.primary.default} />
//               </View>
//               <Text style={styles.addText}>Add clients</Text>
//             </TouchableOpacity>
//           ) : null}

//           <FlatList
//             data={members}
//             keyExtractor={(item) => item.key}
//             contentContainerStyle={styles.listContent}
//             keyboardShouldPersistTaps="handled"
//             renderItem={({ item }) => (
//               <View style={styles.memberRow}>
//                 <View
//                   style={[
//                     styles.avatar,
//                     item.kind === "agent"
//                       ? styles.avatarAgent
//                       : styles.avatarClient,
//                   ]}
//                 >
//                   {item.kind === "agent" ? (
//                     <User size={18} color={colors.text.inverse} />
//                   ) : (
//                     <Text style={styles.avatarText}>
//                       {conversationInitials(item.name)}
//                     </Text>
//                   )}
//                 </View>
//                 <View style={styles.memberBody}>
//                   <Text style={styles.memberName}>
//                     {item.name}
//                     {item.isSelf ? " (You)" : ""}
//                   </Text>
//                   <Text style={styles.memberRole}>
//                     {item.kind === "agent" ? "Agent" : "Client"}
//                   </Text>
//                 </View>
//                 {canRemoveMember(item) ? (
//                   <TouchableOpacity
//                     style={styles.removeButton}
//                     onPress={() => setPendingRemove(item)}
//                     disabled={managing}
//                     hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
//                     accessibilityRole="button"
//                     accessibilityLabel={`Remove ${item.name}`}
//                   >
//                     <MinusCircle size={22} color={colors.error.default} />
//                   </TouchableOpacity>
//                 ) : null}
//               </View>
//             )}
//           />

//           {pendingRemove ? (
//             <View style={styles.confirmOverlay}>
//               <View style={styles.confirmCard}>
//                 <Text style={styles.confirmTitle}>Remove member?</Text>
//                 <Text style={styles.confirmMessage}>
//                   Remove {pendingRemove.name} from this group? They will no
//                   longer see messages here.
//                 </Text>
//                 <View style={styles.confirmActions}>
//                   <TouchableOpacity
//                     style={styles.cancelButton}
//                     onPress={() => setPendingRemove(null)}
//                     disabled={managing}
//                   >
//                     <Text style={styles.cancelButtonText}>Cancel</Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     style={[
//                       styles.removeConfirmButton,
//                       managing && styles.buttonDisabled,
//                     ]}
//                     onPress={handleConfirmRemove}
//                     disabled={managing}
//                   >
//                     {managing ? (
//                       <ActivityIndicator
//                         color={colors.text.inverse}
//                         size="small"
//                       />
//                     ) : (
//                       <Text style={styles.removeConfirmButtonText}>Remove</Text>
//                     )}
//                   </TouchableOpacity>
//                 </View>
//               </View>
//             </View>
//           ) : null}
//         </View>
//       </View>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     height: SHEET_HEIGHT,
//     backgroundColor: colors.background.screen,
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     overflow: "hidden",
//   },
//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     paddingHorizontal: 16,
//     paddingTop: 16,
//     paddingBottom: 12,
//     backgroundColor: colors.background.surface,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border.default,
//   },
//   headerBody: {
//     flex: 1,
//     minWidth: 0,
//     paddingRight: 12,
//   },
//   title: {
//     fontSize: fontSize["2xl"],
//     fontWeight: fontWeight.bold,
//     color: colors.text.primary,
//   },
//   subtitle: {
//     marginTop: 2,
//     fontSize: fontSize.sm,
//     color: colors.text.secondary,
//   },
//   closeButton: {
//     padding: 4,
//   },
//   countRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     backgroundColor: colors.background.surface,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border.light,
//   },
//   countText: {
//     flex: 1,
//     fontSize: fontSize.sm,
//     color: colors.text.secondary,
//     fontWeight: fontWeight.medium,
//   },
//   errorBanner: {
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//     backgroundColor: colors.error.light,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.error.default,
//   },
//   errorText: {
//     fontSize: fontSize.sm,
//     color: colors.error.default,
//   },
//   addRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 16,
//     paddingVertical: 14,
//     backgroundColor: colors.background.surface,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border.light,
//   },
//   addIconWrap: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     borderWidth: 1,
//     borderColor: colors.primary.default,
//     alignItems: "center",
//     justifyContent: "center",
//     marginRight: 12,
//   },
//   addText: {
//     fontSize: fontSize.md,
//     fontWeight: fontWeight.semiBold,
//     color: colors.primary.default,
//   },
//   listContent: {
//     paddingBottom: 24,
//   },
//   memberRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 16,
//     paddingVertical: 14,
//     backgroundColor: colors.background.surface,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border.light,
//   },
//   avatar: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     alignItems: "center",
//     justifyContent: "center",
//     marginRight: 12,
//   },
//   avatarAgent: {
//     backgroundColor: colors.purple.default,
//   },
//   avatarClient: {
//     backgroundColor: colors.primary.default,
//   },
//   avatarText: {
//     color: colors.text.inverse,
//     fontWeight: fontWeight.bold,
//     fontSize: fontSize.sm,
//   },
//   memberBody: {
//     flex: 1,
//     minWidth: 0,
//   },
//   memberName: {
//     fontSize: fontSize.md,
//     fontWeight: fontWeight.semiBold,
//     color: colors.text.primary,
//   },
//   memberRole: {
//     marginTop: 2,
//     fontSize: fontSize.sm,
//     color: colors.text.secondary,
//   },
//   removeButton: {
//     padding: 8,
//     zIndex: 2,
//   },
//   confirmOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: colors.overlay.dark,
//     justifyContent: "center",
//     paddingHorizontal: 24,
//   },
//   confirmCard: {
//     backgroundColor: colors.background.surface,
//     borderRadius: border.radius.card,
//     padding: 20,
//   },
//   confirmTitle: {
//     fontSize: fontSize.xl,
//     fontWeight: fontWeight.bold,
//     color: colors.text.primary,
//     marginBottom: 8,
//   },
//   confirmMessage: {
//     fontSize: fontSize.md,
//     color: colors.text.secondary,
//     lineHeight: 22,
//     marginBottom: 20,
//   },
//   confirmActions: {
//     flexDirection: "row",
//     justifyContent: "flex-end",
//     gap: 12,
//   },
//   cancelButton: {
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     borderRadius: border.radius.pill,
//     backgroundColor: colors.background.subtle,
//   },
//   cancelButtonText: {
//     fontSize: fontSize.md,
//     fontWeight: fontWeight.semiBold,
//     color: colors.text.primary,
//   },
//   removeConfirmButton: {
//     minWidth: 96,
//     alignItems: "center",
//     justifyContent: "center",
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     borderRadius: border.radius.pill,
//     backgroundColor: colors.error.default,
//   },
//   removeConfirmButtonText: {
//     fontSize: fontSize.md,
//     fontWeight: fontWeight.semiBold,
//     color: colors.text.inverse,
//   },
//   buttonDisabled: {
//     opacity: 0.7,
//   },
//   backdropOverlay: {
//     flex: 1,
//     backgroundColor: "rgba(0, 0, 0, 0.35)",
//   },
//   backdrop: {
//     flex: 1,
//     justifyContent: "flex-end",
//   },
// });
