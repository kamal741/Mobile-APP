import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Save, RotateCcw } from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import NavbarBroker from '../components/NavbarBroker';
import { BrokerageFooter } from '../components/BrokerageFooter';
import { CountryPhoneInput, normalizePhoneForCountry } from '../../../components/CountryPhoneInput';
import {
  BrokerBranding,
  UpdateBrokerSettingsPayload,
  useBrokerSession,
  useBrokerSettings,
  useUpdateBrokerSettings,
} from '../../../lib/brokerApi';
import { getApiErrorMessage } from '../../../lib/apiErrors';
import {
  findCountryByCode,
  useLocationMetadata,
  type CountryMetadata,
} from '../../../lib/locationMetadataApi';
import { isValidE164 } from '../../../lib/phoneE164';
import { colors, spacing } from '../styles/shared.styles';

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function splitPhoneForCountry(
  raw: string | null | undefined,
  countries: CountryMetadata[] | undefined,
  preferredCountryCode = 'CA',
) {
  const trimmed = raw?.trim() ?? '';
  const fallbackCountryCode = preferredCountryCode.trim().toUpperCase() || 'CA';
  if (!trimmed) {
    return { countryCode: fallbackCountryCode, phone: '' };
  }

  if (!trimmed.startsWith('+')) {
    return { countryCode: fallbackCountryCode, phone: trimmed };
  }

  const preferredCountry = findCountryByCode(countries, fallbackCountryCode);
  if (preferredCountry?.phoneCode && trimmed.startsWith(preferredCountry.phoneCode)) {
    return {
      countryCode: preferredCountry.isoCode,
      phone: trimmed.slice(preferredCountry.phoneCode.length),
    };
  }

  const matchedCountry = [...(countries ?? [])]
    .filter((country) => country.phoneCode && trimmed.startsWith(country.phoneCode))
    .sort((a, b) => digitsOnly(b.phoneCode ?? '').length - digitsOnly(a.phoneCode ?? '').length)[0];

  if (!matchedCountry?.phoneCode) {
    return { countryCode: fallbackCountryCode, phone: trimmed };
  }

  return {
    countryCode: matchedCountry.isoCode,
    phone: trimmed.slice(matchedCountry.phoneCode.length),
  };
}

export function BrokerProfileScreen() {
  const navigation = useNavigation<any>();

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ headerShown: false });
    }, [navigation]),
  );

  const { data: session, isLoading: sessionLoading } = useBrokerSession();
  const { data: settings, isLoading: settingsLoading } = useBrokerSettings();
  const { data: locationMetadata } = useLocationMetadata();
  const countries = locationMetadata?.countries;
  const { mutate: updateSettings, isPending: isSaving } =
    useUpdateBrokerSettings();

  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [selectedPhoneCountryCode, setSelectedPhoneCountryCode] = useState('CA');
  const [website, setWebsite] = useState('');
  const selectedPhoneCountry = findCountryByCode(countries, selectedPhoneCountryCode);
  const selectedPhoneCode = selectedPhoneCountry?.phoneCode || '+1';
  const normalizedContactPhone = normalizePhoneForCountry(contactPhone, selectedPhoneCode);

  const resetForm = useCallback(() => {
    setName(settings?.name ?? '');
    setContactEmail(settings?.contactEmail ?? '');
    const parsedPhone = splitPhoneForCountry(settings?.contactPhone, countries, 'CA');
    setSelectedPhoneCountryCode(parsedPhone.countryCode);
    setContactPhone(parsedPhone.phone);
    setWebsite(settings?.website ?? '');
  }, [settings, countries]);

  useEffect(() => {
    resetForm();
  }, [resetForm]);

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      globalThis.alert(message);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      showMessage('Validation', 'Brokerage name is required.');
      return;
    }

    const contactPhoneE164 = normalizedContactPhone.trim() || null;
    if (contactPhoneE164 && !isValidE164(contactPhoneE164)) {
      showMessage('Validation', 'Enter a valid mobile number.');
      return;
    }

    const existingBranding = (settings?.settings ?? {}) as Partial<BrokerBranding>;
    const body: UpdateBrokerSettingsPayload = {
      name: name.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhoneE164,
      website: website.trim() || null,
      branding: {
        ...existingBranding,
      },
    };

    updateSettings(body, {
      onSuccess: () => showMessage('Success', 'Profile updated successfully.'),
      onError: (error) => {
        showMessage(
          'Error',
          getApiErrorMessage(error, 'Failed to update profile.'),
        );
      },
    });
  };

  const isPageLoading = sessionLoading || settingsLoading;

  return (
    <View style={styles.container}>
      <NavbarBroker title="Profile" showBack />

      {isPageLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formCard}>
            <View style={styles.header}>
              <Text style={styles.title}>Profile Details</Text>
              <Text style={styles.hint}>
                Update the brokerage contact information shown to your team and clients.
              </Text>
            </View>

            <ProfileInput
              label="Brokerage Name"
              value={name}
              onChangeText={setName}
              placeholder="Brokerage name"
            />
            <ProfileInput
              label="Contact Email"
              value={contactEmail}
              onChangeText={setContactEmail}
              placeholder="contact@brokerage.com"
              keyboardType="email-address"
            />
            <View style={styles.phonePickerRow}>
              <CountryPhoneInput
                value={contactPhone}
                onChangeText={setContactPhone}
                selectedCountryCode={selectedPhoneCountryCode}
                onCountryChange={setSelectedPhoneCountryCode}
                editable={!isSaving}
              />
            </View>
            <ProfileInput
              label="Website"
              value={website}
              onChangeText={setWebsite}
              placeholder="https://brokerage.com"
              keyboardType="url"
            />

            <View style={styles.readOnlyRow}>
              <Text style={styles.label}>Login Email</Text>
              <Text style={styles.readOnlyValue} numberOfLines={2}>
                {session?.email || 'Not set'}
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={resetForm}
                disabled={isSaving}
                activeOpacity={0.75}
              >
                <RotateCcw size={16} color={colors.textBody} />
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, isSaving && styles.disabledBtn]}
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.textInverted} />
                ) : (
                  <>
                    <Save size={16} color={colors.textInverted} />
                    <Text style={styles.saveText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      <BrokerageFooter active="profile" />
    </View>
  );
}

function ProfileInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
}: Readonly<{
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url';
}>) {
  return (
    <View style={styles.inputRow}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 96,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 17,
  },
  inputRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
  },
  phonePickerRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.bgPage,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  readOnlyRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
  },
  readOnlyValue: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    backgroundColor: colors.bgMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  resetBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  resetText: {
    color: colors.textBody,
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 2,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  disabledBtn: { opacity: 0.6 },
  saveText: {
    color: colors.textInverted,
    fontSize: 14,
    fontWeight: '800',
  },
});
