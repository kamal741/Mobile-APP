import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors } from '../../theme';
import ClientNotes, { ClientNotesData } from '../common/ClientNotes'

interface ClientNotesModalProps {
  visible: boolean;
  clientName: string;
  notes: ClientNotesData | string | null | undefined;
  title?: string;
  onClose: () => void;
}

const ClientNotesModal: React.FC<ClientNotesModalProps> = ({
  visible,
  clientName,
  notes,
  title = 'CLIENT NOTES',
  onClose,
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    {/* Tapping the overlay (outside the sheet) closes the modal */}
    <TouchableOpacity
      style={styles.overlay}
      activeOpacity={1}
      onPress={onClose}
    >
      {/* Stop press events from bubbling up to the overlay */}
      <TouchableOpacity
        style={styles.sheet}
        activeOpacity={1}
        onPress={() => {}}
      >
        {/* Drag handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>{title}</Text>
            <Text style={styles.clientName}>{clientName}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <ClientNotes notes={notes} />
          <View style={{ height: 8 }} />
        </ScrollView>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

export default ClientNotesModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: '65%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  clientName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F6F6F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});









// import React from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
// } from 'react-native';
// import { colors } from '../../theme';

// interface ClientNotes {
//   intent?: string;
//   version?: number;
//   comments?: string;
//   timeline?: string;
//   priorities?: string[];
// }

// interface ClientNotesModalProps {
//   visible: boolean;
//   clientName: string;
//   notes: ClientNotes | null | undefined;
//   onClose: () => void;
// }

// const ClientNotesModal: React.FC<ClientNotesModalProps> = ({
//   visible,
//   clientName,
//   notes,
//   onClose,
// }) => (
//   <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
//     {/* Tapping the overlay (outside the sheet) closes the modal */}
//     <TouchableOpacity
//       style={styles.overlay}
//       activeOpacity={1}
//       onPress={onClose}
//     >
//       {/* Stop press events from bubbling up to the overlay */}
//       <TouchableOpacity
//         style={styles.sheet}
//         activeOpacity={1}
//         onPress={() => {}}
//       >
//         {/* Drag handle */}
//         <View style={styles.handle} />

//         {/* Header */}
//         <View style={styles.header}>
//           <View>
//             <Text style={styles.headerLabel}>CLIENT NOTES</Text>
//             <Text style={styles.clientName}>{clientName}</Text>
//           </View>
//           <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
//             <Text style={styles.closeBtnText}>✕</Text>
//           </TouchableOpacity>
//         </View>

//         <ScrollView showsVerticalScrollIndicator={false}>
//           {!notes ? (
//             <View style={styles.emptyState}>
//               <Text style={styles.emptyText}>No notes available for this client.</Text>
//             </View>
//           ) : (
//             <>
//               {/* Intent + Timeline row */}
//               <View style={styles.metaRow}>
//                 {notes.intent ? (
//                   <View style={[styles.metaCard, { flex: 1 }]}>
//                     <Text style={styles.metaLabel}>INTENT</Text>
//                     <Text style={styles.metaValue}>
//                       {notes.intent.replace(/_/g, ' ')}
//                     </Text>
//                   </View>
//                 ) : null}
//                 {notes.timeline ? (
//                   <View style={[styles.metaCard, { flex: 1 }]}>
//                     <Text style={styles.metaLabel}>TIMELINE</Text>
//                     <Text style={styles.metaValue}>{notes.timeline.toUpperCase()}</Text>
//                   </View>
//                 ) : null}
//               </View>

//               {/* Priorities */}
//               {notes.priorities && notes.priorities.length > 0 ? (
//                 <View style={styles.section}>
//                   <Text style={styles.sectionLabel}>PRIORITIES</Text>
//                   <View style={styles.pillsRow}>
//                     {notes.priorities.map((p) => (
//                       <View key={p} style={styles.pill}>
//                         <Text style={styles.pillText}>{p}</Text>
//                       </View>
//                     ))}
//                   </View>
//                 </View>
//               ) : null}

//               {/* Comments */}
//               <View style={styles.section}>
//                 <Text style={styles.sectionLabel}>COMMENTS</Text>
//                 <Text style={[styles.metaValue, !notes.comments && styles.emptyComment]}>
//                   {notes.comments || 'No additional comments.'}
//                 </Text>
//               </View>
//             </>
//           )}
//           <View style={{ height: 8 }} />
//         </ScrollView>
//       </TouchableOpacity>
//     </TouchableOpacity>
//   </Modal>
// );

// export default ClientNotesModal;

// const styles = StyleSheet.create({
//   overlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'flex-end',
//   },
//   sheet: {
//     backgroundColor: colors.white,
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     paddingHorizontal: 20,
//     paddingBottom: 36,
//     maxHeight: '65%',
//   },
//   handle: {
//     width: 36,
//     height: 4,
//     borderRadius: 2,
//     backgroundColor: colors.border,
//     alignSelf: 'center',
//     marginTop: 12,
//     marginBottom: 4,
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//     justifyContent: 'space-between',
//     paddingVertical: 16,
//   },
//   headerLabel: {
//     fontSize: 11,
//     fontWeight: '600',
//     color: colors.textMuted,
//     letterSpacing: 0.6,
//     marginBottom: 3,
//   },
//   clientName: {
//     fontSize: 17,
//     fontWeight: '700',
//     color: colors.textPrimary,
//   },
//   closeBtn: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     borderWidth: 1,
//     borderColor: colors.border,
//     backgroundColor: '#F6F6F6',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   closeBtnText: {
//     fontSize: 13,
//     color: colors.textSecondary,
//     fontWeight: '600',
//   },

//   // ── Meta row (Intent + Timeline) ──
//   metaRow: {
//     flexDirection: 'row',
//     gap: 10,
//     marginBottom: 10,
//   },
//   metaCard: {
//     backgroundColor: '#F6F6F6',
//     borderRadius: 10,
//     padding: 12,
//   },
//   metaLabel: {
//     fontSize: 10,
//     fontWeight: '700',
//     color: colors.textMuted,
//     letterSpacing: 0.5,
//     marginBottom: 4,
//   },
//   metaValue: {
//     fontSize: 13,
//     fontWeight: '600',
//     color: colors.textPrimary,
//     textTransform: 'capitalize',
//   },

//   // ── Sections ──
//   section: {
//     backgroundColor: '#F6F6F6',
//     borderRadius: 10,
//     padding: 12,
//     marginBottom: 10,
//   },
//   sectionLabel: {
//     fontSize: 10,
//     fontWeight: '700',
//     color: colors.textMuted,
//     letterSpacing: 0.5,
//     marginBottom: 8,
//   },

//   // ── Priority pills ──
//   pillsRow: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 6,
//   },
//   pill: {
//     backgroundColor: '#EEEDFE',
//     borderRadius: 20,
//     paddingHorizontal: 12,
//     paddingVertical: 5,
//   },
//   pillText: {
//     fontSize: 12,
//     fontWeight: '600',
//     color: '#3C3489',
//     textTransform: 'capitalize',
//   },

//   // ── Empty states ──
//   emptyComment: {
//     color: colors.textMuted,
//     fontStyle: 'italic',
//     fontWeight: '400',
//   },
//   emptyState: {
//     paddingVertical: 32,
//     alignItems: 'center',
//   },
//   emptyText: {
//     fontSize: 14,
//     color: colors.textMuted,
//   },
// });
