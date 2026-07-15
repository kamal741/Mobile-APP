import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { User, Mail, X, Link, Phone, ChevronDown } from 'lucide-react-native';
import { AddClientPayload } from '../types/client.types';
import { colors, radius, spacing, sharedStyles } from '../styles/shared.styles';
import { API_GLOBAL_PATHS } from '../../../../lib/apiGlobalPaths';
import { api } from '../../../../lib/api';
import { toOptionalPhoneE164, isValidE164 } from '../../../../lib/phoneE164';
import { AlertModal } from '@/components/AlertModal';
import { AlertModalState } from '../../TourDashboard/types/tour.types';
import { findCountryByCode, useLocationMetadata } from '../../../../lib/locationMetadataApi';

interface AgentMeResponse {
  agentId: number;
  referralCode?: string | null;
}

interface Props {
  visible:    boolean;
  onClose:    () => void;
  onSubmit:   (payload: AddClientPayload) => void;
  onSuccess?: () => void; // called after a successful registration — use to refetch parent lists
  isLoading:  boolean;
}

const CLIENT_TYPE_OPTIONS = [
  { label: 'Buyer',  value: 'BUYER'  },
  { label: 'Renter', value: 'RENTER' },
];

// ─── Parse Axios error into a structured API error ────────────────────────────
interface ApiError {
  status: number;
  detail: string;
  errorType?: string;
}

function parseApiError(err: unknown): ApiError | null {
  if (err !== null && typeof err === 'object' && 'response' in err) {
    const response = (err as {
      response?: { status?: number; data?: { detail?: string; errorType?: string } };
    }).response;
    if (response?.status) {
      return {
        status: response.status,
        detail: response.data?.detail ?? 'An unexpected error occurred.',
        errorType: response.data?.errorType,
      };
    }
  }
  return null;
}

