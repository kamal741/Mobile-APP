import { useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { AlertModal } from '../components/AlertModal'; // adjust path as needed
import { AlertModalState } from '../screens/agent/TourDashboard/types/tour.types'; // adjust path as needed
import {
  findCountryByCode,
  getAdministrativeAreas,
  useLocationMetadata,
  type CountryMetadata,
} from '../lib/locationMetadataApi';

// ─── Canadian provinces & territories ────────────────────────────────────────

export const CANADIAN_PROVINCES: { label: string; value: string }[] = [
  { label: 'Alberta', value: 'Alberta' },
  { label: 'British Columbia', value: 'British Columbia' },
  { label: 'Manitoba', value: 'Manitoba' },
  { label: 'New Brunswick', value: 'New Brunswick' },
  { label: 'Newfoundland and Labrador', value: 'Newfoundland and Labrador' },
  { label: 'Northwest Territories', value: 'Northwest Territories' },
  { label: 'Nova Scotia', value: 'Nova Scotia' },
  { label: 'Nunavut', value: 'Nunavut' },
  { label: 'Ontario', value: 'Ontario' },
  { label: 'Prince Edward Island', value: 'Prince Edward Island' },
  { label: 'Quebec', value: 'Quebec' },
  { label: 'Saskatchewan', value: 'Saskatchewan' },
  { label: 'Yukon', value: 'Yukon' },
];

// ─── Address type ─────────────────────────────────────────────────────────────

export interface Address {
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
}

export const EMPTY_ADDRESS: Address = {
  line1: '',
  line2: null,
  city: '',
  region: '',
  postalCode: '',
  countryCode: 'CA',
};

// ─── Validation helpers ───────────────────────────────────────────────────────

export function isWorkAddressComplete(addr: Address): boolean {
  return (
    addr.line1.trim() !== '' &&
    addr.city.trim() !== '' &&
    addr.countryCode.trim() !== '' &&
    addr.region.trim() !== '' &&
    addr.postalCode.trim() !== ''
  );
}

export function formatPostalCode(raw: string, countryCode = 'CA'): string {
  if (countryCode.trim().toUpperCase() !== 'CA') {
    return (raw ?? '').toUpperCase();
  }
  const cleaned = (raw ?? '').replace(/\s/g, '').toUpperCase().slice(0, 6);
  if (cleaned.length > 3) return cleaned.slice(0, 3) + ' ' + cleaned.slice(3);
  return cleaned;
}

export function normalisePostalCode(displayValue: string): string {
  return (displayValue ?? '').replace(/\s/g, '').toUpperCase();
}

export function isValidPostalCode(code: string, countryCode = 'CA'): boolean {
  const trimmed = (code ?? '').trim();
  switch (countryCode.trim().toUpperCase()) {
    case 'CA':
      return /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/.test(trimmed);
    case 'US':
      return /^\d{5}(-\d{4})?$/.test(trimmed);
    default:
      return trimmed.length >= 3;
  }
}

// ─── Province picker (internal) ───────────────────────────────────────────────

interface OptionPickerProps {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  placeholder: string;
  disabled?: boolean;
  emptyMessage?: string;
}

function OptionPicker({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  emptyMessage = 'No options available',
}: OptionPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(p => p.value === value)?.label ?? value;
  const pickerDisabled = disabled || options.length === 0;

  if (pickerDisabled) {
    return (
      <View style={[styles.input, styles.inputDisabled, styles.row]}>
        <Text style={value ? styles.inputText : styles.inputPlaceholder}>
          {selectedLabel || (options.length === 0 ? emptyMessage : placeholder)}
        </Text>
      </View>
    );
  }

  return (
    <View>
      <TouchableOpacity
        style={[styles.input, styles.row]}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.7}
      >
        <Text style={value ? styles.inputText : styles.inputPlaceholder}>
          {selectedLabel || placeholder}
        </Text>
        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdownWrapper}>
          <ScrollView
            style={styles.dropdownScroll}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {options.map(p => {
              const selected = p.value === value;
              return (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.dropdownItem, selected && styles.dropdownItemSelected]}
                  onPress={() => {
                    onChange(p.value);
                    setOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selected && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {p.label}
                  </Text>
                  {selected && <Text style={styles.dropdownTick}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

interface CountryPickerProps {
  value: string;
  countries: CountryMetadata[];
  onChange: (countryCode: string) => void;
  disabled?: boolean;
}

function CountryPicker({ value, countries, onChange, disabled = false }: CountryPickerProps) {
  const options = countries.map((country) => ({
    label: `${country.name} (${country.isoCode})`,
    value: country.isoCode,
  }));

  return (
    <OptionPicker
      value={value}
      options={options}
      onChange={onChange}
      disabled={disabled}
      placeholder="Select country"
    />
  );
}

// ─── Single address block (internal) ─────────────────────────────────────────

interface AddressBlockProps {
  title: string;
  value: Address;
  onChange: (addr: Address) => void;
  showSameAsWork?: boolean;
  sameAsWork?: boolean;
  onSameAsWorkChange?: (checked: boolean) => void;
  disabled?: boolean;
  showValidationErrors?: boolean;
}

function AddressBlock({
  title,
  value,
  onChange,
  showSameAsWork = false,
  sameAsWork = false,
  onSameAsWorkChange,
  disabled = false,
  showValidationErrors = false,
}: AddressBlockProps) {
  const str = (v: string | null | undefined) => v ?? '';
  const { data: locationMetadata } = useLocationMetadata();
  const fallbackCountries: CountryMetadata[] = [
    {
      id: 1,
      name: 'Canada',
      isoCode: 'CA',
      phoneCode: '+1',
      phoneExample: '+14165551234',
      administrativeAreaLabel: 'Province/Territory',
      administrativeAreas: CANADIAN_PROVINCES.map((province, index) => ({
        id: index + 1,
        name: province.label,
        stateCode: province.value,
        areaType: province.value === 'Northwest Territories' || province.value === 'Nunavut' || province.value === 'Yukon'
          ? 'TERRITORY'
          : 'PROVINCE',
      })),
    },
  ];
  const countries = locationMetadata?.countries?.length ? locationMetadata.countries : fallbackCountries;
  const selectedCountry = findCountryByCode(countries, value.countryCode) ?? fallbackCountries[0];
  const areaLabel = selectedCountry.administrativeAreaLabel || 'State / Province';
  const areaOptions = getAdministrativeAreas(selectedCountry).map((area) => ({
    label: area.name,
    value: area.name,
  }));
  const countryCode = selectedCountry.isoCode;
  const postalCodeLabel = countryCode === 'US' ? 'ZIP code' : 'Postal code';
  const postalCodePlaceholder =
    countryCode === 'US' ? 'e.g. 10001' : countryCode === 'CA' ? 'e.g. M5V 3R8' : 'Postal code';

  const set = (field: keyof Address) => (text: string) =>
    onChange({
      ...value,
      [field]: field === 'line2' ? (text.trim() === '' ? null : text) : text,
    });

  const fieldsDisabled = disabled || (showSameAsWork && sameAsWork);
  const hideFields = showSameAsWork && sameAsWork;

  const inputError = (fieldValue: string) =>
    showValidationErrors && fieldValue.trim() === '' ? styles.inputError : null;

  return (
    <View style={styles.sectionWrapper}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {showSameAsWork && (
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => onSameAsWorkChange?.(!sameAsWork)}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <View style={[styles.checkbox, sameAsWork && styles.checkboxChecked]}>
            {sameAsWork && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>Same as Work address</Text>
        </TouchableOpacity>
      )}

      {!hideFields && (
        <>
          <Text style={styles.label}>
            Street address <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, fieldsDisabled && styles.inputDisabled, inputError(str(value.line1))]}
            value={str(value.line1)}
            onChangeText={set('line1')}
            placeholder="e.g. 381 Front Street West"
            placeholderTextColor="#94a3b8"
            editable={!fieldsDisabled}
            autoCapitalize="words"
            returnKeyType="next"
          />
          {showValidationErrors && str(value.line1).trim() === '' && (
            <Text style={styles.errorText}>Street address is required</Text>
          )}

          <Text style={styles.label}>Suite / Unit / Apt (optional)</Text>
          <TextInput
            style={[styles.input, fieldsDisabled && styles.inputDisabled]}
            value={str(value.line2)}
            onChangeText={set('line2')}
            placeholder="e.g. Suite 100"
            placeholderTextColor="#94a3b8"
            editable={!fieldsDisabled}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Text style={styles.label}>
            City <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, fieldsDisabled && styles.inputDisabled, inputError(str(value.city))]}
            value={str(value.city)}
            onChangeText={set('city')}
            placeholder="e.g. Toronto"
            placeholderTextColor="#94a3b8"
            editable={!fieldsDisabled}
            autoCapitalize="words"
            returnKeyType="next"
          />
          {showValidationErrors && str(value.city).trim() === '' && (
            <Text style={styles.errorText}>City is required</Text>
          )}

          <Text style={styles.label}>
            Country <Text style={styles.required}>*</Text>
          </Text>
          <CountryPicker
            value={countryCode}
            countries={countries}
            disabled={fieldsDisabled}
            onChange={(nextCountryCode) =>
              onChange({
                ...value,
                countryCode: nextCountryCode,
                region: '',
                postalCode: '',
              })
            }
          />

          <Text style={styles.label}>
            {areaLabel} <Text style={styles.required}>*</Text>
          </Text>
          {areaOptions.length > 0 ? (
            <OptionPicker
              value={str(value.region)}
              options={areaOptions}
              placeholder={`Select ${areaLabel.toLowerCase()}`}
              onChange={v => onChange({ ...value, region: v })}
              disabled={fieldsDisabled}
            />
          ) : (
            <TextInput
              style={[styles.input, fieldsDisabled && styles.inputDisabled, inputError(str(value.region))]}
              value={str(value.region)}
              onChangeText={set('region')}
              placeholder={areaLabel}
              placeholderTextColor="#94a3b8"
              editable={!fieldsDisabled}
              autoCapitalize="words"
              returnKeyType="next"
            />
          )}
          {showValidationErrors && str(value.region).trim() === '' && (
            <Text style={styles.errorText}>{areaLabel} is required</Text>
          )}

          <Text style={styles.label}>
            {postalCodeLabel} <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, fieldsDisabled && styles.inputDisabled, inputError(str(value.postalCode))]}
            value={formatPostalCode(str(value.postalCode), countryCode)}
            onChangeText={raw => set('postalCode')(formatPostalCode(raw, countryCode))}
            placeholder={postalCodePlaceholder}
            placeholderTextColor="#94a3b8"
            editable={!fieldsDisabled}
            autoCapitalize="characters"
            keyboardType="default"
            maxLength={countryCode === 'CA' ? 7 : 12}
            returnKeyType="done"
          />
          {showValidationErrors && str(value.postalCode).trim() === '' && (
            <Text style={styles.errorText}>{postalCodeLabel} is required</Text>
          )}
        </>
      )}
    </View>
  );
}

