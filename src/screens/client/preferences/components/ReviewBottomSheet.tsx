import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useBottomInset } from '@/hooks/useSafeAreaPadding';
import { moveModalStyles as S } from '../styles/moveModalStyles';
import { screenStyles as NavS } from '../styles/screenStyles';
import { Colors } from '../constants/theme';
import { ReviewScreen } from '../Screens/ReviewScreen';
import {
  useUpdateAgentClientPreferences,
  useAgentClientPreferences,
} from '@/lib/agentApi';
import type { UpdatePreferenceItemPayload, PreferenceTier } from '@/lib/agentApi';
import { hasAnswer } from '../utils/preferenceHelpers';
import type { ScreenDef, Answers, RangeVal } from '../types/preferences';

interface Props {
  visible:          boolean;
  screens:          ScreenDef[];
  answers:          Answers;
  onClose:          () => void;
  onSubmit:         () => void;
  /** External saving state — disables Submit for client flow while parent is saving. */
  isSaving?:        boolean;
  /** When 'agent', submits via PUT …/preferences on Submit press. */
  userType?:        'agent' | 'client';
  /** Required when userType is 'agent'. */
  clientProfileId?: string | number;
}

function buildPreferenceItems(
  screens: ScreenDef[],
  answers: Answers,
): UpdatePreferenceItemPayload[] {
  const items: UpdatePreferenceItemPayload[] = [];
  let sortOrder = 0;

  for (const screen of screens) {
    for (const field of screen.fields) {
      const raw = answers[field.key];

      if (field.valueType === 'BUDGET_RANGE') {
        const range = raw as RangeVal | undefined;
        const min = range?.from ? parseFloat(range.from.replace(/[^0-9.]/g, '')) : NaN;
        const max = range?.to ? parseFloat(range.to.replace(/[^0-9.]/g, '')) : NaN;

        items.push({
          key:       'min_budget',
          tier:      screen.key as PreferenceTier,
          value:     Number.isFinite(min) ? { min } : {},
          source:    'user',
          sortOrder: sortOrder++,
        });
        items.push({
          key:       'max_budget',
          tier:      screen.key as PreferenceTier,
          value:     Number.isFinite(max) ? { max } : {},
          source:    'user',
          sortOrder: sortOrder++,
        });
        continue;
      }

      let value: UpdatePreferenceItemPayload['value'];

      if (!hasAnswer(raw)) {
        value = {};
      } else if (Array.isArray(raw)) {
        value = { values: raw as string[] };
      } else if (typeof raw === 'object' && raw !== null && ('min' in raw || 'max' in raw)) {
        value = raw as { min?: number; max?: number };
      } else if (typeof raw === 'number') {
        value = { min: raw };
      } else {
        value = { values: [String(raw)] };
      }

      items.push({
        key:       field.key,
        tier:      screen.key as PreferenceTier,
        value,
        source:    'user',
        sortOrder: sortOrder++,
      });
    }
  }

  return items;
}

export function ReviewBottomSheet({
  visible,
  screens,
  answers,
  onClose,
  onSubmit,
  isSaving: externalIsSaving = false,
  userType,
  clientProfileId,
}: Props) {
  const bottomInset = useBottomInset();
  const isAgentFlow = userType === 'agent' && !!clientProfileId;

  // Fetch the current version for optimistic concurrency — only when agent flow.
  const { data: existingPrefs, isLoading: isLoadingVersion } = useAgentClientPreferences(
    clientProfileId ?? 0,
    { enabled: isAgentFlow },
  );

  const updatePreferences = useUpdateAgentClientPreferences(clientProfileId ?? 0);

  const handleSubmit = () => {
    if (!isAgentFlow) {
      onSubmit();
      return;
    }

    const items   = buildPreferenceItems(screens, answers);
    const version = existingPrefs?.version ?? 0;

    updatePreferences.mutate(
      { replaceAll: true, items },
      { onSuccess: () => onSubmit() },
    );
  };

  // Merged: covers client flow (externalIsSaving) + agent flow (mutation pending)
  const isSaving = externalIsSaving || (isAgentFlow && updatePreferences.isPending);
  const hasError = isAgentFlow && !!updatePreferences.error;
  const isDisabled = isSaving || isLoadingVersion;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={S.modalOverlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Review Your Preferences</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.reviewBody}>
            <ReviewScreen screens={screens} answers={answers} />
          </View>

          {hasError ? (
            <Text style={styles.errorTxt}>Failed to save preferences. Please try again.</Text>
          ) : null}

          <View style={[styles.footer, { paddingBottom: 12 + bottomInset }]}>
            <TouchableOpacity activeOpacity={0.75} onPress={onClose} style={NavS.btnBack}>
              <Text style={NavS.btnBackTxt}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSubmit}
              style={[NavS.btnSubmit, isDisabled && NavS.btnDisabled]}
              disabled={isDisabled}
            >
              {isDisabled ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={NavS.btnSubmitTxt}>Submit  ✓</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    flex: 1,
    marginTop: 48,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderMid,
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  closeBtn: {
    fontSize: 18,
    color: Colors.textSub,
    fontWeight: '600',
  },
  reviewBody: {
    flex: 1,
  },
  errorTxt: {
    color: '#D32F2F',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
});









// import React from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   Modal,
//   SafeAreaView,
//   StyleSheet,
//   ActivityIndicator,
// } from 'react-native';
// import { moveModalStyles as S } from '../styles/moveModalStyles';
// import { screenStyles as NavS } from '../styles/screenStyles';
// import { Colors } from '../constants/theme';
// import { ReviewScreen } from '../Screens/ReviewScreen';
// import {
//   useUpdateAgentClientPreferences,
//   useAgentClientPreferences,
// } from '@/lib/agentApi';
// import type { UpdatePreferenceItemPayload, PreferenceTier } from '@/lib/agentApi';
// import { hasAnswer } from '../utils/preferenceHelpers';
// import type { ScreenDef, Answers } from '../types/preferences';

