import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';

import {
  findCountryByCode,
  useCountries,
  type CountryMetadata,
} from '../lib/locationMetadataApi';
import { border, colors, fontSize, fontWeight, radius, shadows, spacing } from '@/theme';

const FALLBACK_COUNTRIES: CountryMetadata[] = [
  {
    id: 1,
    name: 'Canada',
    isoCode: 'CA',
    phoneCode: '+1',
    phoneExample: '+14165551234',
  },
];

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizePhoneForCountry(raw: string, phoneCode: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('+')) {
    return trimmed;
  }

  const localDigits = digitsOnly(trimmed);
  if (!localDigits) {
    return trimmed;
  }

  const phoneCodeDigits = digitsOnly(phoneCode);
  if (phoneCodeDigits && localDigits.startsWith(phoneCodeDigits)) {
    return `+${localDigits}`;
  }

  return `${phoneCode}${localDigits}`;
}

interface CountryPhoneInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  label?: string;
  countryLabel?: string;
  value: string;
  onChangeText: (value: string) => void;
  selectedCountryCode?: string;
  onCountryChange?: (countryCode: string) => void;
  error?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
}

export function CountryPhoneInput({
  label = 'Phone',
  countryLabel = 'Country',
  value,
  onChangeText,
  selectedCountryCode = 'CA',
  onCountryChange,
  error,
  required,
  containerStyle,
  editable = true,
  style,
  ...inputProps
}: CountryPhoneInputProps) {
  const { data: countryOptions } = useCountries();
  const [pickerOpen, setPickerOpen] = useState(false);
  const countries = countryOptions?.length ? countryOptions : FALLBACK_COUNTRIES;
  const selectedCountry = findCountryByCode(countries, selectedCountryCode) ?? FALLBACK_COUNTRIES[0];
  const selectedPhoneCode = selectedCountry.phoneCode || '+1';
  const phoneExample = selectedCountry.phoneExample || `${selectedPhoneCode}5551234567`;

  const selectedLabel = useMemo(
    () => `${selectedCountry.name} (${selectedCountry.isoCode})`,
    [selectedCountry.isoCode, selectedCountry.name],
  );

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{countryLabel}</Text>

      <Pressable
        style={({ pressed }) => [
          styles.countrySelect,
          pickerOpen && styles.countrySelectOpen,
          !editable && styles.disabled,
          pressed && editable && styles.pressed,
        ]}
        onPress={() => editable && setPickerOpen((current) => !current)}
        disabled={!editable}
        accessibilityRole="button"
      >
        <Text style={styles.countryValue}>{selectedLabel}</Text>
        <ChevronDown
          size={18}
          color={colors.text.secondary}
          strokeWidth={2.4}
          style={pickerOpen ? styles.chevronOpen : undefined}
        />
      </Pressable>

      {pickerOpen && (
        <View style={styles.dropdown}>
          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            style={styles.dropdownScroll}
          >
            {countries.map((country) => {
              const active = country.isoCode === selectedCountry.isoCode;
              return (
                <Pressable
                  key={country.isoCode}
                  style={({ pressed }) => [
                    styles.option,
                    active && styles.optionActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    onCountryChange?.(country.isoCode);
                    setPickerOpen(false);
                  }}
                >
                  <View style={styles.optionTextGroup}>
                    <Text style={[styles.optionName, active && styles.optionNameActive]}>
                      {country.name} ({country.isoCode})
                    </Text>
                  </View>
                  {active && <Check size={16} color={colors.primary.default} strokeWidth={2.8} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {label ? (
        <Text style={[styles.label, styles.phoneLabel]}>
          {label}
          {required ? ' *' : ''}
        </Text>
      ) : null}

      <View style={[styles.phoneRow, error && styles.phoneRowError, !editable && styles.disabled]}>
        <Text style={styles.phonePrefix}>{selectedPhoneCode}</Text>
        <View style={styles.prefixDivider} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          placeholder={phoneExample.replace(selectedPhoneCode, '').trim() || phoneExample}
          placeholderTextColor={colors.text.muted}
          keyboardType="phone-pad"
          autoCapitalize="none"
          style={[styles.phoneInput, style]}
          {...inputProps}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.sm,
    color: colors.text.dark,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  countrySelect: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing.md,
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    borderRadius: radius.card,
    backgroundColor: colors.background.screen,
  },
  countrySelectOpen: {
    borderColor: colors.primary.light,
    backgroundColor: colors.background.selected,
  },
  countryValue: {
    flex: 1,
    marginRight: spacing.lg,
    color: colors.text.primary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  dropdown: {
    marginTop: spacing.sm,
    overflow: 'hidden',
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    borderRadius: radius.card,
    backgroundColor: colors.background.surface,
    ...shadows.sm,
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  option: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing.md,
    borderBottomWidth: border.width.thin,
    borderBottomColor: colors.border.light,
  },
  optionActive: {
    backgroundColor: colors.background.selected,
  },
  optionTextGroup: {
    flex: 1,
    marginRight: spacing.lg,
  },
  optionName: {
    color: colors.text.primary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  optionNameActive: {
    color: colors.primary.default,
  },
  phoneLabel: {
    marginTop: spacing.xl,
  },
  phoneRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: border.width.thin,
    borderColor: colors.border.default,
    borderRadius: radius.card,
    backgroundColor: colors.background.screen,
  },
  phoneRowError: {
    borderColor: colors.error.default,
    backgroundColor: '#fffafa',
  },
  phonePrefix: {
    minWidth: 58,
    paddingLeft: spacing['3xl'],
    paddingRight: spacing.lg,
    color: colors.primary.mid,
    fontSize: fontSize.md,
    fontWeight: fontWeight.extraBold,
  },
  prefixDivider: {
    width: border.width.thin,
    height: 24,
    backgroundColor: colors.border.default,
  },
  phoneInput: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    color: colors.text.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semiBold,
  },
  error: {
    marginTop: spacing.xs,
    color: colors.error.default,
    fontSize: fontSize.sm,
    lineHeight: 18,
    fontWeight: fontWeight.semiBold,
  },
  disabled: {
    opacity: 0.75,
    backgroundColor: colors.background.subtle,
  },
  pressed: {
    opacity: 0.7,
  },
});
