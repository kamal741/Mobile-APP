import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRoute } from '@react-navigation/native';

import { AlertModal } from '../../../../components/AlertModal';
import type { AlertModalState } from '../../TourDashboard/types/tour.types';

// Hook
import { useCreateOfferFlow } from '../hooks/useCreateOfferFlow';

// Step components
import {
  OfferStepIndicator,
  OfferStepFooter,
  SelectOfferClientStep,
  SelectOfferPropertyStep,
  OfferPriceStep,
  OfferReviewStep,
} from '../components/CreateOffer';

// Styles
import { sharedOfferStyles as ss } from '../styles/shared.styles';
import { createOfferStyles as s }  from '../styles/createOffer.styles';

// Constants
import { OFFER_STRINGS } from '../constants/createOffer.constants';

// ─── Route params ─────────────────────────────────────────────────────────────

interface CreateOfferRouteParams {
  prefillClientId?:   string;
  prefillPropertyId?: string;
  initialStep?:       number;
}

// ─── Navigation prop ──────────────────────────────────────────────────────────

interface CreateOfferScreenProps {
  navigation: { goBack: () => void };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreateOfferScreen({ navigation }: CreateOfferScreenProps) {
  // ← Read prefill params passed from TourDetailsScreen
  const route = useRoute<any>();
  const {
    prefillClientId,
    prefillPropertyId,
    initialStep,
  } = ((route.params ?? {}) as CreateOfferRouteParams);

  const flow = useCreateOfferFlow({
    prefillClientId,
    prefillPropertyId,
    initialStep,
  });

  const [successModal, setSuccessModal] = useState<AlertModalState | null>(null);

  const onDismissAlert = useCallback(() => {
    setSuccessModal(null);
  }, []);

  const onSubmit = useCallback(async () => {
    const result = await flow.handleSubmit();
    if (result) {
      setSuccessModal({
        visible: true,
        title: OFFER_STRINGS.SUCCESS_TITLE,
        message: OFFER_STRINGS.SUCCESS_MSG,
        buttons: [
          {
            text: OFFER_STRINGS.OKAY,
            onPress: () => {
              flow.resetForm();
              navigation.goBack();
            },
          },
        ],
      });
    }
  }, [flow, navigation]);

  // console.log('CreateOfferScreen render', { prefillClientId, prefillPropertyId, initialStep });

  return (
    <KeyboardAvoidingView
      style={ss.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Step progress bar */}
      <OfferStepIndicator currentStep={flow.currentStep} />

      {/* Scrollable step content */}
      <ScrollView
        style={ss.flex1}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {flow.currentStep === 1 && (
          <SelectOfferClientStep
            clients={flow.clients}
            clientsLoading={flow.clientsLoading}
            selectedClient={flow.selectedClient}
            clientSearch={flow.clientSearch}
            onSearchChange={flow.setClientSearch}
            onSelectClient={flow.selectClient}
          />
        )}

        {flow.currentStep === 2 && (
          <SelectOfferPropertyStep
            selectedProperty={flow.selectedProperty}
            propertySearch={flow.propertySearch}
            onSearchChange={flow.setPropertySearch}
            onSelectProperty={flow.selectProperty}
          />
        )}

        {flow.currentStep === 3 && (
          <OfferPriceStep
            amount={flow.amount}
            notes={flow.notes}
            errors={flow.amountErrors}
            onAmountChange={flow.setAmount}
            onNotesChange={flow.setNotes}
          />
        )}

        {flow.currentStep === 4 && (
          <OfferReviewStep
            selectedClient={flow.selectedClient}
            selectedProperty={flow.selectedProperty}
            amount={flow.amount}
            notes={flow.notes}
            submitError={flow.submitError}
          />
        )}
      </ScrollView>

      {/* Sticky footer — back / next / submit */}
      <OfferStepFooter
        currentStep={flow.currentStep}
        canProceed={flow.canProceed()}
        isSubmitting={flow.isSubmitting}
        onBack={flow.goBack}
        onNext={flow.goNext}
        onSubmit={onSubmit}
      />

      <AlertModal modal={successModal} onDismiss={onDismissAlert} />
    </KeyboardAvoidingView>
  );
}





// import React, { useCallback, useState } from 'react';
// import {
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
// } from 'react-native';

// import { AlertModal } from '../../AlertModal';
// import type { AlertModalState } from '../../TourDashboard/types/tour.types';

// // Hook
// import { useCreateOfferFlow } from '../hooks/useCreateOfferFlow';

// // Step components
// import {
//   OfferStepIndicator,
//   OfferStepFooter,
//   SelectOfferClientStep,
//   SelectOfferPropertyStep,
//   OfferPriceStep,
//   OfferReviewStep,
// } from '../components/CreateOffer';

// // Styles
// import { sharedOfferStyles as ss } from '../styles/shared.styles';
// import { createOfferStyles as s }  from '../styles/createOffer.styles';

// // Constants
// import { OFFER_STRINGS } from '../constants/createOffer.constants';

// // ─── Navigation prop ─────────────────────────────────────────────────────────

// interface CreateOfferScreenProps {
//   navigation: { goBack: () => void };
// }

// // ─── Screen ──────────────────────────────────────────────────────────────────

// export default function CreateOfferScreen({ navigation }: CreateOfferScreenProps) {
//   const flow = useCreateOfferFlow();
//   const [successModal, setSuccessModal] = useState<AlertModalState | null>(null);

//   const onDismissAlert = useCallback(() => {
//     setSuccessModal(null);
//   }, []);

//   const onSubmit = useCallback(async () => {
//     const result = await flow.handleSubmit();
//     if (result) {
//       setSuccessModal({
//         visible: true,
//         title: OFFER_STRINGS.SUCCESS_TITLE,
//         message: OFFER_STRINGS.SUCCESS_MSG,
//         buttons: [
//           {
//             text: OFFER_STRINGS.OKAY,
//             onPress: () => {
//               flow.resetForm();
//               navigation.goBack();
//             },
//           },
//         ],
//       });
//     }
//   }, [flow, navigation]);

//   return (
//     <KeyboardAvoidingView
//       style={ss.screen}
//       behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//     >
//       {/* Step progress bar */}
//       <OfferStepIndicator currentStep={flow.currentStep} />

//       {/* Scrollable step content */}
//       <ScrollView
//         style={ss.flex1}
//         contentContainerStyle={s.scrollContent}
//         keyboardShouldPersistTaps="handled"
//         showsVerticalScrollIndicator={false}
//       >
//         {flow.currentStep === 1 && (
//           <SelectOfferClientStep
//             clients={flow.clients}
//             clientsLoading={flow.clientsLoading}
//             selectedClient={flow.selectedClient}
//             clientSearch={flow.clientSearch}
//             onSearchChange={flow.setClientSearch}
//             onSelectClient={flow.selectClient}
//           />
//         )}

//         {flow.currentStep === 2 && (
//           <SelectOfferPropertyStep
//             properties={flow.properties}
//             propertiesLoading={flow.propertiesLoading}
//             selectedProperty={flow.selectedProperty}
//             propertySearch={flow.propertySearch}
//             onSearchChange={flow.setPropertySearch}
//             onSelectProperty={flow.selectProperty}
//           />
//         )}

//         {flow.currentStep === 3 && (
//           <OfferPriceStep
//             amount={flow.amount}
//             notes={flow.notes}
//             errors={flow.amountErrors}
//             onAmountChange={flow.setAmount}
//             onNotesChange={flow.setNotes}
//           />
//         )}

//         {flow.currentStep === 4 && (
//           <OfferReviewStep
//             selectedClient={flow.selectedClient}
//             selectedProperty={flow.selectedProperty}
//             amount={flow.amount}
//             notes={flow.notes}
//             submitError={flow.submitError}
//           />
//         )}
//       </ScrollView>

//       {/* Sticky footer — back / next / submit */}
//       <OfferStepFooter
//         currentStep={flow.currentStep}
//         canProceed={flow.canProceed()}
//         isSubmitting={flow.isSubmitting}
//         onBack={flow.goBack}
//         onNext={flow.goNext}
//         onSubmit={onSubmit}
//       />

//       <AlertModal modal={successModal} onDismiss={onDismissAlert} />
//     </KeyboardAvoidingView>
//   );
// }
