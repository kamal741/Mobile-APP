import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAuthErrorMessage, useAuth } from '../contexts/AuthContext';
import { isValidE164 } from '../lib/phoneE164';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { CountryPhoneInput, normalizePhoneForCountry } from '../components/CountryPhoneInput';
import { RootStackParamList } from '../navigation/types';
import { DOBPicker } from '../components/DobPicker';
import { findCountryByCode, useCountries } from '../lib/locationMetadataApi';
import {
  AlertCircle,
  Building2,
  CalendarDays,
  Check,
  LockKeyhole,
  Route,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { border, colors, fontSize, fontWeight, radius, shadows, spacing } from '@/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const BRAND_LOGO = require('../images/showing-trails-logo.png');

const CLIENT_TYPE_OPTIONS = [
  { label: 'Buyer',  value: 'BUYER'  },
  { label: 'Renter', value: 'RENTER' },
];

function FieldError({ message }: Readonly<{ message?: string }>) {
  if (!message) return null;

  return (
    <View style={styles.fieldErrorRow}>
      <View style={styles.fieldErrorIcon}>
        <AlertCircle size={14} color={colors.error.default} strokeWidth={2.4} />
      </View>
      <Text style={styles.fieldErrorText}>{message}</Text>
    </View>
  );
}

function formatDOBDisplay(ymd: string): string {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const monthName = monthNames[parseInt(m, 10) - 1] ?? m;
  return `${parseInt(d, 10)} ${monthName} ${y}`;
}

export function RegisterScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'Register'>>();
  const { register } = useAuth();
  const { data: countries } = useCountries();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = width >= 820;
  const invitedAsAgent = Boolean(route.params?.inviteCode);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: (route.params?.role ?? (invitedAsAgent ? 'agent' : 'client')) as 'agent' | 'client',
    agentReferralCode: '',
    brokerageInviteCode: route.params?.inviteCode ?? '',
    dateOfBirth: '',
    clientType: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dobPickerVisible, setDobPickerVisible] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState('CA');

  useEffect(() => {
    const inviteCode = route.params?.inviteCode?.trim();
    if (!inviteCode) return;
    setFormData((current) => ({
      ...current,
      role: 'agent',
      brokerageInviteCode: inviteCode,
    }));
  }, [route.params?.inviteCode]);

  const selectedTypeLabel =
    CLIENT_TYPE_OPTIONS.find((o) => o.value === formData.clientType)?.label ?? 'Select client type';
  const selectedCountry = findCountryByCode(countries, selectedCountryCode);
  const selectedPhoneCode = selectedCountry?.phoneCode || '+1';
  const phoneExample = selectedCountry?.phoneExample || '+14165551234';
  const normalizedPhone = normalizePhoneForCountry(formData.phone, selectedPhoneCode);

  const goToSignIn = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.replace('Login');
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (formData.role === 'client' && !formData.agentReferralCode.trim()) {
      newErrors.agentReferralCode = 'Agent referral code is required for client signup';
    }
    const phoneTrim = normalizedPhone.trim();
    if (phoneTrim && !isValidE164(phoneTrim)) {
      newErrors.phone = `If you enter a phone, use E.164 format, e.g. ${phoneExample}`;
    }
    if (formData.role === 'client' && !formData.clientType) {
      newErrors.clientType = 'Client type is required';
    }
    if (formData.role === 'agent') {
      if (!formData.brokerageInviteCode.trim()) {
        newErrors.brokerageInviteCode = 'Brokerage invite code is required';
      }
      if (!formData.dateOfBirth.trim()) {
        newErrors.dateOfBirth = 'Date of birth is required';
      }
      const p = normalizedPhone.trim();
      if (!p) {
        newErrors.phone = 'Mobile is required for agent signup (E.164)';
      } else if (!isValidE164(p)) {
        newErrors.phone = `Use E.164 mobile, e.g. ${phoneExample}`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    setSubmitError(null);
    if (!validate()) {
      Alert.alert('Check your details', 'Please fix the fields marked in red, then try again.');
      return;
    }

    setIsLoading(true);
    try {
      const outcome = await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: normalizedPhone,
        role: formData.role,
        agentReferralCode: formData.agentReferralCode,
        brokerageInviteCode: formData.brokerageInviteCode,
        dateOfBirth: formData.dateOfBirth,
        clientType: formData.clientType,
      });
      if (outcome === 'agent') {
        Alert.alert(
          'Account created',
          'Your agent profile was registered. On Sign In, use your email or mobile and request a one-time code.'
        );
        goToSignIn();
      } else {
        Alert.alert(
          'Account created',
          'Your client profile was registered. Use Sign In when you are ready, then request a one-time code.'
        );
        goToSignIn();
      }
    } catch (error: unknown) {
      // Structured API error thrown by throwApiError in AuthContext
      if (
        error !== null &&
        typeof error === 'object' &&
        'status' in error &&
        'detail' in error
      ) {
        const { status, detail, errorType } = error as {
          status: number;
          detail: string;
          errorType?: string;
        };
        const detailLower = detail.toLowerCase();
        setSubmitError(detail);

        if (status === 409) {
          if (detailLower.includes('maximum number of agents') || detailLower.includes('license')) {
            Alert.alert('Agent limit reached', detail);
          } else if (detailLower.includes('mobile')) {
            setErrors((prev) => ({ ...prev, phone: 'This mobile number is already registered.' }));
            Alert.alert('Already Registered', detail);
          } else if (detailLower.includes('email')) {
            setErrors((prev) => ({ ...prev, email: 'This email is already registered.' }));
            Alert.alert('Already Registered', detail);
          } else {
            Alert.alert('Registration Failed', detail);
          }

        } else if (status === 404 && errorType === 'ResourceNotFoundException') {
          // Unknown referral / invite code
          if (detailLower.includes('referral')) {
            setErrors((prev) => ({ ...prev, agentReferralCode: 'Invalid referral code. Check with your agent.' }));
          } else if (detailLower.includes('invite') || detailLower.includes('brokerage')) {
            setErrors((prev) => ({ ...prev, brokerageInviteCode: 'Invalid invite code. Check with your broker.' }));
          }
          Alert.alert('Invalid Code', detail);

        } else {
          // Any other API error — show detail directly
          Alert.alert('Registration Failed', detail);
        }
      } else {
        // Non-API / network errors
        const message = getAuthErrorMessage(error);
        setSubmitError(message);
        Alert.alert('Registration Failed', message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSubmitError(null);
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleDOBConfirm = (date: string) => {
    updateField('dateOfBirth', date);
    setDobPickerVisible(false);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.screenBody}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <StatusBar
        style="dark"
        backgroundColor={colors.background.screen}
        translucent={false}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: isWide ? spacing['8xl'] : spacing['4xl'],
            paddingBottom: Math.max(insets.bottom + spacing['3xl'], spacing['6xl']),
          },
        ]}
      >
        <View style={[styles.shell, isWide && styles.shellWide]}>
          <View style={[styles.brandPanel, !isWide && styles.brandPanelCompact]}>
            <View style={styles.brandLockup}>
              <View style={styles.logoFrame}>
                <Image source={BRAND_LOGO} style={styles.logoImage} resizeMode="contain" />
              </View>
              <View style={styles.brandTextGroup}>
                <Text style={styles.brandName}>Showing Trail</Text>
                <Text style={styles.brandKicker}>Real Estate Viewing Management</Text>
              </View>
            </View>

            <View style={[styles.heroCopy, !isWide && styles.heroCopyCompact]}>
              <View style={styles.eyebrowPill}>
                <Route size={14} color={colors.primary.default} strokeWidth={2.4} />
                <Text style={styles.eyebrowText}>Join your showing workflow</Text>
              </View>
              <Text style={[styles.heroTitle, !isWide && styles.heroTitleCompact]}>
                Start clear. Stay connected.
              </Text>
              {isWide && (
                <Text style={styles.heroBody}>
                  Create your secure workspace for tours, client updates, routes, and offers.
                </Text>
              )}
            </View>

            {isWide && (
              <View style={styles.trustList}>
                <View style={styles.trustItem}>
                  <View style={styles.trustIcon}>
                    <Check size={14} color={colors.text.inverse} strokeWidth={3} />
                  </View>
                  <Text style={styles.trustText}>Role-based access for clients and agents</Text>
                </View>
                <View style={styles.trustItem}>
                  <View style={styles.trustIcon}>
                    <Check size={14} color={colors.text.inverse} strokeWidth={3} />
                  </View>
                  <Text style={styles.trustText}>Password-free sign in after registration</Text>
                </View>
              </View>
            )}
          </View>

          <View style={[styles.formPanel, isWide && styles.formPanelWide]}>
            <View style={styles.formContent}>
              <View style={styles.formHeader}>
                <View style={styles.secureLabel}>
                  <ShieldCheck size={15} color={colors.primary.mid} strokeWidth={2.3} />
                  <Text style={styles.secureLabelText}>Secure registration</Text>
                </View>
                <Text style={styles.formTitle}>Create your account</Text>
                <Text style={styles.formSubtitle}>
                  Choose your role and enter the details provided by your agent or brokerage.
                </Text>
              </View>

              <View style={styles.roleSelector}>
                <Pressable
                  style={({ pressed }) => [
                    styles.roleButton,
                    formData.role === 'client' && styles.roleButtonActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => updateField('role', 'client')}
                >
                  <Users
                    size={16}
                    color={formData.role === 'client' ? colors.text.inverse : colors.text.secondary}
                    strokeWidth={2.2}
                  />
                  <Text style={[styles.roleText, formData.role === 'client' && styles.roleTextActive]}>
                    Client
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.roleButton,
                    formData.role === 'agent' && styles.roleButtonActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => updateField('role', 'agent')}
                >
                  <Building2
                    size={16}
                    color={formData.role === 'agent' ? colors.text.inverse : colors.text.secondary}
                    strokeWidth={2.2}
                  />
                  <Text style={[styles.roleText, formData.role === 'agent' && styles.roleTextActive]}>
                    Agent
                  </Text>
                </Pressable>
              </View>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Input
                    label="First name"
                    value={formData.firstName}
                    onChangeText={(v) => updateField('firstName', v)}
                    placeholder="John"
                    error={errors.firstName}
                    containerStyle={styles.inputContainer}
                    style={styles.input}
                  />
                </View>
                <View style={styles.halfInput}>
                  <Input
                    label="Last name"
                    value={formData.lastName}
                    onChangeText={(v) => updateField('lastName', v)}
                    placeholder="Doe"
                    error={errors.lastName}
                    containerStyle={styles.inputContainer}
                    style={styles.input}
                  />
                </View>
              </View>

              <Input
                label="Email"
                value={formData.email}
                onChangeText={(v) => updateField('email', v)}
                placeholder="john@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                containerStyle={styles.inputContainer}
                style={styles.input}
              />

              <CountryPhoneInput
                label={formData.role === 'agent' ? 'Mobile' : 'Phone'}
                value={formData.phone}
                onChangeText={(v) => updateField('phone', v)}
                selectedCountryCode={selectedCountryCode}
                onCountryChange={setSelectedCountryCode}
                error={errors.phone}
                required={formData.role === 'agent'}
                containerStyle={styles.inputContainer}
              />

              {formData.role === 'client' && (
                <View style={styles.fieldWrapper}>
                  <Text style={styles.fieldLabel}>
                    Client type <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.selectButton,
                      errors.clientType ? styles.selectButtonError : null,
                      pressed && styles.selectPressed,
                    ]}
                    onPress={() => {
                      setShowTypePicker((prev) => !prev);
                      if (errors.clientType) {
                        setErrors((prev) => ({ ...prev, clientType: '' }));
                      }
                    }}
                  >
                    <View style={styles.selectIcon}>
                      <UserRound size={15} color={colors.primary.default} strokeWidth={2.2} />
                    </View>
                    <Text
                      style={[
                        styles.selectText,
                        !formData.clientType && styles.selectPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {selectedTypeLabel}
                    </Text>
                    <Text style={styles.chevron}>⌄</Text>
                  </Pressable>
                  <FieldError message={errors.clientType} />
                  {showTypePicker && (
                    <View style={styles.pickerOptions}>
                      {CLIENT_TYPE_OPTIONS.map((opt) => (
                        <Pressable
                          key={opt.value}
                          style={({ pressed }) => [
                            styles.pickerOption,
                            formData.clientType === opt.value && styles.pickerOptionSelected,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => {
                            updateField('clientType', opt.value);
                            setShowTypePicker(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.pickerOptionText,
                              formData.clientType === opt.value && styles.pickerOptionTextSelected,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {formData.role === 'client' ? (
                <Input
                  label="Agent referral code"
                  value={formData.agentReferralCode}
                  onChangeText={(v) => updateField('agentReferralCode', v)}
                  placeholder="From your agent"
                  autoCapitalize="none"
                  error={errors.agentReferralCode}
                  required
                  containerStyle={styles.inputContainer}
                  style={styles.input}
                />
              ) : (
                <>
                  <Input
                    label="Brokerage invite code"
                    value={formData.brokerageInviteCode}
                    onChangeText={(v) => updateField('brokerageInviteCode', v)}
                    placeholder="From your broker"
                    autoCapitalize="none"
                    error={errors.brokerageInviteCode}
                    required
                    containerStyle={styles.inputContainer}
                    style={styles.input}
                  />

                  <View style={styles.fieldWrapper}>
                    <Text style={styles.fieldLabel}>
                      Date of birth <Text style={styles.requiredAsterisk}>*</Text>
                    </Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.selectButton,
                        errors.dateOfBirth ? styles.selectButtonError : null,
                        pressed && styles.selectPressed,
                      ]}
                      onPress={() => setDobPickerVisible(true)}
                    >
                      <View style={styles.selectIcon}>
                        <CalendarDays size={15} color={colors.primary.default} strokeWidth={2.2} />
                      </View>
                      <Text
                        style={[
                          styles.selectText,
                          !formData.dateOfBirth && styles.selectPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {formData.dateOfBirth
                          ? formatDOBDisplay(formData.dateOfBirth)
                          : 'Select date of birth'}
                      </Text>
                      <Text style={styles.chevron}>⌄</Text>
                    </Pressable>
                    <FieldError message={errors.dateOfBirth} />
                  </View>
                </>
              )}

              {submitError ? (
                <View
                  style={styles.submitError}
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                >
                  <View style={styles.submitErrorIcon}>
                    <AlertCircle size={18} color={colors.error.default} strokeWidth={2.4} />
                  </View>
                  <View style={styles.submitErrorCopy}>
                    <Text style={styles.submitErrorTitle}>Registration failed</Text>
                    <Text style={styles.submitErrorMessage}>{submitError}</Text>
                  </View>
                </View>
              ) : null}

              <Button
                title="Create account"
                onPress={handleRegister}
                loading={isLoading}
                style={styles.button}
                size="lg"
              />

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <Pressable
                  onPress={goToSignIn}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Text style={styles.loginLink}>Sign In</Text>
                </Pressable>
              </View>

              <View style={styles.securityNote}>
                <LockKeyhole size={14} color={colors.text.muted} strokeWidth={2.1} />
                <Text style={styles.securityNoteText}>
                  Password-free access protected by one-time codes
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* DOB Picker Modal */}
      <DOBPicker
        visible={dobPickerVisible}
        value={formData.dateOfBirth}
        onConfirm={handleDOBConfirm}
        onDismiss={() => setDobPickerVisible(false)}
      />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.screen,
  },
  screenBody: {
    flex: 1,
    backgroundColor: colors.background.screen,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing['3xl'],
  },
  shell: {
    width: '100%',
    maxWidth: 650,
    alignSelf: 'center',
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.background.surface,
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    ...shadows.card,
  },
  shellWide: {
    maxWidth: 980,
    minHeight: 620,
    flexDirection: 'row',
  },
  brandPanel: {
    backgroundColor: colors.primary.default,
    paddingHorizontal: spacing['4xl'],
    paddingVertical: spacing['4xl'],
    justifyContent: 'space-between',
  },
  brandPanelCompact: {
    paddingHorizontal: spacing['3xl'],
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['4xl'],
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logoFrame: {
    width: 64,
    height: 64,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.surface,
    borderWidth: border.width.thin,
    borderColor: colors.primary.light,
    ...shadows.sm,
  },
  logoImage: {
    width: 48,
    height: 48,
  },
  brandTextGroup: {
    flex: 1,
  },
  brandName: {
    color: colors.text.inverse,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extraBold,
  },
  brandKicker: {
    marginTop: 2,
    color: colors.primary.light,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
  },
  heroCopy: {
    marginTop: spacing['7xl'],
    maxWidth: 360,
  },
  heroCopyCompact: {
    marginTop: spacing['3xl'],
  },
  eyebrowPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primary.light,
  },
  eyebrowText: {
    color: colors.primary.default,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  heroTitle: {
    marginTop: spacing.lg,
    color: colors.text.inverse,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: fontWeight.extraBold,
  },
  heroTitleCompact: {
    fontSize: 30,
    lineHeight: 36,
  },
  heroBody: {
    marginTop: spacing.lg,
    color: colors.primary.light,
    fontSize: fontSize.md,
    lineHeight: 24,
    fontWeight: fontWeight.medium,
  },
  trustList: {
    gap: spacing.md,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trustIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success.default,
  },
  trustText: {
    flex: 1,
    color: colors.text.inverse,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
  },
  formPanel: {
    backgroundColor: colors.background.surface,
  },
  formPanelWide: {
    flex: 1,
  },
  formContent: {
    padding: spacing['4xl'],
  },
  formHeader: {
    marginBottom: spacing['2xl'],
  },
  secureLabel: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  secureLabelText: {
    color: colors.primary.mid,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  formTitle: {
    color: colors.text.primary,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: fontWeight.extraBold,
  },
  formSubtitle: {
    marginTop: spacing.sm,
    color: colors.text.secondary,
    fontSize: fontSize.md,
    lineHeight: 23,
    fontWeight: fontWeight.medium,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.xs,
    borderRadius: radius.card,
    backgroundColor: colors.background.subtle,
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
  },
  roleButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.item,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  roleButtonActive: {
    backgroundColor: colors.primary.default,
    ...shadows.sm,
  },
  roleText: {
    color: colors.text.secondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  roleTextActive: {
    color: colors.text.inverse,
  },
  pressed: {
    opacity: 0.72,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  input: {
    borderRadius: radius.item,
    borderColor: colors.border.default,
    backgroundColor: colors.background.subtle,
    minHeight: 50,
  },
  button: {
    marginTop: spacing.xs,
    borderRadius: radius.item,
    ...shadows.md,
  },
  submitError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error.light,
    borderRadius: radius.item,
    backgroundColor: colors.error.light,
  },
  submitErrorIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.surface,
  },
  submitErrorCopy: {
    flex: 1,
  },
  submitErrorTitle: {
    color: colors.error.default,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  submitErrorMessage: {
    marginTop: 2,
    color: colors.error.default,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
  },
  loginText: {
    color: colors.text.secondary,
    fontSize: fontSize.md,
  },
  loginLink: {
    color: colors.primary.default,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  securityNote: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: border.width.thin,
    borderTopColor: colors.border.default,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  securityNoteText: {
    color: colors.text.muted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },

  fieldWrapper: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.text.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  requiredAsterisk: {
    color: colors.error.default,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 50,
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    borderRadius: radius.item,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.subtle,
  },
  selectButtonError: {
    borderColor: colors.error.default,
    backgroundColor: colors.error.light,
  },
  selectPressed: {
    backgroundColor: colors.primary.hover,
  },
  selectIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.item,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.hover,
  },
  selectText: {
    flex: 1,
    color: colors.text.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semiBold,
  },
  selectPlaceholder: {
    color: colors.text.muted,
    fontWeight: fontWeight.medium,
  },
  chevron: {
    fontSize: 20,
    color: colors.text.muted,
    lineHeight: 22,
  },
  fieldErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.chipSm,
    backgroundColor: colors.error.light,
  },
  fieldErrorIcon: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.surface,
  },
  fieldErrorText: {
    flex: 1,
    color: colors.error.default,
    fontSize: fontSize.sm,
    lineHeight: 18,
    fontWeight: fontWeight.semiBold,
  },
  pickerOptions: {
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    borderRadius: radius.item,
    overflow: 'hidden',
    marginTop: spacing.sm,
    backgroundColor: colors.background.surface,
  },
  pickerOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.surface,
    borderBottomWidth: border.width.thin,
    borderBottomColor: colors.border.default,
  },
  pickerOptionSelected: {
    backgroundColor: colors.primary.hover,
  },
  pickerOptionText: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    fontWeight: fontWeight.medium,
  },
  pickerOptionTextSelected: {
    color: colors.primary.default,
    fontWeight: fontWeight.bold,
  },
});