// interface Props {
//   visible:          boolean;
//   screens:          ScreenDef[];
//   answers:          Answers;
//   onClose:          () => void;
//   onSubmit:         () => void;
//   /** When 'agent', submits via PUT …/preferences on Submit press. */
//   userType?:        'agent' | 'client';
//   /** Required when userType is 'agent'. */
//   clientProfileId?: string | number;
// }

// function buildPreferenceItems(
//   screens: ScreenDef[],
//   answers: Answers,
// ): UpdatePreferenceItemPayload[] {
//   const items: UpdatePreferenceItemPayload[] = [];
//   let sortOrder = 0;

//   for (const screen of screens) {
//     for (const field of screen.fields) {
//       const raw = answers[field.key];
//       if (!hasAnswer(raw)) continue;

//       let value: UpdatePreferenceItemPayload['value'];

//       if (Array.isArray(raw)) {
//         value = { values: raw as string[] };
//       } else if (typeof raw === 'object' && raw !== null && ('min' in raw || 'max' in raw)) {
//         value = raw as { min?: number; max?: number };
//       } else if (typeof raw === 'number') {
//         value = { min: raw };
//       } else {
//         value = { values: [String(raw)] };
//       }

//       items.push({
//         key:       field.key,
//         tier:      'must_have' as PreferenceTier,
//         value,
//         source:    'user',
//         sortOrder: sortOrder++,
//       });
//     }
//   }

//   return items;
// }

// export function ReviewBottomSheet({
//   visible,
//   screens,
//   answers,
//   onClose,
//   onSubmit,
//   userType,
//   clientProfileId,
// }: Props) {
//   const isAgentFlow = userType === 'agent' && !!clientProfileId;

//   // Fetch the current version for optimistic concurrency — only when agent flow.
//   const { data: existingPrefs, isLoading: isLoadingVersion } = useAgentClientPreferences(
//     clientProfileId ?? 0,
//     { enabled: isAgentFlow },
//   );

//   const updatePreferences = useUpdateAgentClientPreferences(clientProfileId ?? 0);

//   const handleSubmit = () => {
//     if (!isAgentFlow) {
//       onSubmit();
//       return;
//     }

//     const items   = buildPreferenceItems(screens, answers);
//     const version = existingPrefs?.version ?? 0;

//     updatePreferences.mutate(
//       { version, replaceAll: true, items },
//       { onSuccess: () => onSubmit() },
//     );
//   };

//   const isSaving = isAgentFlow && updatePreferences.isPending;
//   const hasError = isAgentFlow && !!updatePreferences.error;

//   return (
//     <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
//       <View style={S.modalOverlay}>
//         <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
//         <SafeAreaView style={styles.sheet}>
//           <View style={styles.handle} />
//           <View style={styles.sheetHeader}>
//             <Text style={styles.sheetTitle}>Review Your Preferences</Text>
//             <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
//               <Text style={styles.closeBtn}>✕</Text>
//             </TouchableOpacity>
//           </View>

//           <View style={styles.reviewBody}>
//             <ReviewScreen screens={screens} answers={answers} />
//           </View>

//           {hasError ? (
//             <Text style={styles.errorTxt}>Failed to save preferences. Please try again.</Text>
//           ) : null}

//           <View style={styles.footer}>
//             <TouchableOpacity activeOpacity={0.75} onPress={onClose} style={NavS.btnBack}>
//               <Text style={NavS.btnBackTxt}>Back</Text>
//             </TouchableOpacity>
//             <TouchableOpacity
//               activeOpacity={0.8}
//               onPress={handleSubmit}
//               style={[NavS.btnSubmit, (isSaving || isLoadingVersion) && NavS.btnDisabled]}
//               disabled={isSaving || isLoadingVersion}
//             >
//               {isSaving || isLoadingVersion ? (
//                 <ActivityIndicator color="#fff" size="small" />
//               ) : (
//                 <Text style={NavS.btnSubmitTxt}>Submit  ✓</Text>
//               )}
//             </TouchableOpacity>
//           </View>
//         </SafeAreaView>
//       </View>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   backdrop: {
//     ...StyleSheet.absoluteFillObject,
//   },
//   sheet: {
//     flex: 1,
//     marginTop: 48,
//     backgroundColor: Colors.surface,
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     overflow: 'hidden',
//   },
//   handle: {
//     alignSelf: 'center',
//     width: 40,
//     height: 4,
//     borderRadius: 2,
//     backgroundColor: Colors.borderMid,
//     marginTop: 10,
//     marginBottom: 4,
//   },
//   sheetHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//     borderBottomWidth: 1,
//     borderBottomColor: Colors.border,
//   },
//   sheetTitle: {
//     fontSize: 17,
//     fontWeight: '700',
//     color: Colors.text,
//   },
//   closeBtn: {
//     fontSize: 18,
//     color: Colors.textSub,
//     fontWeight: '600',
//   },
//   reviewBody: {
//     flex: 1,
//   },
//   errorTxt: {
//     color: '#D32F2F',
//     fontSize: 13,
//     textAlign: 'center',
//     paddingHorizontal: 16,
//     paddingBottom: 8,
//   },
//   footer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     borderTopWidth: 1,
//     borderTopColor: Colors.border,
//     gap: 10,
//   },
// });