export function AddClientModal({ visible, onClose, onSubmit, onSuccess, isLoading }: Props) {
  const { data: locationMetadata } = useLocationMetadata();
  const phoneExample = findCountryByCode(locationMetadata?.countries, 'CA')?.phoneExample ?? '+14165551234';

  // ─── Form fields ───────────────────────────────────────────────────────────
  const [firstName,  setFirstName]  = useState('');
  const [lastName,   setLastName]   = useState('');
  const [email,      setEmail]      = useState('');
  const [phone,      setPhone]      = useState('');
  const [clientType, setClientType] = useState('');

  // ─── Dropdown state ────────────────────────────────────────────────────────
  const [showTypePicker, setShowTypePicker] = useState(false);

  // ─── Field errors ──────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── Agent referral code (auto-fetched) ───────────────────────────────────
  const [referralCode,       setReferralCode]       = useState('');
  const [isFetchingReferral, setIsFetchingReferral] = useState(false);
  const [referralError,      setReferralError]      = useState<string | null>(null);

  // ─── Submission state ─────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Success alert modal ──────────────────────────────────────────────────
  const [alertModal, setAlertModal] = useState<AlertModalState | null>(null);

  const selectedTypeLabel = CLIENT_TYPE_OPTIONS.find((o) => o.value === clientType)?.label ?? 'Select client type';

  // ─── Reset form when modal closes ─────────────────────────────────────────
  useEffect(() => {
    if (!visible) {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setClientType('');
      setShowTypePicker(false);
      setErrors({});
    }
  }, [visible]);

  // ─── Fetch agent referral code when modal opens ───────────────────────────
  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    (async () => {
      setIsFetchingReferral(true);
      setReferralError(null);
      try {
        const res = await api.get<AgentMeResponse>(`${API_GLOBAL_PATHS.agentSession}/me`);
        if (!cancelled) setReferralCode(res.data.referralCode ?? '');
      } catch (err: unknown) {
        if (!cancelled) {
          setReferralError(
            err instanceof Error ? err.message : 'Could not load referral code'
          );
        }
      } finally {
        if (!cancelled) setIsFetchingReferral(false);
      }
    })();

    return () => { cancelled = true; };
  }, [visible]);

  // ─── Validation ───────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim())  newErrors.lastName  = 'Last name is required';

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      newErrors.email = 'Invalid email format';
    }

    const phoneTrim = phone.trim();
    if (phoneTrim && !isValidE164(phoneTrim)) {
      newErrors.phone = `If you enter a phone, use E.164 format, e.g. ${phoneExample}`;
    }

    if (!clientType) {
      newErrors.clientType = 'Client type is required';
    }

    if (!referralCode.trim()) {
      newErrors.referralCode = 'Agent referral code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearError = (field: string) =>
    setErrors((prev) => ({ ...prev, [field]: '' }));

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert('Check your details', 'Please fix the fields marked in red, then try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ref       = referralCode.trim();
      const phoneE164 = toOptionalPhoneE164(phone.trim());

      await api.post(`${API_GLOBAL_PATHS.clientPublicClients}/register`, {
        brokerId:          null,
        agentReferralCode: ref,
        email:             email.trim(),
        firstName:         firstName.trim() || null,
        lastName:          lastName.trim()  || null,
        phoneE164,
        profileImageUrl:   null,
        clientType:        clientType || null,
        driveFolderUrl:    null,
      });

      // ── Notify parent to refetch client lists & stats immediately ──────────
      onSuccess?.();

      try {
        await api.post(`${API_GLOBAL_PATHS.portalPublicSession}/otp/send`, {
          identifier: email.trim(),
        });
      } catch {
        // ignore — user can request OTP again on Sign In
      }

      setAlertModal({
        visible: true,
        title:   'Client Added!',
        message: `${firstName.trim()} ${lastName.trim()} has been successfully added as a ${selectedTypeLabel}.`,
        buttons: [
          {
            text:    'Done',
            style:   'default',
            onPress: () => {
              onClose();
            },
          },
        ],
      });

    } catch (err: unknown) {
      const apiError = parseApiError(err);

      if (apiError) {
        const detailLower = apiError.detail.toLowerCase();

        if (apiError.status === 409) {
          // ── Duplicate email or mobile ──────────────────────────────────────
          if (detailLower.includes('mobile')) {
            setErrors((prev) => ({ ...prev, phone: 'This mobile number is already registered.' }));
            Alert.alert('Mobile Already Registered', 'This number is already in use. Try a different one or ask the client to sign in.');
          } else if (detailLower.includes('email')) {
            setErrors((prev) => ({ ...prev, email: 'This email is already registered.' }));
            Alert.alert('Email Already Registered', 'This email is already in use. Try a different one or ask the client to sign in.');
          } else {
            Alert.alert('Already Registered', apiError.detail);
          }

        } else if (apiError.status === 404 && apiError.errorType === 'ResourceNotFoundException') {
          // ── Invalid referral code ──────────────────────────────────────────
          if (detailLower.includes('referral')) {
            setErrors((prev) => ({ ...prev, referralCode: 'Invalid referral code. Please check and try again.' }));
            Alert.alert('Invalid Referral Code', apiError.detail);
          } else {
            Alert.alert('Not Found', apiError.detail);
          }

        } else {
          // ── Any other API error — show server detail directly ──────────────
          Alert.alert('Failed to Add Client', apiError.detail);
        }

      } else {
        // ── Network / unknown error ────────────────────────────────────────
        const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
        Alert.alert('Failed to Add Client', message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  const busy = isLoading || isSubmitting || isFetchingReferral;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.container}>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Add New Client</Text>
              <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">

              {/* First Name */}
              <Text style={sharedStyles.fieldLabel}>First Name <Text style={styles.required}>*</Text></Text>
              <View style={[sharedStyles.inputWithIcon, errors.firstName ? styles.inputError : null]}>
                <User size={18} color={colors.textDisabled} style={styles.inputIcon} />
                <TextInput
                  style={sharedStyles.textInput}
                  placeholder="Enter first name"
                  placeholderTextColor={colors.textDisabled}
                  value={firstName}
                  onChangeText={(v) => { setFirstName(v); clearError('firstName'); }}
                  autoCapitalize="words"
                />
              </View>
              {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}

              {/* Last Name */}
              <Text style={sharedStyles.fieldLabel}>Last Name <Text style={styles.required}>*</Text></Text>
              <View style={[sharedStyles.inputWithIcon, errors.lastName ? styles.inputError : null]}>
                <User size={18} color={colors.textDisabled} style={styles.inputIcon} />
                <TextInput
                  style={sharedStyles.textInput}
                  placeholder="Enter last name"
                  placeholderTextColor={colors.textDisabled}
                  value={lastName}
                  onChangeText={(v) => { setLastName(v); clearError('lastName'); }}
                  autoCapitalize="words"
                />
              </View>
              {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}

              {/* Email */}
              <Text style={sharedStyles.fieldLabel}>Email Address <Text style={styles.required}>*</Text></Text>
              <View style={[sharedStyles.inputWithIcon, errors.email ? styles.inputError : null]}>
                <Mail size={18} color={colors.textDisabled} style={styles.inputIcon} />
                <TextInput
                  style={sharedStyles.textInput}
                  placeholder="Enter email address"
                  placeholderTextColor={colors.textDisabled}
                  value={email}
                  onChangeText={(v) => { setEmail(v); clearError('email'); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

              {/* Phone */}
              <Text style={sharedStyles.fieldLabel}>Phone <Text style={styles.optional}>(optional, E.164)</Text></Text>
              <View style={[sharedStyles.inputWithIcon, errors.phone ? styles.inputError : null]}>
                <Phone size={18} color={colors.textDisabled} style={styles.inputIcon} />
                <TextInput
                  style={sharedStyles.textInput}
                  placeholder={phoneExample}
                  placeholderTextColor={colors.textDisabled}
                  value={phone}
                  onChangeText={(v) => { setPhone(v); clearError('phone'); }}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                />
              </View>
              {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

              {/* Client Type */}
              <Text style={sharedStyles.fieldLabel}>Client Type <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  errors.clientType ? styles.inputError : null,
                ]}
                onPress={() => {
                  setShowTypePicker((prev) => !prev);
                  clearError('clientType');
                }}
                activeOpacity={0.7}
              >
                <Text style={clientType ? styles.selectText : styles.selectPlaceholder}>
                  {selectedTypeLabel}
                </Text>
                <ChevronDown size={18} color={colors.textDisabled} />
              </TouchableOpacity>
              {errors.clientType ? <Text style={styles.errorText}>{errors.clientType}</Text> : null}

              {showTypePicker && (
                <View style={styles.pickerOptions}>
                  {CLIENT_TYPE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.pickerOption,
                        clientType === opt.value && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        setClientType(opt.value);
                        setShowTypePicker(false);
                        clearError('clientType');
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          clientType === opt.value && styles.pickerOptionTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Agent Referral Code */}
              <Text style={sharedStyles.fieldLabel}>Agent Referral Code <Text style={styles.required}>*</Text></Text>
              <View style={[sharedStyles.inputWithIcon, styles.referralInputWrap, errors.referralCode ? styles.inputError : null]}>
                <Link size={18} color={colors.textDisabled} style={styles.inputIcon} />
                {isFetchingReferral ? (
                  <View style={styles.referralLoading}>
                    <ActivityIndicator size="small" color={colors.brand} />
                    <Text style={styles.referralLoadingText}>Fetching…</Text>
                  </View>
                ) : (
                  <TextInput
                    style={[sharedStyles.textInput, styles.referralInput]}
                    value={referralCode}
                    onChangeText={(v) => { setReferralCode(v); clearError('referralCode'); }}
                    placeholder="Referral code"
                    placeholderTextColor={colors.textDisabled}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
              </View>
              {referralError
                ? <Text style={styles.errorText}>{referralError}</Text>
                : errors.referralCode
                  ? <Text style={styles.errorText}>{errors.referralCode}</Text>
                  : <Text style={styles.referralHint}>Auto-filled from your agent profile. Edit only if needed.</Text>
              }

            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={isSubmitting}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, busy && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={busy}
              >
                {isSubmitting
                  ? <ActivityIndicator size="small" color={colors.textInverted} />
                  : <Text style={styles.submitBtnText}>Add Client</Text>
                }
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Success alert — rendered outside the slide modal so it layers on top */}
      <AlertModal
        modal={alertModal}
        onDismiss={() => setAlertModal(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  container: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title:     { fontSize: 20, fontWeight: '700', color: colors.textSecondary },
  body:      { padding: spacing.xl },
  inputIcon: { marginRight: spacing.sm + 2 },

  inputError: {
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 2,
    marginBottom: spacing.sm,
    marginLeft: 2,
  },
  required: { color: '#ef4444', fontSize: 13 },
  optional: { color: colors.textDisabled, fontSize: 12, fontWeight: '400' },

  // ── Client Type dropdown ──────────────────────────────────────────────────
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgCard,
    marginBottom: spacing.xs,
    minHeight: 48,
  },
  selectText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  selectPlaceholder: {
    fontSize: 14,
    color: colors.textDisabled,
    flex: 1,
  },
  pickerOptions: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  pickerOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 2,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerOptionSelected: {
    backgroundColor: colors.brand + '15',
  },
  pickerOptionText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  pickerOptionTextSelected: {
    color: colors.brand,
    fontWeight: '600',
  },

  // ── Referral ──────────────────────────────────────────────────────────────
  referralInputWrap: {
    backgroundColor: colors.bgPage ?? '#f8fafc',
  },
  referralInput: {
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 1,
  },
  referralLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    height: 44,
  },
  referralLoadingText: { fontSize: 13, color: colors.textMuted },
  referralHint: {
    fontSize: 11,
    color: colors.textDisabled,
    marginTop: 2,
    marginBottom: spacing.lg,
    marginLeft: 2,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText:     { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  submitBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    minWidth: 100,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText:     { fontSize: 14, fontWeight: '600', color: colors.textInverted },
});














// import React, { useEffect, useState } from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   ScrollView,
//   KeyboardAvoidingView,
//   Platform,
//   StyleSheet,
//   ActivityIndicator,
//   Alert,
// } from 'react-native';
// import { User, Mail, X, Link, Phone, ChevronDown } from 'lucide-react-native';
// import { AddClientPayload } from '../types/client.types';
// import { colors, radius, spacing, sharedStyles } from '../styles/shared.styles';
// import { API_GLOBAL_PATHS } from '../../../../lib/apiGlobalPaths';
// import { api } from '../../../../lib/api';
// import { toOptionalPhoneE164, isValidE164 } from '../../../../lib/phoneE164';
// import { AlertModal } from '@/components/AlertModal';
// import { AlertModalState } from '../../TourDashboard/types/tour.types';

// interface AgentMeResponse {
//   agentId: number;
//   referralCode?: string | null;
// }

// interface Props {
//   visible:   boolean;
//   onClose:   () => void;
//   onSubmit:  (payload: AddClientPayload) => void;
//   isLoading: boolean;
// }

// const CLIENT_TYPE_OPTIONS = [
//   { label: 'Buyer',  value: 'BUYER'  },
//   { label: 'Renter', value: 'RENTER' },
// ];

// // ─── Parse Axios error into a structured API error ────────────────────────────
// interface ApiError {
//   status: number;
//   detail: string;
//   errorType?: string;
// }

// function parseApiError(err: unknown): ApiError | null {
//   if (err !== null && typeof err === 'object' && 'response' in err) {
//     const response = (err as {
//       response?: { status?: number; data?: { detail?: string; errorType?: string } };
//     }).response;
//     if (response?.status) {
//       return {
//         status: response.status,
//         detail: response.data?.detail ?? 'An unexpected error occurred.',
//         errorType: response.data?.errorType,
//       };
//     }
//   }
//   return null;
// }

// export function AddClientModal({ visible, onClose, onSubmit, isLoading }: Props) {

//   // ─── Form fields ───────────────────────────────────────────────────────────
//   const [firstName,  setFirstName]  = useState('');
//   const [lastName,   setLastName]   = useState('');
//   const [email,      setEmail]      = useState('');
//   const [phone,      setPhone]      = useState('');
//   const [clientType, setClientType] = useState('');

//   // ─── Dropdown state ────────────────────────────────────────────────────────
//   const [showTypePicker, setShowTypePicker] = useState(false);

//   // ─── Field errors ──────────────────────────────────────────────────────────
//   const [errors, setErrors] = useState<Record<string, string>>({});

//   // ─── Agent referral code (auto-fetched) ───────────────────────────────────
//   const [referralCode,       setReferralCode]       = useState('');
//   const [isFetchingReferral, setIsFetchingReferral] = useState(false);
//   const [referralError,      setReferralError]      = useState<string | null>(null);

//   // ─── Submission state ─────────────────────────────────────────────────────
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   // ─── Success alert modal ──────────────────────────────────────────────────
//   const [alertModal, setAlertModal] = useState<AlertModalState | null>(null);

//   const selectedTypeLabel = CLIENT_TYPE_OPTIONS.find((o) => o.value === clientType)?.label ?? 'Select client type';

//   // ─── Reset form when modal closes ─────────────────────────────────────────
//   useEffect(() => {
//     if (!visible) {
//       setFirstName('');
//       setLastName('');
//       setEmail('');
//       setPhone('');
//       setClientType('');
//       setShowTypePicker(false);
//       setErrors({});
//     }
//   }, [visible]);

//   // ─── Fetch agent referral code when modal opens ───────────────────────────
//   useEffect(() => {
//     if (!visible) return;

//     let cancelled = false;
//     (async () => {
//       setIsFetchingReferral(true);
//       setReferralError(null);
//       try {
//         const res = await api.get<AgentMeResponse>(`${API_GLOBAL_PATHS.agentSession}/me`);
//         if (!cancelled) setReferralCode(res.data.referralCode ?? '');
//       } catch (err: unknown) {
//         if (!cancelled) {
//           setReferralError(
//             err instanceof Error ? err.message : 'Could not load referral code'
//           );
//         }
//       } finally {
//         if (!cancelled) setIsFetchingReferral(false);
//       }
//     })();

//     return () => { cancelled = true; };
//   }, [visible]);

//   // ─── Validation ───────────────────────────────────────────────────────────
//   const validate = (): boolean => {
//     const newErrors: Record<string, string> = {};

//     if (!firstName.trim()) newErrors.firstName = 'First name is required';
//     if (!lastName.trim())  newErrors.lastName  = 'Last name is required';

//     if (!email.trim()) {
//       newErrors.email = 'Email is required';
//     } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
//       newErrors.email = 'Invalid email format';
//     }

//     const phoneTrim = phone.trim();
//     if (phoneTrim && !isValidE164(phoneTrim)) {
//       newErrors.phone = 'If you enter a phone, use E.164 format, e.g. +15551234567';
//     }

//     if (!clientType) {
//       newErrors.clientType = 'Client type is required';
//     }

//     if (!referralCode.trim()) {
//       newErrors.referralCode = 'Agent referral code is required';
//     }

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const clearError = (field: string) =>
//     setErrors((prev) => ({ ...prev, [field]: '' }));

//   // ─── Submit ───────────────────────────────────────────────────────────────
//   const handleSubmit = async () => {
//     if (!validate()) {
//       Alert.alert('Check your details', 'Please fix the fields marked in red, then try again.');
//       return;
//     }

//     setIsSubmitting(true);
//     try {
//       const ref       = referralCode.trim();
//       const phoneE164 = toOptionalPhoneE164(phone.trim());

//       await api.post(`${API_GLOBAL_PATHS.clientPublicClients}/register`, {
//         brokerId:          null,
//         agentReferralCode: ref,
//         email:             email.trim(),
//         firstName:         firstName.trim() || null,
//         lastName:          lastName.trim()  || null,
//         phoneE164,
//         profileImageUrl:   null,
//         clientType:        clientType || null,
//         driveFolderUrl:    null,
//       });

//       try {
//         await api.post(`${API_GLOBAL_PATHS.portalPublicSession}/otp/send`, {
//           identifier: email.trim(),
//         });
//       } catch {
//         // ignore — user can request OTP again on Sign In
//       }

//       setAlertModal({
//         visible: true,
//         title:   'Client Added!',
//         message: `${firstName.trim()} ${lastName.trim()} has been successfully added as a ${selectedTypeLabel}.`,
//         buttons: [
//           {
//             text:    'Done',
//             style:   'default',
//             onPress: () => {
//               onClose();
//             },
//           },
//         ],
//       });

//     } catch (err: unknown) {
//       const apiError = parseApiError(err);

//       if (apiError) {
//         const detailLower = apiError.detail.toLowerCase();

//         if (apiError.status === 409) {
//           // ── Duplicate email or mobile ──────────────────────────────────────
//           if (detailLower.includes('mobile')) {
//             setErrors((prev) => ({ ...prev, phone: 'This mobile number is already registered.' }));
//             Alert.alert('Mobile Already Registered', 'This number is already in use. Try a different one or ask the client to sign in.');
//           } else if (detailLower.includes('email')) {
//             setErrors((prev) => ({ ...prev, email: 'This email is already registered.' }));
//             Alert.alert('Email Already Registered', 'This email is already in use. Try a different one or ask the client to sign in.');
//           } else {
//             Alert.alert('Already Registered', apiError.detail);
//           }

//         } else if (apiError.status === 404 && apiError.errorType === 'ResourceNotFoundException') {
//           // ── Invalid referral code ──────────────────────────────────────────
//           if (detailLower.includes('referral')) {
//             setErrors((prev) => ({ ...prev, referralCode: 'Invalid referral code. Please check and try again.' }));
//             Alert.alert('Invalid Referral Code', apiError.detail);
//           } else {
//             Alert.alert('Not Found', apiError.detail);
//           }

//         } else {
//           // ── Any other API error — show server detail directly ──────────────
//           Alert.alert('Failed to Add Client', apiError.detail);
//         }

//       } else {
//         // ── Network / unknown error ────────────────────────────────────────
//         const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
//         Alert.alert('Failed to Add Client', message);
//       }
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleClose = () => {
//     if (!isSubmitting) onClose();
//   };

//   const busy = isLoading || isSubmitting || isFetchingReferral;

//   // ─── Render ───────────────────────────────────────────────────────────────
//   return (
//     <>
//       <Modal visible={visible} animationType="slide" transparent>
//         <KeyboardAvoidingView
//           style={styles.overlay}
//           behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         >
//           <View style={styles.container}>

//             {/* Header */}
//             <View style={styles.header}>
//               <Text style={styles.title}>Add New Client</Text>
//               <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
//                 <X size={24} color={colors.textMuted} />
//               </TouchableOpacity>
//             </View>

//             {/* Body */}
//             <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">

//               {/* First Name */}
//               <Text style={sharedStyles.fieldLabel}>First Name <Text style={styles.required}>*</Text></Text>
//               <View style={[sharedStyles.inputWithIcon, errors.firstName ? styles.inputError : null]}>
//                 <User size={18} color={colors.textDisabled} style={styles.inputIcon} />
//                 <TextInput
//                   style={sharedStyles.textInput}
//                   placeholder="Enter first name"
//                   placeholderTextColor={colors.textDisabled}
//                   value={firstName}
//                   onChangeText={(v) => { setFirstName(v); clearError('firstName'); }}
//                   autoCapitalize="words"
//                 />
//               </View>
//               {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}

//               {/* Last Name */}
//               <Text style={sharedStyles.fieldLabel}>Last Name <Text style={styles.required}>*</Text></Text>
//               <View style={[sharedStyles.inputWithIcon, errors.lastName ? styles.inputError : null]}>
//                 <User size={18} color={colors.textDisabled} style={styles.inputIcon} />
//                 <TextInput
//                   style={sharedStyles.textInput}
//                   placeholder="Enter last name"
//                   placeholderTextColor={colors.textDisabled}
//                   value={lastName}
//                   onChangeText={(v) => { setLastName(v); clearError('lastName'); }}
//                   autoCapitalize="words"
//                 />
//               </View>
//               {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}

//               {/* Email */}
//               <Text style={sharedStyles.fieldLabel}>Email Address <Text style={styles.required}>*</Text></Text>
//               <View style={[sharedStyles.inputWithIcon, errors.email ? styles.inputError : null]}>
//                 <Mail size={18} color={colors.textDisabled} style={styles.inputIcon} />
//                 <TextInput
//                   style={sharedStyles.textInput}
//                   placeholder="Enter email address"
//                   placeholderTextColor={colors.textDisabled}
//                   value={email}
//                   onChangeText={(v) => { setEmail(v); clearError('email'); }}
//                   keyboardType="email-address"
//                   autoCapitalize="none"
//                 />
//               </View>
//               {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

//               {/* Phone */}
//               <Text style={sharedStyles.fieldLabel}>Phone <Text style={styles.optional}>(optional, E.164)</Text></Text>
//               <View style={[sharedStyles.inputWithIcon, errors.phone ? styles.inputError : null]}>
//                 <Phone size={18} color={colors.textDisabled} style={styles.inputIcon} />
//                 <TextInput
//                   style={sharedStyles.textInput}
//                   placeholder="+15551234567"
//                   placeholderTextColor={colors.textDisabled}
//                   value={phone}
//                   onChangeText={(v) => { setPhone(v); clearError('phone'); }}
//                   keyboardType="phone-pad"
//                   autoCapitalize="none"
//                 />
//               </View>
//               {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

//               {/* Client Type */}
//               <Text style={sharedStyles.fieldLabel}>Client Type <Text style={styles.required}>*</Text></Text>
//               <TouchableOpacity
//                 style={[
//                   styles.selectButton,
//                   errors.clientType ? styles.inputError : null,
//                 ]}
//                 onPress={() => {
//                   setShowTypePicker((prev) => !prev);
//                   clearError('clientType');
//                 }}
//                 activeOpacity={0.7}
//               >
//                 <Text style={clientType ? styles.selectText : styles.selectPlaceholder}>
//                   {selectedTypeLabel}
//                 </Text>
//                 <ChevronDown size={18} color={colors.textDisabled} />
//               </TouchableOpacity>
//               {errors.clientType ? <Text style={styles.errorText}>{errors.clientType}</Text> : null}

//               {showTypePicker && (
//                 <View style={styles.pickerOptions}>
//                   {CLIENT_TYPE_OPTIONS.map((opt) => (
//                     <TouchableOpacity
//                       key={opt.value}
//                       style={[
//                         styles.pickerOption,
//                         clientType === opt.value && styles.pickerOptionSelected,
//                       ]}
//                       onPress={() => {
//                         setClientType(opt.value);
//                         setShowTypePicker(false);
//                         clearError('clientType');
//                       }}
//                     >
//                       <Text
//                         style={[
//                           styles.pickerOptionText,
//                           clientType === opt.value && styles.pickerOptionTextSelected,
//                         ]}
//                       >
//                         {opt.label}
//                       </Text>
//                     </TouchableOpacity>
//                   ))}
//                 </View>
//               )}

//               {/* Agent Referral Code */}
//               <Text style={sharedStyles.fieldLabel}>Agent Referral Code <Text style={styles.required}>*</Text></Text>
//               <View style={[sharedStyles.inputWithIcon, styles.referralInputWrap, errors.referralCode ? styles.inputError : null]}>
//                 <Link size={18} color={colors.textDisabled} style={styles.inputIcon} />
//                 {isFetchingReferral ? (
//                   <View style={styles.referralLoading}>
//                     <ActivityIndicator size="small" color={colors.brand} />
//                     <Text style={styles.referralLoadingText}>Fetching…</Text>
//                   </View>
//                 ) : (
//                   <TextInput
//                     style={[sharedStyles.textInput, styles.referralInput]}
//                     value={referralCode}
//                     onChangeText={(v) => { setReferralCode(v); clearError('referralCode'); }}
//                     placeholder="Referral code"
//                     placeholderTextColor={colors.textDisabled}
//                     autoCapitalize="none"
//                     autoCorrect={false}
//                   />
//                 )}
//               </View>
//               {referralError
//                 ? <Text style={styles.errorText}>{referralError}</Text>
//                 : errors.referralCode
//                   ? <Text style={styles.errorText}>{errors.referralCode}</Text>
//                   : <Text style={styles.referralHint}>Auto-filled from your agent profile. Edit only if needed.</Text>
//               }

//             </ScrollView>

//             {/* Footer */}
//             <View style={styles.footer}>
//               <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={isSubmitting}>
//                 <Text style={styles.cancelBtnText}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[styles.submitBtn, busy && styles.submitBtnDisabled]}
//                 onPress={handleSubmit}
//                 disabled={busy}
//               >
//                 {isSubmitting
//                   ? <ActivityIndicator size="small" color={colors.textInverted} />
//                   : <Text style={styles.submitBtnText}>Add Client</Text>
//                 }
//               </TouchableOpacity>
//             </View>

//           </View>
//         </KeyboardAvoidingView>
//       </Modal>

//       {/* Success alert — rendered outside the slide modal so it layers on top */}
//       <AlertModal
//         modal={alertModal}
//         onDismiss={() => setAlertModal(null)}
//       />
//     </>
//   );
// }

// const styles = StyleSheet.create({
//   overlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     padding: spacing.xl,
//   },
//   container: {
//     backgroundColor: colors.bgCard,
//     borderRadius: 16,
//     maxHeight: '90%',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.15,
//     shadowRadius: 12,
//     elevation: 8,
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: spacing.xl,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border,
//   },
//   title:     { fontSize: 20, fontWeight: '700', color: colors.textSecondary },
//   body:      { padding: spacing.xl },
//   inputIcon: { marginRight: spacing.sm + 2 },

//   inputError: {
//     borderColor: '#ef4444',
//     borderWidth: 1,
//   },
//   errorText: {
//     fontSize: 12,
//     color: '#ef4444',
//     marginTop: 2,
//     marginBottom: spacing.sm,
//     marginLeft: 2,
//   },
//   required: { color: '#ef4444', fontSize: 13 },
//   optional: { color: colors.textDisabled, fontSize: 12, fontWeight: '400' },

//   // ── Client Type dropdown ──────────────────────────────────────────────────
//   selectButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: radius.lg,
//     paddingHorizontal: spacing.md,
//     paddingVertical: spacing.md,
//     backgroundColor: colors.bgCard,
//     marginBottom: spacing.xs,
//     minHeight: 48,
//   },
//   selectText: {
//     fontSize: 14,
//     color: colors.textSecondary,
//     flex: 1,
//   },
//   selectPlaceholder: {
//     fontSize: 14,
//     color: colors.textDisabled,
//     flex: 1,
//   },
//   pickerOptions: {
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: radius.lg,
//     overflow: 'hidden',
//     marginBottom: spacing.md,
//   },
//   pickerOption: {
//     paddingHorizontal: spacing.md,
//     paddingVertical: spacing.md + 2,
//     backgroundColor: colors.bgCard,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border,
//   },
//   pickerOptionSelected: {
//     backgroundColor: colors.brand + '15',
//   },
//   pickerOptionText: {
//     fontSize: 14,
//     color: colors.textSecondary,
//   },
//   pickerOptionTextSelected: {
//     color: colors.brand,
//     fontWeight: '600',
//   },

//   // ── Referral ──────────────────────────────────────────────────────────────
//   referralInputWrap: {
//     backgroundColor: colors.bgPage ?? '#f8fafc',
//   },
//   referralInput: {
//     color: colors.textSecondary,
//     fontWeight: '600',
//     letterSpacing: 1,
//   },
//   referralLoading: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: spacing.sm,
//     flex: 1,
//     height: 44,
//   },
//   referralLoadingText: { fontSize: 13, color: colors.textMuted },
//   referralHint: {
//     fontSize: 11,
//     color: colors.textDisabled,
//     marginTop: 2,
//     marginBottom: spacing.lg,
//     marginLeft: 2,
//   },

//   // ── Footer ────────────────────────────────────────────────────────────────
//   footer: {
//     flexDirection: 'row',
//     justifyContent: 'flex-end',
//     gap: spacing.md,
//     padding: spacing.xl,
//     borderTopWidth: 1,
//     borderTopColor: colors.border,
//   },
//   cancelBtn: {
//     paddingHorizontal: spacing.xl,
//     paddingVertical: spacing.md,
//     borderRadius: radius.lg,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   cancelBtnText:     { fontSize: 14, fontWeight: '600', color: colors.textMuted },
//   submitBtn: {
//     paddingHorizontal: spacing.xl,
//     paddingVertical: spacing.md,
//     borderRadius: radius.lg,
//     backgroundColor: colors.brand,
//     minWidth: 100,
//     alignItems: 'center',
//   },
//   submitBtnDisabled: { opacity: 0.5 },
//   submitBtnText:     { fontSize: 14, fontWeight: '600', color: colors.textInverted },
// });
