import { useMemo, useState } from 'react';
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
} from 'react-native';
import { Check, Search, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, border, fontSize, fontWeight } from '@/theme';
import type { NewChatClientOption } from './NewChatSheet';
import { BottomSheetOverlay } from '@/components/common/BottomSheetOverlay';

const { height: SCREEN_H } = Dimensions.get('window');
// Base height is 80% of the screen, plus an extra 300px of room.
// Clamped so the sheet can never exceed the available screen height.
const SHEET_HEIGHT = Math.min(SCREEN_H * 0.8);

interface AddGroupMemberSheetProps {
  visible: boolean;
  clients: NewChatClientOption[];
  existingClientIds: number[];
  loading?: boolean;
  submitting?: boolean;
  onAdd: (clientProfileIds: number[]) => void;
  onClose: () => void;
}

export function AddGroupMemberSheet({
  visible,
  clients,
  existingClientIds,
  loading = false,
  submitting = false,
  onAdd,
  onClose,
  avoidFooterHeight = 0,
}: Readonly<AddGroupMemberSheetProps> & { avoidFooterHeight?: number }) {
  // Renders via BottomSheetOverlay instead of RN's core Modal so it stays
  // in the same window as the rest of the app. Modal opens a separate
  // native Dialog window on Android that doesn't inherit the
  // absolute-positioned edge-to-edge nav bar set in App.tsx, which is what
  // caused the bottom row (footer button) to sit under the system nav bar
  // on some devices.
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const availableClients = useMemo(
    () => clients.filter((client) => !existingClientIds.includes(Number(client.id))),
    [clients, existingClientIds],
  );

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return availableClients;
    return availableClients.filter((client) => {
      const haystack = `${client.firstName} ${client.lastName} ${client.email}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [availableClients, search]);

  const canAdd = selectedIds.length > 0 && !submitting;

  const resetForm = () => {
    setSearch('');
    setSelectedIds([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleClient = (clientProfileId: number) => {
    setSelectedIds((current) =>
      current.includes(clientProfileId)
        ? current.filter((id) => id !== clientProfileId)
        : [...current, clientProfileId],
    );
  };

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd(selectedIds);
  };

  return (
    <BottomSheetOverlay visible={visible} onClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 + insets.bottom : Math.max(insets.bottom + 28, 28)}
      >
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
            <Text style={styles.title}>Add clients</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton} hitSlop={8}>
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
              onChangeText={setSearch}
            />
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary.default} />
            </View>
          ) : (
            <FlatList
              data={filteredClients}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: Math.max(insets.bottom + 120, 120), flexGrow: 1 },
              ]}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const clientProfileId = Number(item.id);
                const selected = selectedIds.includes(clientProfileId);
                return (
                  <TouchableOpacity
                    style={styles.clientRow}
                    disabled={submitting}
                    onPress={() => toggleClient(clientProfileId)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(item.firstName?.[0] ?? '').toUpperCase()}
                        {(item.lastName?.[0] ?? '').toUpperCase()}
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
                    <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                      {selected ? <Check size={16} color={colors.text.inverse} /> : null}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {availableClients.length === 0
                    ? 'All of your clients are already in this group.'
                    : 'No clients match your search.'}
                </Text>
              }
            />
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
              disabled={!canAdd}
              onPress={handleAdd}
            >
              {submitting ? (
                <ActivityIndicator color={colors.text.inverse} />
              ) : (
                <Text style={styles.addButtonText}>
                  Add {selectedIds.length > 0 ? selectedIds.length : ''} client
                  {selectedIds.length === 1 ? '' : 's'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
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
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 120,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary.default,
    borderColor: colors.primary.default,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text.muted,
    paddingVertical: 32,
    paddingHorizontal: 24,
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: colors.background.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: border.radius.pill,
    backgroundColor: colors.primary.default,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: colors.text.inverse,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semiBold,
  },
});







// import { useMemo, useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Modal,
//   TouchableOpacity,
//   TextInput,
//   FlatList,
//   ActivityIndicator,
// } from 'react-native';
// import { Check, Search, X } from 'lucide-react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { colors, border, fontSize, fontWeight } from '@/theme';
// import type { NewChatClientOption } from './NewChatSheet';
// import { BottomSheetOverlay } from '@/components/common/BottomSheetOverlay';

// interface AddGroupMemberSheetProps {
//   visible: boolean;
//   clients: NewChatClientOption[];
//   existingClientIds: number[];
//   loading?: boolean;
//   submitting?: boolean;
//   onAdd: (clientProfileIds: number[]) => void;
//   onClose: () => void;
// }

// export function AddGroupMemberSheet({
//   visible,
//   clients,
//   existingClientIds,
//   loading = false,
//   submitting = false,
//   onAdd,
//   onClose,
//   avoidFooterHeight = 0,
// }: Readonly<AddGroupMemberSheetProps> & { avoidFooterHeight?: number }) {
//   const insets = useSafeAreaInsets();
//   const [search, setSearch] = useState('');
//   const [selectedIds, setSelectedIds] = useState<number[]>([]);

//   const availableClients = useMemo(
//     () => clients.filter((client) => !existingClientIds.includes(Number(client.id))),
//     [clients, existingClientIds],
//   );

//   const filteredClients = useMemo(() => {
//     const query = search.trim().toLowerCase();
//     if (!query) return availableClients;
//     return availableClients.filter((client) => {
//       const haystack = `${client.firstName} ${client.lastName} ${client.email}`.toLowerCase();
//       return haystack.includes(query);
//     });
//   }, [availableClients, search]);

//   const canAdd = selectedIds.length > 0 && !submitting;

//   const resetForm = () => {
//     setSearch('');
//     setSelectedIds([]);
//   };

//   const handleClose = () => {
//     resetForm();
//     onClose();
//   };

//   const toggleClient = (clientProfileId: number) => {
//     setSelectedIds((current) =>
//       current.includes(clientProfileId)
//         ? current.filter((id) => id !== clientProfileId)
//         : [...current, clientProfileId],
//     );
//   };

//   const handleAdd = () => {
//     if (!canAdd) return;
//     onAdd(selectedIds);
//   };

//   return (
//     <BottomSheetOverlay visible={visible} onClose={handleClose}>
//       <Modal
//         visible={visible}
//         animationType="slide"
//         transparent
//         statusBarTranslucent
//       presentationStyle="overFullScreen"
//       onRequestClose={handleClose}
//     >
//       <View style={styles.backdrop}>
//         <View style={styles.backdropOverlay} />
//         <View style={[styles.container, { marginBottom: Math.max(avoidFooterHeight + 22, 22), paddingBottom: Math.max(insets.bottom, 16) }]}>
//         <View style={styles.header}>
//           <Text style={styles.title}>Add clients</Text>
//           <TouchableOpacity onPress={handleClose} style={styles.closeButton} hitSlop={8}>
//             <X size={22} color={colors.text.secondary} />
//           </TouchableOpacity>
//         </View>

//         <View style={styles.searchWrap}>
//           <Search size={18} color={colors.text.muted} />
//           <TextInput
//             style={styles.searchInput}
//             placeholder="Search clients..."
//             placeholderTextColor={colors.text.muted}
//             value={search}
//             onChangeText={setSearch}
//           />
//         </View>

//         {loading ? (
//           <View style={styles.loadingBox}>
//             <ActivityIndicator size="large" color={colors.primary.default} />
//           </View>
//         ) : (
//           <FlatList
//             data={filteredClients}
//             keyExtractor={(item) => item.id}
//             contentContainerStyle={styles.listContent}
//             keyboardShouldPersistTaps="handled"
//             renderItem={({ item }) => {
//               const clientProfileId = Number(item.id);
//               const selected = selectedIds.includes(clientProfileId);
//               return (
//                 <TouchableOpacity
//                   style={styles.clientRow}
//                   disabled={submitting}
//                   onPress={() => toggleClient(clientProfileId)}
//                   activeOpacity={0.85}
//                 >
//                   <View style={styles.avatar}>
//                     <Text style={styles.avatarText}>
//                       {(item.firstName?.[0] ?? '').toUpperCase()}
//                       {(item.lastName?.[0] ?? '').toUpperCase()}
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
//                   <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
//                     {selected ? <Check size={16} color={colors.text.inverse} /> : null}
//                   </View>
//                 </TouchableOpacity>
//               );
//             }}
//             ListEmptyComponent={
//               <Text style={styles.emptyText}>
//                 {availableClients.length === 0
//                   ? 'All of your clients are already in this group.'
//                   : 'No clients match your search.'}
//               </Text>
//             }
//           />
//         )}

//         <View style={styles.footer}>
//           <TouchableOpacity
//             style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
//             disabled={!canAdd}
//             onPress={handleAdd}
//           >
//             {submitting ? (
//               <ActivityIndicator color={colors.text.inverse} />
//             ) : (
//               <Text style={styles.addButtonText}>
//                 Add {selectedIds.length > 0 ? selectedIds.length : ''} client
//                 {selectedIds.length === 1 ? '' : 's'}
//               </Text>
//             )}
//           </TouchableOpacity>
//         </View>
//         </View>
//       </View>
//     </Modal>
//     </BottomSheetOverlay>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: colors.background.screen,
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     paddingTop: 16,
//     paddingBottom: 12,
//     backgroundColor: colors.background.surface,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border.default,
//   },
//   title: {
//     fontSize: fontSize['2xl'],
//     fontWeight: fontWeight.bold,
//     color: colors.text.primary,
//   },
//   closeButton: {
//     padding: 4,
//   },
//   searchWrap: {
//     flexDirection: 'row',
//     alignItems: 'center',
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
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   listContent: {
//     paddingBottom: 120,
//   },
//   backdropOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.35)',
//   },
//   backdrop: {
//     flex: 1,
//     justifyContent: 'flex-end',
//     backgroundColor: 'transparent',
//   },
//   clientRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
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
//     alignItems: 'center',
//     justifyContent: 'center',
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
//   checkbox: {
//     width: 24,
//     height: 24,
//     borderRadius: border.radius.sm,
//     borderWidth: 2,
//     borderColor: colors.border.default,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   checkboxSelected: {
//     backgroundColor: colors.primary.default,
//     borderColor: colors.primary.default,
//   },
//   emptyText: {
//     textAlign: 'center',
//     color: colors.text.muted,
//     paddingVertical: 32,
//     paddingHorizontal: 24,
//     lineHeight: 22,
//   },
//   footer: {
//     position: 'absolute',
//     left: 0,
//     right: 0,
//     bottom: 0,
//     padding: 16,
//     backgroundColor: colors.background.surface,
//     borderTopWidth: 1,
//     borderTopColor: colors.border.default,
//   },
//   addButton: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     minHeight: 48,
//     borderRadius: border.radius.pill,
//     backgroundColor: colors.primary.default,
//   },
//   addButtonDisabled: {
//     opacity: 0.5,
//   },
//   addButtonText: {
//     color: colors.text.inverse,
//     fontSize: fontSize.md,
//     fontWeight: fontWeight.semiBold,
//   },
// });
