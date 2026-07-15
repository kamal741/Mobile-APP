// NewChatChooserSheet.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageSquare, Users, X } from 'lucide-react-native';
import { colors, border, fontSize, fontWeight } from '@/theme';
import { BottomSheetOverlay } from '@/components/common/BottomSheetOverlay';

interface NewChatChooserSheetProps {
  visible: boolean;
  onClose: () => void;
  onChooseDirect: () => void;
  onChooseGroup: () => void;
}

export function NewChatChooserSheet({
  visible,
  onClose,
  onChooseDirect,
  onChooseGroup,
  avoidFooterHeight = 0,
}: Readonly<NewChatChooserSheetProps & { avoidFooterHeight?: number }>) {
  // Works correctly now — this overlay renders in the same window as the
  // rest of the screen, unlike the old Modal-based dialog window.
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 16);

  return (
    <BottomSheetOverlay visible={visible} onClose={onClose}>
      <View
        style={[
          styles.sheet,
          {
            marginBottom: avoidFooterHeight,
            paddingBottom: bottomPadding,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>New conversation</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={8}>
            <X size={22} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.option} onPress={onChooseDirect} activeOpacity={0.85}>
          <View style={[styles.iconWrap, styles.iconDirect]}>
            <MessageSquare size={22} color={colors.text.inverse} />
          </View>
          <View style={styles.optionBody}>
            <Text style={styles.optionTitle}>Message a client</Text>
            <Text style={styles.optionSubtitle}>Start a 1:1 conversation</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.option} onPress={onChooseGroup} activeOpacity={0.85}>
          <View style={[styles.iconWrap, styles.iconGroup]}>
            <Users size={22} color={colors.text.inverse} />
          </View>
          <View style={styles.optionBody}>
            <Text style={styles.optionTitle}>Create client group</Text>
            <Text style={styles.optionSubtitle}>Chat with multiple clients in one thread</Text>
          </View>
        </TouchableOpacity>
      </View>
    </BottomSheetOverlay>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.background.screen,
    borderTopLeftRadius: border.radius.modal,
    borderTopRightRadius: border.radius.modal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
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
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconDirect: {
    backgroundColor: colors.primary.default,
  },
  iconGroup: {
    backgroundColor: colors.purple.default,
  },
  optionBody: {
    flex: 1,
  },
  optionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semiBold,
    color: colors.text.primary,
  },
  optionSubtitle: {
    marginTop: 2,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
});







// import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { MessageSquare, Users, X } from 'lucide-react-native';
// import { colors, border, fontSize, fontWeight } from '@/theme';

// interface NewChatChooserSheetProps {
//   visible: boolean;
//   onClose: () => void;
//   onChooseDirect: () => void;
//   onChooseGroup: () => void;
// }

// export function NewChatChooserSheet({
//   visible,
//   onClose,
//   onChooseDirect,
//   onChooseGroup,
//   avoidFooterHeight = 0,
// }: Readonly<NewChatChooserSheetProps & { avoidFooterHeight?: number }>) {
//   const insets = useSafeAreaInsets();

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
//         <View style={[styles.sheet, { marginBottom: avoidFooterHeight, paddingBottom: Math.max(insets.bottom, 16) }]}> 
//           <View style={styles.header}>
//             <Text style={styles.title}>New conversation</Text>
//             <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={8}>
//               <X size={22} color={colors.text.secondary} />
//             </TouchableOpacity>
//           </View>

//           <TouchableOpacity style={styles.option} onPress={onChooseDirect} activeOpacity={0.85}>
//             <View style={[styles.iconWrap, styles.iconDirect]}>
//               <MessageSquare size={22} color={colors.text.inverse} />
//             </View>
//             <View style={styles.optionBody}>
//               <Text style={styles.optionTitle}>Message a client</Text>
//               <Text style={styles.optionSubtitle}>Start a 1:1 conversation</Text>
//             </View>
//           </TouchableOpacity>

//           <TouchableOpacity style={styles.option} onPress={onChooseGroup} activeOpacity={0.85}>
//             <View style={[styles.iconWrap, styles.iconGroup]}>
//               <Users size={22} color={colors.text.inverse} />
//             </View>
//             <View style={styles.optionBody}>
//               <Text style={styles.optionTitle}>Create client group</Text>
//               <Text style={styles.optionSubtitle}>Chat with multiple clients in one thread</Text>
//             </View>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   backdrop: {
//     flex: 1,
//     justifyContent: 'flex-end',
//     backgroundColor: 'transparent',
//   },
//   sheet: {
//     backgroundColor: colors.background.screen,
//     borderTopLeftRadius: border.radius.modal,
//     borderTopRightRadius: border.radius.modal,
//     paddingBottom: 32,
//   },
//   backdropOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.35)',
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     paddingTop: 16,
//     paddingBottom: 12,
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
//   option: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 16,
//     paddingVertical: 16,
//     backgroundColor: colors.background.surface,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border.light,
//   },
//   iconWrap: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginRight: 12,
//   },
//   iconDirect: {
//     backgroundColor: colors.primary.default,
//   },
//   iconGroup: {
//     backgroundColor: colors.purple.default,
//   },
//   optionBody: {
//     flex: 1,
//   },
//   optionTitle: {
//     fontSize: fontSize.md,
//     fontWeight: fontWeight.semiBold,
//     color: colors.text.primary,
//   },
//   optionSubtitle: {
//     marginTop: 2,
//     fontSize: fontSize.sm,
//     color: colors.text.secondary,
//   },
// });
