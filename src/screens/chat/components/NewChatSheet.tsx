import {
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search, X } from "lucide-react-native";
import { colors, border, fontSize, fontWeight } from "@/theme";
import { BottomSheetOverlay } from "@/components/common/BottomSheetOverlay";

const { height: SCREEN_H } = Dimensions.get("window");
// Base height is 80% of the screen, plus an extra 300px of room.
// Clamped so the sheet can never exceed the available screen height.
const SHEET_HEIGHT = SCREEN_H * 0.8;
export interface NewChatClientOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface NewChatSheetProps {
  visible: boolean;
  clients: NewChatClientOption[];
  loading?: boolean;
  submitting?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectClient: (clientProfileId: number) => void;
  onClose: () => void;
}

export function NewChatSheet({
  visible,
  clients,
  loading = false,
  submitting = false,
  search,
  onSearchChange,
  onSelectClient,
  onClose,
  avoidFooterHeight = 0,
}: NewChatSheetProps & { avoidFooterHeight?: number }) {
  // Renders via BottomSheetOverlay instead of RN's core Modal so it stays
  // in the same window as the rest of the app. Modal opens a separate
  // native Dialog window on Android that doesn't inherit the
  // absolute-positioned edge-to-edge nav bar set in App.tsx, which is what
  // caused the bottom row (search bar / list items) to sit under the
  // system nav bar on some devices.
  const insets = useSafeAreaInsets();
  const filtered = clients.filter((client) => {
    const haystack =
      `${client.firstName} ${client.lastName} ${client.email}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  return (
    <BottomSheetOverlay visible={visible} onClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={
          Platform.OS === "ios"
            ? 90 + insets.bottom
            : Math.max(insets.bottom, 20)
        }
      >
        <View
          style={[
            styles.container,
            {
              marginBottom: avoidFooterHeight,
              paddingBottom: Math.max(insets.bottom + 16, 16),
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Start a conversation</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={8}
            >
              <X size={22} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Search size={18} color={colors.text.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search clients..."
              placeholderTextColor={colors.text.muted}
              value={search}
              onChangeText={onSearchChange}
            />
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary.default} />
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={[
                styles.listContent,
                {
                  paddingBottom: Math.max(insets.bottom + 24, 24),
                  flexGrow: 1,
                },
              ]}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.clientRow}
                  disabled={submitting}
                  onPress={() => onSelectClient(Number(item.id))}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(item.firstName?.[0] ?? "").toUpperCase()}
                      {(item.lastName?.[0] ?? "").toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.clientBody}>
                    <Text style={styles.clientName}>
                      {item.firstName} {item.lastName}
                    </Text>
                    <Text style={styles.clientEmail} numberOfLines={1}>
                      {item.email}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No clients found</Text>
              }
            />
          )}
        </View>
      </KeyboardAvoidingView>
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
  title: {
    fontSize: fontSize["2xl"],
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: border.radius.btn,
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text.primary,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  clientRow: {
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
    backgroundColor: colors.primary.default,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: colors.text.inverse,
    fontWeight: fontWeight.bold,
  },
  clientBody: {
    flex: 1,
    minWidth: 0,
  },
  clientName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semiBold,
    color: colors.text.primary,
  },
  clientEmail: {
    marginTop: 2,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  emptyText: {
    textAlign: "center",
    color: colors.text.muted,
    paddingVertical: 32,
  },
});







// import {
//   KeyboardAvoidingView,
//   Platform,
//   View,
//   Text,
//   StyleSheet,
//   Modal,
//   TouchableOpacity,
//   TextInput,
//   FlatList,
//   ActivityIndicator,
//   Dimensions,
// } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { Search, X } from "lucide-react-native";
// import { colors, border, fontSize, fontWeight } from "@/theme";
// const { height: SCREEN_H } = Dimensions.get("window");
// // Base height is 80% of the screen, plus an extra 300px of room.
// // Clamped so the sheet can never exceed the available screen height.
// const SHEET_HEIGHT = SCREEN_H * 0.8;
// export interface NewChatClientOption {
//   id: string;
//   firstName: string;
//   lastName: string;
//   email: string;
// }

// interface NewChatSheetProps {
//   visible: boolean;
//   clients: NewChatClientOption[];
//   loading?: boolean;
//   submitting?: boolean;
//   search: string;
//   onSearchChange: (value: string) => void;
//   onSelectClient: (clientProfileId: number) => void;
//   onClose: () => void;
// }

// export function NewChatSheet({
//   visible,
//   clients,
//   loading = false,
//   submitting = false,
//   search,
//   onSearchChange,
//   onSelectClient,
//   onClose,
//   avoidFooterHeight = 0,
// }: NewChatSheetProps & { avoidFooterHeight?: number }) {
//   const insets = useSafeAreaInsets();
//   const filtered = clients.filter((client) => {
//     const haystack =
//       `${client.firstName} ${client.lastName} ${client.email}`.toLowerCase();
//     return haystack.includes(search.trim().toLowerCase());
//   });

//   return (
    
//     <Modal
//       visible={visible}
//       animationType="slide"
//       transparent
//       statusBarTranslucent
//       presentationStyle="overFullScreen"
//       onRequestClose={onClose}
//     >
//       <KeyboardAvoidingView
//         style={styles.backdrop}
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//         keyboardVerticalOffset={
//           Platform.OS === "ios"
//             ? 90 + insets.bottom
//             : Math.max(insets.bottom, 20)
//         }
//       >
//         <View style={styles.backdropOverlay} />
//         <View
//           style={[
//             styles.container,
//             {
//               marginBottom: avoidFooterHeight,
//               paddingBottom: Math.max(insets.bottom + 16, 16),
//             },
//           ]}
//         >
//           <View style={styles.header}>
//             <Text style={styles.title}>Start a conversation</Text>
//             <TouchableOpacity
//               onPress={onClose}
//               style={styles.closeButton}
//               hitSlop={8}
//             >
//               <X size={22} color={colors.text.secondary} />
//             </TouchableOpacity>
//           </View>

//           <View style={styles.searchWrap}>
//             <Search size={18} color={colors.text.muted} />
//             <TextInput
//               style={styles.searchInput}
//               placeholder="Search clients..."
//               placeholderTextColor={colors.text.muted}
//               value={search}
//               onChangeText={onSearchChange}
//             />
//           </View>

//           {loading ? (
//             <View style={styles.loadingBox}>
//               <ActivityIndicator size="large" color={colors.primary.default} />
//             </View>
//           ) : (
//             <FlatList
//               data={filtered}
//               keyExtractor={(item) => item.id}
//               style={styles.list}
//               contentContainerStyle={[
//                 styles.listContent,
//                 {
//                   paddingBottom: Math.max(insets.bottom + 24, 24),
//                   flexGrow: 1,
//                 },
//               ]}
//               keyboardShouldPersistTaps="handled"
//               renderItem={({ item }) => (
//                 <TouchableOpacity
//                   style={styles.clientRow}
//                   disabled={submitting}
//                   onPress={() => onSelectClient(Number(item.id))}
//                 >
//                   <View style={styles.avatar}>
//                     <Text style={styles.avatarText}>
//                       {(item.firstName?.[0] ?? "").toUpperCase()}
//                       {(item.lastName?.[0] ?? "").toUpperCase()}
//                     </Text>
//                   </View>
//                   <View style={styles.clientBody}>
//                     <Text style={styles.clientName}>
//                       {item.firstName} {item.lastName}
//                     </Text>
//                     <Text style={styles.clientEmail} numberOfLines={1}>
//                       {item.email}
//                     </Text>
//                   </View>
//                 </TouchableOpacity>
//               )}
//               ListEmptyComponent={
//                 <Text style={styles.emptyText}>No clients found</Text>
//               }
//             />
//           )}
//         </View>
//       </KeyboardAvoidingView>
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
//   title: {
//     fontSize: fontSize["2xl"],
//     fontWeight: fontWeight.bold,
//     color: colors.text.primary,
//   },
//   closeButton: {
//     padding: 4,
//   },
//   searchWrap: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 10,
//     margin: 16,
//     paddingHorizontal: 14,
//     paddingVertical: 12,
//     borderRadius: border.radius.btn,
//     backgroundColor: colors.background.surface,
//     borderWidth: 1,
//     borderColor: colors.border.default,
//   },
//   searchInput: {
//     flex: 1,
//     fontSize: fontSize.md,
//     color: colors.text.primary,
//   },
//   loadingBox: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   list: {
//     flex: 1,
//   },
//   listContent: {
//     paddingBottom: 24,
//   },
//   backdropOverlay: {
//     flex: 1,
//     backgroundColor: "rgba(0, 0, 0, 0.35)",
//   },
//   backdrop: {
//     flex: 1,
//     justifyContent: "flex-end",
//     backgroundColor: "transparent",
//   },
//   clientRow: {
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
//     backgroundColor: colors.primary.default,
//     alignItems: "center",
//     justifyContent: "center",
//     marginRight: 12,
//   },
//   avatarText: {
//     color: colors.text.inverse,
//     fontWeight: fontWeight.bold,
//   },
//   clientBody: {
//     flex: 1,
//     minWidth: 0,
//   },
//   clientName: {
//     fontSize: fontSize.md,
//     fontWeight: fontWeight.semiBold,
//     color: colors.text.primary,
//   },
//   clientEmail: {
//     marginTop: 2,
//     fontSize: fontSize.sm,
//     color: colors.text.secondary,
//   },
//   emptyText: {
//     textAlign: "center",
//     color: colors.text.muted,
//     paddingVertical: 32,
//   },
// });
