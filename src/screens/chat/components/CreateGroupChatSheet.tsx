// CreateGroupChatSheet.tsx
import { useEffect, useMemo, useState } from 'react';
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
import { BottomSheetOverlay } from '@/components/common/BottomSheetOverlay';
import type { NewChatClientOption } from './NewChatSheet';

const { height: SCREEN_H } = Dimensions.get('window');
// Base height is 75% of the screen, plus an extra 300px of room.
// Clamped so the sheet can never exceed the available screen height.
const SHEET_HEIGHT = Math.min(SCREEN_H * 0.75);

interface CreateGroupChatSheetProps {
  visible: boolean;
  clients: NewChatClientOption[];
  loading?: boolean;
  submitting?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onCreate: (payload: { title: string; memberClientProfileIds: number[] }) => void;
  onClose: () => void;
}

export function CreateGroupChatSheet({
  visible,
  clients,
  loading = false,
  submitting = false,
  search,
  onSearchChange,
  onCreate,
  onClose,
  avoidFooterHeight = 0,
}: Readonly<CreateGroupChatSheetProps> & { avoidFooterHeight?: number }) {
  // Now resolves correctly — BottomSheetOverlay renders in the same window
  // as the rest of the app, so it inherits the edge-to-edge nav bar insets
  // the same way every other screen does. (RN's core Modal opens a
  // separate native Dialog window on Android that doesn't automatically
  // pick up the absolute-positioned nav bar set in App.tsx, which is what
  // caused the bottom overlap before.)
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter((client) => {
      const haystack = `${client.firstName} ${client.lastName} ${client.email}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [clients, search]);

  const canCreate = title.trim().length > 0 && selectedClientIds.length > 0 && !submitting;

  const resetForm = () => {
    setTitle('');
    setSelectedClientIds([]);
  };

  useEffect(() => {
    if (!visible) resetForm();
  }, [visible]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleClient = (clientProfileId: number) => {
    setSelectedClientIds((current) =>
      current.includes(clientProfileId)
        ? current.filter((id) => id !== clientProfileId)
        : [...current, clientProfileId],
    );
  };

  const handleCreate = () => {
    if (!canCreate) return;
    onCreate({
      title: title.trim(),
      memberClientProfileIds: selectedClientIds,
    });
  };

  return (
    <BottomSheetOverlay visible={visible} onClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 + insets.bottom : Math.max(insets.bottom, 20)}
      >
        <View
          style={[
            styles.container,
            { marginBottom: Math.max(avoidFooterHeight + 22, 22), paddingBottom: Math.max(insets.bottom + 22, 22) },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create group with clients</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton} hitSlop={8}>
              <X size={22} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Group name</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="e.g. Smith family updates"
              placeholderTextColor={colors.text.muted}
              value={title}
              onChangeText={setTitle}
              maxLength={255}
            />
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
                const selected = selectedClientIds.includes(clientProfileId);
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
                  No clients found. Select at least one client for the group.
                </Text>
              }
            />
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
              disabled={!canCreate}
              onPress={handleCreate}
            >
              {submitting ? (
                <ActivityIndicator color={colors.text.inverse} />
              ) : (
                <Text style={styles.createButtonText}>
                  Create group ({selectedClientIds.length} client
                  {selectedClientIds.length === 1 ? '' : 's'})
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
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
    color: colors.text.secondary,
  },
  titleInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: border.radius.btn,
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    fontSize: fontSize.md,
    color: colors.text.primary,
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
  list: {
    flex: 1,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  createButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: border.radius.pill,
    backgroundColor: colors.primary.default,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: colors.text.inverse,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semiBold,
  },
});








// import { useEffect, useMemo, useState } from 'react';
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
// } from 'react-native';
// import { Check, Search, X } from 'lucide-react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { colors, border, fontSize, fontWeight } from '@/theme';
// import type { NewChatClientOption } from './NewChatSheet';

// const { height: SCREEN_H } = Dimensions.get('window');
// // Base height is 80% of the screen, plus an extra 300px of room.
// // Clamped so the sheet can never exceed the available screen height.
// const SHEET_HEIGHT = Math.min(SCREEN_H * 0.8);

// interface CreateGroupChatSheetProps {
//   visible: boolean;
//   clients: NewChatClientOption[];
//   loading?: boolean;
//   submitting?: boolean;
//   search: string;
//   onSearchChange: (value: string) => void;
//   onCreate: (payload: { title: string; memberClientProfileIds: number[] }) => void;
//   onClose: () => void;
// }

// export function CreateGroupChatSheet({
//   visible,
//   clients,
//   loading = false,
//   submitting = false,
//   search,
//   onSearchChange,
//   onCreate,
//   onClose,
//   avoidFooterHeight = 0,
// }: Readonly<CreateGroupChatSheetProps> & { avoidFooterHeight?: number }) {
//   const insets = useSafeAreaInsets();
//   const [title, setTitle] = useState('');
//   const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);

//   const filteredClients = useMemo(() => {
//     const query = search.trim().toLowerCase();
//     if (!query) return clients;
//     return clients.filter((client) => {
//       const haystack = `${client.firstName} ${client.lastName} ${client.email}`.toLowerCase();
//       return haystack.includes(query);
//     });
//   }, [clients, search]);

//   const canCreate = title.trim().length > 0 && selectedClientIds.length > 0 && !submitting;

//   const resetForm = () => {
//     setTitle('');
//     setSelectedClientIds([]);
//   };

//   useEffect(() => {
//     if (!visible) resetForm();
//   }, [visible]);

//   const handleClose = () => {
//     resetForm();
//     onClose();
//   };

//   const toggleClient = (clientProfileId: number) => {
//     setSelectedClientIds((current) =>
//       current.includes(clientProfileId)
//         ? current.filter((id) => id !== clientProfileId)
//         : [...current, clientProfileId],
//     );
//   };

//   const handleCreate = () => {
//     if (!canCreate) return;
//     onCreate({
//       title: title.trim(),
//       memberClientProfileIds: selectedClientIds,
//     });
//   };

//   return (
//     <Modal
//       visible={visible}
//       animationType="slide"
//       transparent
//       statusBarTranslucent
//       presentationStyle="overFullScreen"
//       onRequestClose={handleClose}
//     >
//       <KeyboardAvoidingView
//         style={styles.backdrop}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? 90 + insets.bottom : Math.max(insets.bottom, 20)}
//       >
//         <View style={styles.backdropOverlay} />
//         <View style={[styles.container, { marginBottom: avoidFooterHeight, paddingBottom: Math.max(insets.bottom + 16, 16) }]}> 
//         <View style={styles.header}>
//           <Text style={styles.title}>Create group with clients</Text>
//           <TouchableOpacity onPress={handleClose} style={styles.closeButton} hitSlop={8}>
//             <X size={22} color={colors.text.secondary} />
//           </TouchableOpacity>
//         </View>

//         <View style={styles.section}>
//           <Text style={styles.label}>Group name</Text>
//           <TextInput
//             style={styles.titleInput}
//             placeholder="e.g. Smith family updates"
//             placeholderTextColor={colors.text.muted}
//             value={title}
//             onChangeText={setTitle}
//             maxLength={255}
//           />
//         </View>

//         <View style={styles.searchWrap}>
//           <Search size={18} color={colors.text.muted} />
//           <TextInput
//             style={styles.searchInput}
//             placeholder="Search clients..."
//             placeholderTextColor={colors.text.muted}
//             value={search}
//             onChangeText={onSearchChange}
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
//             style={styles.list}
//             contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom + 120, 120), flexGrow: 1 }]}
//             keyboardShouldPersistTaps="handled"
//             renderItem={({ item }) => {
//               const clientProfileId = Number(item.id);
//               const selected = selectedClientIds.includes(clientProfileId);
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
//               <Text style={styles.emptyText}>No clients found. Select at least one client for the group.</Text>
//             }
//           />
//         )}

//         <View style={styles.footer}>
//           <TouchableOpacity
//             style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
//             disabled={!canCreate}
//             onPress={handleCreate}
//           >
//             {submitting ? (
//               <ActivityIndicator color={colors.text.inverse} />
//             ) : (
//               <Text style={styles.createButtonText}>
//                 Create group ({selectedClientIds.length} client
//                 {selectedClientIds.length === 1 ? '' : 's'})
//               </Text>
//             )}
//           </TouchableOpacity>
//         </View>
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
//     overflow: 'hidden',
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
//   section: {
//     paddingHorizontal: 16,
//     paddingTop: 16,
//   },
//   label: {
//     marginBottom: 8,
//     fontSize: fontSize.sm,
//     fontWeight: fontWeight.semiBold,
//     color: colors.text.secondary,
//   },
//   titleInput: {
//     paddingHorizontal: 14,
//     paddingVertical: 12,
//     borderRadius: border.radius.btn,
//     backgroundColor: colors.background.surface,
//     borderWidth: 1,
//     borderColor: colors.border.default,
//     fontSize: fontSize.md,
//     color: colors.text.primary,
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
//   list: {
//     flex: 1,
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
//   createButton: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     minHeight: 48,
//     borderRadius: border.radius.pill,
//     backgroundColor: colors.primary.default,
//   },
//   createButtonDisabled: {
//     opacity: 0.5,
//   },
//   createButtonText: {
//     color: colors.text.inverse,
//     fontSize: fontSize.md,
//     fontWeight: fontWeight.semiBold,
//   },
// });














// import { useEffect, useMemo, useState } from 'react';
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
// } from 'react-native';
// import { Check, Search, X } from 'lucide-react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { colors, border, fontSize, fontWeight } from '@/theme';
// import type { NewChatClientOption } from './NewChatSheet';

// interface CreateGroupChatSheetProps {
//   visible: boolean;
//   clients: NewChatClientOption[];
//   loading?: boolean;
//   submitting?: boolean;
//   search: string;
//   onSearchChange: (value: string) => void;
//   onCreate: (payload: { title: string; memberClientProfileIds: number[] }) => void;
//   onClose: () => void;
// }

// export function CreateGroupChatSheet({
//   visible,
//   clients,
//   loading = false,
//   submitting = false,
//   search,
//   onSearchChange,
//   onCreate,
//   onClose,
//   avoidFooterHeight = 0,
// }: Readonly<CreateGroupChatSheetProps> & { avoidFooterHeight?: number }) {
//   const insets = useSafeAreaInsets();
//   const [title, setTitle] = useState('');
//   const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);

//   const filteredClients = useMemo(() => {
//     const query = search.trim().toLowerCase();
//     if (!query) return clients;
//     return clients.filter((client) => {
//       const haystack = `${client.firstName} ${client.lastName} ${client.email}`.toLowerCase();
//       return haystack.includes(query);
//     });
//   }, [clients, search]);

//   const canCreate = title.trim().length > 0 && selectedClientIds.length > 0 && !submitting;

//   const resetForm = () => {
//     setTitle('');
//     setSelectedClientIds([]);
//   };

//   useEffect(() => {
//     if (!visible) resetForm();
//   }, [visible]);

//   const handleClose = () => {
//     resetForm();
//     onClose();
//   };

//   const toggleClient = (clientProfileId: number) => {
//     setSelectedClientIds((current) =>
//       current.includes(clientProfileId)
//         ? current.filter((id) => id !== clientProfileId)
//         : [...current, clientProfileId],
//     );
//   };

//   const handleCreate = () => {
//     if (!canCreate) return;
//     onCreate({
//       title: title.trim(),
//       memberClientProfileIds: selectedClientIds,
//     });
//   };

//   return (
//     <Modal
//       visible={visible}
//       animationType="slide"
//       transparent
//       statusBarTranslucent
//       presentationStyle="overFullScreen"
//       onRequestClose={handleClose}
//     >
//       <KeyboardAvoidingView
//         style={styles.backdrop}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? 90 + insets.bottom : Math.max(insets.bottom, 20)}
//       >
//         <View style={styles.backdropOverlay} />
//         <View style={[styles.container, { marginBottom: avoidFooterHeight, paddingBottom: Math.max(insets.bottom + 16, 16) }]}> 
//         <View style={styles.header}>
//           <Text style={styles.title}>Create group with clients</Text>
//           <TouchableOpacity onPress={handleClose} style={styles.closeButton} hitSlop={8}>
//             <X size={22} color={colors.text.secondary} />
//           </TouchableOpacity>
//         </View>

//         <View style={styles.section}>
//           <Text style={styles.label}>Group name</Text>
//           <TextInput
//             style={styles.titleInput}
//             placeholder="e.g. Smith family updates"
//             placeholderTextColor={colors.text.muted}
//             value={title}
//             onChangeText={setTitle}
//             maxLength={255}
//           />
//         </View>

//         <View style={styles.searchWrap}>
//           <Search size={18} color={colors.text.muted} />
//           <TextInput
//             style={styles.searchInput}
//             placeholder="Search clients..."
//             placeholderTextColor={colors.text.muted}
//             value={search}
//             onChangeText={onSearchChange}
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
//             style={styles.list}
//             contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom + 120, 120), flexGrow: 1 }]}
//             keyboardShouldPersistTaps="handled"
//             renderItem={({ item }) => {
//               const clientProfileId = Number(item.id);
//               const selected = selectedClientIds.includes(clientProfileId);
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
//               <Text style={styles.emptyText}>No clients found. Select at least one client for the group.</Text>
//             }
//           />
//         )}

//         <View style={styles.footer}>
//           <TouchableOpacity
//             style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
//             disabled={!canCreate}
//             onPress={handleCreate}
//           >
//             {submitting ? (
//               <ActivityIndicator color={colors.text.inverse} />
//             ) : (
//               <Text style={styles.createButtonText}>
//                 Create group ({selectedClientIds.length} client
//                 {selectedClientIds.length === 1 ? '' : 's'})
//               </Text>
//             )}
//           </TouchableOpacity>
//         </View>
//         </View>
//       </KeyboardAvoidingView>
//     </Modal>
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
//   section: {
//     paddingHorizontal: 16,
//     paddingTop: 16,
//   },
//   label: {
//     marginBottom: 8,
//     fontSize: fontSize.sm,
//     fontWeight: fontWeight.semiBold,
//     color: colors.text.secondary,
//   },
//   titleInput: {
//     paddingHorizontal: 14,
//     paddingVertical: 12,
//     borderRadius: border.radius.btn,
//     backgroundColor: colors.background.surface,
//     borderWidth: 1,
//     borderColor: colors.border.default,
//     fontSize: fontSize.md,
//     color: colors.text.primary,
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
//   list: {
//     flex: 1,
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
//   createButton: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     minHeight: 48,
//     borderRadius: border.radius.pill,
//     backgroundColor: colors.primary.default,
//   },
//   createButtonDisabled: {
//     opacity: 0.5,
//   },
//   createButtonText: {
//     color: colors.text.inverse,
//     fontSize: fontSize.md,
//     fontWeight: fontWeight.semiBold,
//   },
// });