// ─── AddressForm public handle type ──────────────────────────────────────────

/**
 * Ref handle exposed by AddressForm.
 * Call `validateAndMaybeBlock()` from a `beforeRemove` listener:
 *   - returns true  → work address is complete, navigation can proceed
 *   - returns false → work address is incomplete, navigation is blocked
 *     (shows inline errors + alert automatically)
 */
// export interface AddressFormHandle {
//   validateAndMaybeBlock: () => boolean;
// }

export interface AddressFormHandle {
  validateAndMaybeBlock: () => boolean;
  markAsSaved: () => void;   // called by parent after successful DB save
}

// ─── AddressForm (public) ─────────────────────────────────────────────────────

export interface AddressFormProps {
  workAddress: Address;
  onWorkAddressChange: (addr: Address) => void;
  homeAddress: Address;
  onHomeAddressChange: (addr: Address) => void;
  sameAsWork?: boolean;
  onSameAsWorkChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export const AddressForm = forwardRef<AddressFormHandle, AddressFormProps>(
  function AddressForm(
    {
      workAddress,
      onWorkAddressChange,
      homeAddress,
      onHomeAddressChange,
      sameAsWork = false,
      onSameAsWorkChange,
      disabled = false,
    },
    ref,
  ) {
    const [showWorkValidationErrors, setShowWorkValidationErrors] = useState(false);
    const [alertModal, setAlertModal] = useState<AlertModalState | null>(null);
    const savedRef = useRef(false);

    const markAsSaved = useCallback(() => {
      savedRef.current = true;
    }, []);

    /**
     * Validates the work address and whether it has been saved.
     * Returns true only if a successful DB save has occurred in this session,
     * or if the address was already persisted when the screen loaded (handled
     * by the parent via workAddrWasSavedOnLoad).
     * When blocked, highlights empty fields and/or shows an alert.
     */
    const validateAndMaybeBlock = useCallback((): boolean => {
      // Already saved in this session — allow navigation freely
      if (savedRef.current) return true;

      // Work address fields are not yet filled — highlight + alert
      if (!isWorkAddressComplete(workAddress)) {
        setShowWorkValidationErrors(true);
        setAlertModal({
          visible: true,
          title: 'Work Address Required',
          message:
            'Work address is mandatory. Please fill in all required fields ' +
            '(Street address, City, Country, State/Province, and Postal/ZIP code) before leaving this screen.',
          buttons: [{ text: 'OK', style: 'default', onPress: undefined }],
        });
        return false;
      }

      // Work address is filled but not yet saved — prompt the user to save
      setAlertModal({
        visible: true,
        title: 'Work Address Not Saved',
        message:
          'You have filled in a work address but it has not been saved yet. ' +
          'Please tap Save to save your profile before leaving this screen.',
        buttons: [{ text: 'OK', style: 'default', onPress: undefined }],
      });
      return false;
    }, [workAddress]);

    // Expose both handles to the parent screen
    useImperativeHandle(
      ref,
      () => ({ validateAndMaybeBlock, markAsSaved }),
      [validateAndMaybeBlock, markAsSaved],
    );

    return (
      <>
        <AddressBlock
          title="Work Address"
          value={workAddress}
          onChange={onWorkAddressChange}
          disabled={disabled}
          showValidationErrors={showWorkValidationErrors}
        />

        <AddressBlock
          title="Home Address"
          value={homeAddress}
          onChange={onHomeAddressChange}
          showSameAsWork
          sameAsWork={sameAsWork}
          onSameAsWorkChange={onSameAsWorkChange}
          disabled={disabled}
        />

        <AlertModal
          modal={alertModal}
          onDismiss={() => setAlertModal(null)}
        />
      </>
    );
  },
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sectionWrapper: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  required: {
    color: '#dc2626',
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#1e293b',
  },
  inputDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  inputError: {
    borderColor: '#dc2626',
    backgroundColor: '#fff5f5',
  },
  inputText: {
    fontSize: 15,
    color: '#1e293b',
    flex: 1,
  },
  inputPlaceholder: {
    fontSize: 15,
    color: '#94a3b8',
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 3,
    marginLeft: 2,
  },
  chevron: {
    fontSize: 11,
    color: '#64748b',
    marginLeft: 8,
  },
  dropdownWrapper: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemSelected: {
    backgroundColor: '#eff6ff',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: '#1e40af',
    fontWeight: '600',
  },
  dropdownTick: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '700',
    marginLeft: 6,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#1e40af',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  countryBadge: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
  },
  countryBadgeText: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '600',
  },
});
