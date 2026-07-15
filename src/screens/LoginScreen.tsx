import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AlertCircle, ArrowRight, Check, LockKeyhole, Route, ShieldCheck } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CountryPhoneInput, normalizePhoneForCountry } from '../components/CountryPhoneInput';
import { Input } from '../components/Input';
import { getAuthErrorMessage, useAuth } from '../contexts/AuthContext';
import { findCountryByCode, useCountries } from '../lib/locationMetadataApi';
import { isValidE164 } from '../lib/phoneE164';
import type { RootStackParamList } from '../navigation/types';
import { border, colors, fontSize, fontWeight, radius, shadows, spacing } from '@/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type LoginMode = 'email' | 'phone';

const BRAND_LOGO = require('../images/showing-trails-logo.png');
const EMAIL_PATTERN = /\S+@\S+\.\S+/;

function FieldError({ message }: Readonly<{ message?: string }>) {
  if (!message) return null;

  return (
    <View style={styles.fieldError}>
      <View style={styles.fieldErrorIcon}>
        <AlertCircle size={14} color={colors.error.default} strokeWidth={2.4} />
      </View>
      <Text style={styles.fieldErrorText}>{message}</Text>
    </View>
  );
}

export function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { sendPortalOtp, verifyPortalLogin } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = width >= 820;
  const { data: countries } = useCountries();

  const [loginMode, setLoginMode] = useState<LoginMode>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState('CA');
  const [authIdentifier, setAuthIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; code?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);
  const [userNotFound, setUserNotFound] = useState(false);
  const selectedCountry = findCountryByCode(countries, selectedCountryCode);
  const selectedPhoneCode = selectedCountry?.phoneCode || '+1';
  const phoneExample = selectedCountry?.phoneExample || '+14165551234';
  const normalizedIdentifier =
    loginMode === 'email'
      ? email.trim()
      : normalizePhoneForCountry(phone, selectedPhoneCode);
  const displayIdentifier = authIdentifier || normalizedIdentifier;

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const startCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(60);
    countdownRef.current = setInterval(() => {
      setCountdown((previous) => {
        if (previous <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
  };

  const validateIdentifier = () => {
    const newErrors: { identifier?: string; code?: string } = {};
    const t = normalizedIdentifier;
    if (!t) {
      newErrors.identifier = loginMode === 'email' ? 'Email is required' : 'Phone number is required';
    } else if (loginMode === 'email' && !EMAIL_PATTERN.test(t)) {
      newErrors.identifier = 'Enter a valid email address';
    } else if (loginMode === 'phone' && !isValidE164(t)) {
      newErrors.identifier = `Enter a valid phone number (${phoneExample})`;
    }
    setErrors((e) => ({ ...e, ...newErrors, ...(newErrors.identifier ? { code: undefined } : {}) }));
    return !newErrors.identifier;
  };

  const validateCode = () => {
    const newErrors: { identifier?: string; code?: string } = {};
    if (!code.trim()) newErrors.code = 'Enter the code we sent you';
    setErrors((e) => ({ ...e, ...newErrors }));
    return !newErrors.code;
  };

  const is404 = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') return false;
    const e = error as Record<string, unknown>;
    if (e.status === 404) return true;
    if ((e.response as Record<string, unknown>)?.status === 404) return true;
    const msg = String(e.message ?? '').toLowerCase();
    return msg.includes('404') || msg.includes('not found');
  };

  const handleSendCode = async () => {
    if (!validateIdentifier()) return;
    const identifier = normalizedIdentifier;
    setAuthIdentifier(identifier);
    setSubmitError(null);
    setOtpNotice(null);
    setUserNotFound(false);
    setIsLoading(true);
    try {
      await sendPortalOtp(identifier);
      setOtpSent(true);
      startCountdown();
      setOtpNotice('Code sent. Check your email or SMS for your sign-in code.');
    } catch (error: unknown) {
      if (is404(error)) {
        setUserNotFound(true);
      } else {
        Alert.alert('Could not send code', getAuthErrorMessage(error));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0 || isLoading) return;
    const identifier = authIdentifier || normalizedIdentifier;
    setCode('');
    setSubmitError(null);
    setOtpNotice(null);
    setErrors({});
    setIsLoading(true);
    try {
      await sendPortalOtp(identifier);
      startCountdown();
      setOtpNotice('A new code has been sent to your email or phone.');
    } catch (error: unknown) {
      Alert.alert('Could not resend code', getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!validateIdentifier() || !validateCode()) return;
    const identifier = authIdentifier || normalizedIdentifier;
    setSubmitError(null);
    setIsLoading(true);
    try {
      await verifyPortalLogin(identifier, code);
      // Navigation is handled by RootNavigator via justLoggedIn.
    } catch (error: unknown) {
      const message = getAuthErrorMessage(error);
      const fallback = 'Invalid or expired code. Request a new one and try again.';
      setSubmitError(message || fallback);
      Alert.alert('Sign-in failed', message || fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeIdentifier = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setOtpSent(false);
    setCountdown(0);
    setCode('');
    setAuthIdentifier('');
    setSubmitError(null);
    setOtpNotice(null);
    setErrors({});
  };

  const handleModeChange = (mode: LoginMode) => {
    if (mode === loginMode || otpSent || isLoading) return;
    setLoginMode(mode);
    setAuthIdentifier('');
    setCode('');
    setSubmitError(null);
    setOtpNotice(null);
    setUserNotFound(false);
    setErrors({});
  };

  const primaryAction = otpSent ? handleVerify : handleSendCode;

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
                <Text style={styles.eyebrowText}>Showing workflow</Text>
              </View>
              <Text style={[styles.heroTitle, !isWide && styles.heroTitleCompact]}>
                Every showing. One clear trail.
              </Text>
              {isWide && (
                <Text style={styles.heroBody}>
                  Plan tours, keep clients aligned, and move from interest to offer with
                  every detail in one secure workspace.
                </Text>
              )}
            </View>

            {isWide && (
              <View style={styles.trustList}>
                <View style={styles.trustItem}>
                  <View style={styles.trustIcon}>
                    <Check size={14} color={colors.text.inverse} strokeWidth={3} />
                  </View>
                  <Text style={styles.trustText}>Tours and routes in one place</Text>
                </View>
                <View style={styles.trustItem}>
                  <View style={styles.trustIcon}>
                    <Check size={14} color={colors.text.inverse} strokeWidth={3} />
                  </View>
                  <Text style={styles.trustText}>Secure access for every role</Text>
                </View>
              </View>
            )}
          </View>

          <View style={[styles.formPanel, isWide && styles.formPanelWide]}>
            <View style={styles.formContent}>
              <View style={styles.formHeader}>
                <View style={styles.secureLabel}>
                  <ShieldCheck size={15} color={colors.primary.mid} strokeWidth={2.3} />
                  <Text style={styles.secureLabelText}>Secure portal</Text>
                </View>
                <Text style={styles.formTitle}>
                  {otpSent ? 'Check your messages' : 'Welcome back'}
                </Text>
                <Text style={styles.formSubtitle}>
                  {otpSent
                    ? `We sent a one-time code to ${displayIdentifier}.`
                    : 'Use your email or mobile number to access your workspace.'}
                </Text>
              </View>

              <View style={styles.progressRow}>
                <View style={styles.progressStep}>
                  <View style={[styles.stepCircle, styles.stepCircleActive]}>
                    {otpSent ? (
                      <Check size={13} color={colors.text.inverse} strokeWidth={3} />
                    ) : (
                      <Text style={styles.stepNumberActive}>1</Text>
                    )}
                  </View>
                  <Text style={styles.stepLabelActive}>Details</Text>
                </View>
                <View style={[styles.stepConnector, otpSent && styles.stepConnectorActive]} />
                <View style={styles.progressStep}>
                  <View style={[styles.stepCircle, otpSent && styles.stepCircleActive]}>
                    <Text style={otpSent ? styles.stepNumberActive : styles.stepNumber}>2</Text>
                  </View>
                  <Text style={otpSent ? styles.stepLabelActive : styles.stepLabel}>Verify</Text>
                </View>
              </View>

              <View style={styles.modeSelector}>
                {(['email', 'phone'] as LoginMode[]).map((mode) => {
                  const active = loginMode === mode;
                  return (
                    <Pressable
                      key={mode}
                      style={({ pressed }) => [
                        styles.modeButton,
                        active && styles.modeButtonActive,
                        pressed && !active && !otpSent && !isLoading && styles.actionPressed,
                        (otpSent || isLoading) && styles.modeButtonLocked,
                      ]}
                      onPress={() => handleModeChange(mode)}
                      disabled={otpSent || isLoading}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active, disabled: otpSent || isLoading }}
                    >
                      <Text style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>
                        {mode === 'email' ? 'Email' : 'Phone'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {loginMode === 'email' ? (
                <>
                  <Input
                    label="Email"
                    value={email}
                    editable={!otpSent && !isLoading}
                    onChangeText={(v) => {
                      setEmail(v);
                      setOtpSent(false);
                      setAuthIdentifier('');
                      setOtpNotice(null);
                      setUserNotFound(false);
                      if (errors.identifier) setErrors((e) => ({ ...e, identifier: undefined }));
                    }}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType={otpSent ? 'next' : 'send'}
                    onSubmitEditing={otpSent ? undefined : handleSendCode}
                    containerStyle={styles.inputContainer}
                    style={[
                      styles.input,
                      errors.identifier && styles.inputError,
                      otpSent && styles.inputLocked,
                    ]}
                  />
                  <FieldError message={errors.identifier} />
                </>
              ) : (
                <CountryPhoneInput
                  value={phone}
                  onChangeText={(v) => {
                    setPhone(v);
                    setOtpSent(false);
                    setAuthIdentifier('');
                    setOtpNotice(null);
                    setUserNotFound(false);
                    if (errors.identifier) setErrors((e) => ({ ...e, identifier: undefined }));
                  }}
                  selectedCountryCode={selectedCountryCode}
                  onCountryChange={(countryCode) => {
                    setSelectedCountryCode(countryCode);
                    setAuthIdentifier('');
                    setOtpNotice(null);
                    setUserNotFound(false);
                    if (errors.identifier) setErrors((e) => ({ ...e, identifier: undefined }));
                  }}
                  editable={!otpSent && !isLoading}
                  error={errors.identifier}
                  returnKeyType={otpSent ? 'next' : 'send'}
                  onSubmitEditing={otpSent ? undefined : handleSendCode}
                  containerStyle={styles.inputContainer}
                  style={styles.phoneInput}
                />
              )}

              {userNotFound && (
                <View style={styles.notFoundBanner}>
                  <View style={styles.notFoundIcon}>
                    <LockKeyhole size={15} color={colors.error.default} strokeWidth={2.2} />
                  </View>
                  <View style={styles.notFoundTextGroup}>
                    <Text style={styles.notFoundTitle}>We could not find that account</Text>
                    <Text style={styles.notFoundBody}>
                      Check your details or{' '}
                      <Text
                        style={styles.inlineErrorLink}
                        onPress={() => navigation.navigate('Register')}
                      >
                        create a new account
                      </Text>
                      .
                    </Text>
                  </View>
                </View>
              )}

              {otpSent && otpNotice && (
                <View style={styles.otpNoticeBanner}>
                  <View style={styles.otpNoticeIcon}>
                    <Check size={14} color={colors.success.default} strokeWidth={3} />
                  </View>
                  <Text style={styles.otpNoticeText}>{otpNotice}</Text>
                </View>
              )}

              {otpSent && (
                <>
                  <Input
                    label="One-time code"
                    value={code}
                    onChangeText={(v) => {
                      setCode(v.replace(/\D/g, '').slice(0, 6));
                      setSubmitError(null);
                      if (errors.code) setErrors((e) => ({ ...e, code: undefined }));
                    }}
                    placeholder="Enter 6-digit code"
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    maxLength={6}
                    returnKeyType="done"
                    onSubmitEditing={handleVerify}
                    containerStyle={styles.inputContainer}
                    style={[
                      styles.input,
                      styles.codeInput,
                      errors.code && styles.inputError,
                    ]}
                  />
                  <FieldError message={errors.code} />

                  {submitError && (
                    <View style={styles.submitErrorBanner}>
                      <View style={styles.submitErrorIcon}>
                        <AlertCircle size={15} color={colors.error.default} strokeWidth={2.4} />
                      </View>
                      <View style={styles.submitErrorTextGroup}>
                        <Text style={styles.submitErrorTitle}>Sign-in failed</Text>
                        <Text style={styles.submitError}>{submitError}</Text>
                      </View>
                    </View>
                  )}
                </>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && !isLoading && styles.primaryButtonPressed,
                  isLoading && styles.primaryButtonDisabled,
                ]}
                onPress={primaryAction}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityState={{ disabled: isLoading, busy: isLoading }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>
                      {otpSent ? 'Verify & sign in' : 'Continue securely'}
                    </Text>
                    <ArrowRight size={18} color={colors.text.inverse} strokeWidth={2.6} />
                  </>
                )}
              </Pressable>

              {otpSent && (
                <View style={styles.otpActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.secondaryAction,
                      pressed && countdown === 0 && !isLoading && styles.actionPressed,
                    ]}
                    onPress={handleResendCode}
                    disabled={countdown > 0 || isLoading}
                    hitSlop={8}
                  >
                    <Text
                      style={[
                        styles.secondaryActionText,
                        countdown > 0 && styles.secondaryActionTextDisabled,
                      ]}
                    >
                      {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                    </Text>
                  </Pressable>
                  <View style={styles.actionDivider} />
                  <Pressable
                    style={({ pressed }) => [styles.secondaryAction, pressed && styles.actionPressed]}
                    onPress={handleChangeIdentifier}
                    hitSlop={8}
                  >
                    <Text style={styles.secondaryActionText}>Change details</Text>
                  </Pressable>
                </View>
              )}

              <View style={styles.registerRow}>
                <Text style={styles.registerText}>New to Showing Trail?</Text>
                <Pressable
                  onPress={() => navigation.navigate('Register')}
                  hitSlop={10}
                  style={({ pressed }) => pressed && styles.actionPressed}
                >
                  <Text style={styles.registerLink}>Create an account</Text>
                </Pressable>
              </View>

              <View style={styles.securityNote}>
                <LockKeyhole size={13} color={colors.text.secondary} strokeWidth={2.2} />
                <Text style={styles.securityNoteText}>
                  Password-free sign in protected by a one-time code
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
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
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  shell: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: radius.modal,
    backgroundColor: colors.background.surface,
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    ...shadows.card,
  },
  shellWide: {
    minHeight: 620,
    flexDirection: 'row',
  },
  brandPanel: {
    width: '44%',
    paddingHorizontal: spacing['9xl'],
    paddingVertical: spacing['9xl'],
    justifyContent: 'space-between',
    backgroundColor: colors.background.selected,
  },
  brandPanelCompact: {
    width: '100%',
    paddingHorizontal: spacing['4xl'],
    paddingTop: spacing['4xl'],
    paddingBottom: spacing['4xl'],
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoFrame: {
    width: 64,
    height: 64,
    marginRight: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: border.width.thin,
    borderColor: colors.primary.light,
    borderRadius: radius.card + 3,
    backgroundColor: colors.background.surface,
  },
  logoImage: {
    width: 52,
    height: 52,
  },
  brandTextGroup: {
    flex: 1,
  },
  brandName: {
    color: colors.text.primary,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.extraBold,
  },
  brandKicker: {
    marginTop: spacing.xs,
    color: colors.text.secondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
  },
  heroCopy: {
    marginVertical: spacing['9xl'],
  },
  heroCopyCompact: {
    marginTop: spacing['6xl'],
    marginBottom: 0,
  },
  eyebrowPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primary.light,
  },
  eyebrowText: {
    color: colors.primary.default,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extraBold,
  },
  heroTitle: {
    marginTop: spacing['5xl'],
    color: colors.text.primary,
    fontSize: 36,
    lineHeight: 43,
    fontWeight: fontWeight.extraBold,
  },
  heroTitleCompact: {
    marginTop: spacing['2xl'],
    fontSize: 24,
    lineHeight: 31,
  },
  heroBody: {
    maxWidth: 350,
    marginTop: spacing['4xl'],
    color: colors.text.secondary,
    fontSize: fontSize.lg,
    lineHeight: 24,
  },
  trustList: {
    gap: spacing.xl,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustIcon: {
    width: spacing['6xl'],
    height: spacing['6xl'],
    marginRight: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.primary.default,
  },
  trustText: {
    color: colors.text.secondary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semiBold,
  },
  formPanel: {
    backgroundColor: colors.background.surface,
  },
  formPanelWide: {
    width: '56%',
    justifyContent: 'center',
  },
  formContent: {
    width: '100%',
    maxWidth: 470,
    alignSelf: 'center',
    paddingHorizontal: spacing['6xl'],
    paddingVertical: spacing['8xl'],
  },
  formHeader: {
    marginBottom: spacing['6xl'],
  },
  secureLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  secureLabelText: {
    color: colors.primary.mid,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extraBold,
  },
  formTitle: {
    color: colors.text.primary,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: fontWeight.extraBold,
  },
  formSubtitle: {
    marginTop: spacing.md,
    color: colors.text.secondary,
    fontSize: fontSize.md,
    lineHeight: 21,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing['6xl'],
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepCircle: {
    width: spacing['6xl'],
    height: spacing['6xl'],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    borderRadius: radius.full,
    backgroundColor: colors.background.screen,
  },
  stepCircleActive: {
    borderColor: colors.primary.default,
    backgroundColor: colors.primary.default,
  },
  stepNumber: {
    color: colors.text.muted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  stepNumberActive: {
    color: colors.text.inverse,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extraBold,
  },
  stepLabel: {
    color: colors.text.muted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
  },
  stepLabelActive: {
    color: colors.text.dark,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  stepConnector: {
    flex: 1,
    minWidth: spacing['6xl'],
    height: border.width.thin,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.border.default,
  },
  stepConnectorActive: {
    backgroundColor: colors.primary.light,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing['3xl'],
    padding: spacing.xs,
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    borderRadius: radius.card,
    backgroundColor: colors.background.screen,
  },
  modeButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.item,
  },
  modeButtonActive: {
    backgroundColor: colors.primary.default,
    ...shadows.sm,
  },
  modeButtonLocked: {
    opacity: 0.85,
  },
  modeButtonText: {
    color: colors.text.secondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  modeButtonTextActive: {
    color: colors.text.inverse,
    fontWeight: fontWeight.extraBold,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: spacing['3xl'],
    borderColor: colors.border.default,
    borderRadius: radius.card,
    backgroundColor: colors.background.screen,
    fontSize: fontSize.xl,
  },
  inputError: {
    borderColor: colors.error.default,
    backgroundColor: '#fffafa',
  },
  inputLocked: {
    color: colors.text.secondary,
    backgroundColor: colors.background.subtle,
  },
  codeInput: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  phoneInput: {
    fontSize: fontSize.xl,
  },
  primaryButton: {
    minHeight: 54,
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.primary.default,
    ...shadows.sm,
  },
  primaryButtonPressed: {
    transform: [{ translateY: 1 }],
    backgroundColor: colors.palette.blue900,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extraBold,
  },
  otpActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing['4xl'],
  },
  secondaryAction: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  secondaryActionText: {
    color: colors.primary.mid,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  secondaryActionTextDisabled: {
    color: colors.text.muted,
    fontWeight: fontWeight.semiBold,
  },
  actionDivider: {
    width: border.width.thin,
    height: spacing['2xl'],
    marginHorizontal: spacing.xs,
    backgroundColor: colors.border.default,
  },
  actionPressed: {
    opacity: 0.6,
  },
  registerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing['6xl'],
    paddingTop: spacing['3xl'],
    borderTopWidth: border.width.thin,
    borderTopColor: colors.border.light,
  },
  registerText: {
    color: colors.text.secondary,
    fontSize: fontSize.base,
  },
  registerLink: {
    color: colors.primary.mid,
    fontSize: fontSize.base,
    fontWeight: fontWeight.extraBold,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing['3xl'],
  },
  securityNoteText: {
    color: colors.text.muted,
    fontSize: fontSize.xs,
  },
  fieldError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: -spacing.xs,
    marginBottom: spacing['3xl'],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderWidth: border.width.thin,
    borderColor: '#fecaca',
    borderRadius: radius.item,
    backgroundColor: '#fff7f7',
  },
  fieldErrorIcon: {
    width: spacing['6xl'],
    height: spacing['6xl'],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.error.light,
  },
  fieldErrorText: {
    flex: 1,
    color: '#b91c1c',
    fontSize: fontSize.sm,
    lineHeight: 17,
    fontWeight: fontWeight.semiBold,
  },
  notFoundBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
    marginBottom: spacing['3xl'],
    padding: spacing.xl,
    borderWidth: border.width.thin,
    borderColor: colors.error.light,
    borderRadius: radius.card,
    backgroundColor: '#fff7f7',
  },
  notFoundIcon: {
    width: spacing['7xl'],
    height: spacing['7xl'],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.iconBtn,
    backgroundColor: colors.error.light,
  },
  notFoundTextGroup: {
    flex: 1,
  },
  notFoundTitle: {
    color: colors.error.default,
    fontSize: fontSize.base,
    fontWeight: fontWeight.extraBold,
  },
  notFoundBody: {
    marginTop: spacing.xs,
    color: colors.text.body,
    fontSize: fontSize.sm,
    lineHeight: 17,
  },
  otpNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing['3xl'],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderWidth: border.width.thin,
    borderColor: colors.success.border,
    borderRadius: radius.item,
    backgroundColor: colors.success.surface,
  },
  otpNoticeIcon: {
    width: spacing['6xl'],
    height: spacing['6xl'],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.success.light,
  },
  otpNoticeText: {
    flex: 1,
    color: colors.success.default,
    fontSize: fontSize.sm,
    lineHeight: 17,
    fontWeight: fontWeight.bold,
  },
  inlineErrorLink: {
    color: colors.primary.default,
    fontWeight: fontWeight.extraBold,
    textDecorationLine: 'underline',
  },
  submitErrorBanner: {
    marginTop: -spacing.xs,
    marginBottom: spacing['3xl'],
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderWidth: border.width.thin,
    borderColor: '#fecaca',
    borderRadius: radius.item,
    backgroundColor: '#fff7f7',
  },
  submitErrorIcon: {
    width: spacing['6xl'],
    height: spacing['6xl'],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.error.light,
  },
  submitErrorTextGroup: {
    flex: 1,
  },
  submitErrorTitle: {
    color: colors.error.default,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
    marginBottom: spacing.xs,
  },
  submitError: {
    color: '#991b1b',
    fontSize: fontSize.sm,
    lineHeight: 17,
  },
});
