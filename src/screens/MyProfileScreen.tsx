import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { getAuthErrorMessage, useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../lib/api';
import { API_GLOBAL_PATHS } from '../lib/apiGlobalPaths';
import { CountryPhoneInput, normalizePhoneForCountry } from '../components/CountryPhoneInput';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import {
  AddressForm,
  AddressFormHandle,   // ← new: the ref-handle type
  Address,
  EMPTY_ADDRESS,
  isValidPostalCode,
  formatPostalCode,
} from '../components/AddressSection';
import {
  useAgentMe,
  useUpdateAgentProfile,
  findAddress,
  type AgentAddress,
} from '../lib/agentApi';
import { useUploadClientProfileImage } from '../lib/clientApi';
import { AlertModal } from '../components/AlertModal';
import { AlertModalState } from '../screens/agent/TourDashboard/types/tour.types';
import { ClientFooter, useClientFooterHeight } from './client/components/ClientFooter';
import { AgentFooter, useAgentFooterHeight } from './agent/components/AgentFooter';
import { getFileExtension, toFileSizeMb } from './agent/MediaUpload/utils/mediaUpload.utils';
import {
  blobToBase64,
  prepareImageForUpload,
} from './agent/MediaUpload/services/compression.service';
import {
  findCountryByCode,
  useLocationMetadata,
  type CountryMetadata,
} from '../lib/locationMetadataApi';
import { isValidE164 } from '../lib/phoneE164';

const PROFILE_IMAGE_MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function apiAddrToLocal(raw: AgentAddress | undefined): Address {
  if (!raw) return EMPTY_ADDRESS;
  return {
    line1:       raw.line1 ?? '',
    line2:       raw.line2 ?? null,
    city:        raw.city ?? '',
    region:      raw.region ?? '',
    postalCode:  formatPostalCode(raw.postalCode ?? '', raw.countryCode ?? 'CA'),
    countryCode: raw.countryCode ?? 'CA',
  };
}

function localAddrToApi(addr: Address, type: 'HOME' | 'WORK') {
  return {
    addressType: type,
    line1:       addr.line1.trim(),
    line2:       addr.line2?.trim() || null,
    city:        addr.city.trim(),
    region:      addr.region,
    postalCode:  addr.postalCode.replace(/\s/g, ''),
    countryCode: addr.countryCode.trim().toUpperCase(),
  };
}

function validateAddress(addr: Address, label: string): string | null {
  if (!addr.line1.trim())                  return `${label}: Street address is required.`;
  if (!addr.city.trim())                   return `${label}: City is required.`;
  if (!addr.countryCode.trim())            return `${label}: Country is required.`;
  if (!addr.region)                        return `${label}: State / province is required.`;
  if (!isValidPostalCode(addr.postalCode, addr.countryCode)) {
    return `${label}: Enter a valid ${addr.countryCode.trim().toUpperCase() === 'US' ? 'ZIP' : 'postal'} code.`;
  }
  return null;
}

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

// ─── screen ───────────────────────────────────────────────────────────────────

export function MyProfileScreen() {
  const { user, refreshUser } = useAuth();
  const navigation = useNavigation();

  const isAgent = user?.role === 'agent';
  const clientFooterHeight = useClientFooterHeight();
  const agentFooterHeight = useAgentFooterHeight();
  const footerHeight = isAgent ? agentFooterHeight : clientFooterHeight;

  // ── Ref to AddressForm — used for the beforeRemove navigation guard ────────
  //
  // The guard runs on EVERY navigation-away attempt (back button, tab switch,
  // stack pop, deep-link, etc.).  It calls addressFormRef.current?.validateAndMaybeBlock():
  //   • returns true  → work address is complete → let navigation proceed
  //   • returns false → work address is incomplete → block + show inline errors
  //
  // We bypass the guard only after a successful save so the user can leave
  // freely once the profile has been persisted.
  const addressFormRef = useRef<AddressFormHandle>(null);

  // Flag that lets us skip the guard after a successful save in this session
  const savedSuccessfully = useRef(false);

  // Flag set to true when agentMe loads and already has a complete work address.
  // If the work address was persisted before the user opened this screen they
  // should be free to leave at any time without saving again.
  const workAddrWasSavedOnLoad = useRef(false);

  // ── React Query — agent profile ────────────────────────────────────────────
  const {
    data:      agentMe,
    isLoading: agentLoading,
    error:     agentError,
  } = useAgentMe({ enabled: isAgent });

  const updateAgentProfile = useUpdateAgentProfile();
  const uploadClientProfileImage = useUploadClientProfileImage();
  const { data: locationMetadata } = useLocationMetadata();
  const countries = locationMetadata?.countries;

  // ── local UI state ────────────────────────────────────────────────────────
  const [authLoading,     setAuthLoading]     = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [uploadingImage,  setUploadingImage]  = useState(false);

  const [alertModal, setAlertModal] = useState<AlertModalState | null>(null);

  const showAlert = (title: string, message: string, onOk?: () => void) =>
    setAlertModal({
      visible: true,
      title,
      message,
      buttons: [{ text: 'OK', style: 'default', onPress: onOk }],
    });

  // Basic profile fields
  const [firstName,       setFirstName]       = useState('');
  const [lastName,        setLastName]        = useState('');
  const [displayName,     setDisplayName]     = useState('');
  const [email,           setEmail]           = useState('');
  const [phone,           setPhone]           = useState('');
  const [selectedPhoneCountryCode, setSelectedPhoneCountryCode] = useState('CA');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [bio, setBio] = useState<string>('');

  // Address state
  const [workAddr,   setWorkAddr]   = useState<Address>(EMPTY_ADDRESS);
  const [homeAddr,   setHomeAddr]   = useState<Address>(EMPTY_ADDRESS);
  const [sameAsWork, setSameAsWork] = useState(false);
  const selectedPhoneCountry = findCountryByCode(countries, selectedPhoneCountryCode);
  const selectedPhoneCode = selectedPhoneCountry?.phoneCode || '+1';
  const normalizedProfilePhone = normalizePhoneForCountry(phone, selectedPhoneCode);

  // ── Navigation guard — blocks leaving until work address is filled ─────────
  //
  // This effect runs once on mount.  The `beforeRemove` event fires whenever
  // React Navigation is about to remove this screen from the stack (back
  // gesture, hardware back, navigation.goBack(), tab switch, etc.).
  //
  // We only install the guard for agent users because only agents have the
  // work-address requirement.
  useEffect(() => {
    if (!isAgent) return;

    const unsubscribe = navigation.addListener('beforeRemove', e => {
      // Case 1: user saved in this session → always allow.
      if (savedSuccessfully.current) return;

      // Case 2: work address was already persisted when the screen loaded
      // (i.e. the agent set it up previously) → allow leaving freely.
      if (workAddrWasSavedOnLoad.current) return;

      // Case 3: work address was empty on load and user hasn't saved yet →
      // ask the form to validate; it highlights empty fields + shows its alert.
      const canLeave = addressFormRef.current?.validateAndMaybeBlock() ?? true;
      if (!canLeave) {
        e.preventDefault();
      }
    });

    return unsubscribe;
  }, [navigation, isAgent]);

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setAuthLoading(true);
        await refreshUser();
      } catch {
        // refreshUser logs out on failure — handled internally
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshUser]);

  // Populate basic fields from auth context
  useEffect(() => {
    if (!user) return;
    if (user.role === 'agent') {
      setDisplayName(
        (user as any).displayName ??
        [user.firstName, user.lastName].filter(Boolean).join(' ').trim(),
      );
    } else {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName   ?? '');
    }
    setEmail(user.email             ?? '');
    const parsedPhone = splitPhoneForCountry(user.phone, countries, 'CA');
    setSelectedPhoneCountryCode(parsedPhone.countryCode);
    setPhone(parsedPhone.phone);
    setProfileImageUrl(user.profileImageUrl ?? '');
  }, [user, countries]);

  // Populate address fields from GET /agent/me
  useEffect(() => {
    if (!agentMe) return;

    setDisplayName(agentMe.displayName         ?? '');
    setEmail(agentMe.email                     ?? '');
    setProfileImageUrl(agentMe.profileImageUrl ?? '');
    setBio(agentMe.bio                         ?? '');

    const loadedWork = apiAddrToLocal(findAddress(agentMe.addresses, 'WORK'));
    const parsedPhone = splitPhoneForCountry(agentMe.phoneE164, countries, loadedWork.countryCode || 'CA');
    setSelectedPhoneCountryCode(parsedPhone.countryCode);
    setPhone(parsedPhone.phone);
    setWorkAddr(loadedWork);
    setHomeAddr(apiAddrToLocal(findAddress(agentMe.addresses, 'HOME')));
    setSameAsWork(false);

    // If the API already has a complete work address the user set it up
    // previously — they are free to leave without saving again.
    if (
      loadedWork.line1.trim() !== '' &&
      loadedWork.city.trim()  !== '' &&
      loadedWork.region.trim() !== '' &&
      loadedWork.postalCode.trim() !== ''
    ) {
      workAddrWasSavedOnLoad.current = true;
    }
  }, [agentMe, countries]);

  // ── "Same as Work" logic ──────────────────────────────────────────────────

  const handleSameAsWorkChange = (checked: boolean) => {
    setSameAsWork(checked);
    if (checked) setHomeAddr(workAddr);
  };

  const handleWorkAddrChange = (addr: Address) => {
    setWorkAddr(addr);
    if (sameAsWork) setHomeAddr(addr);
  };

  // ── image pick ────────────────────────────────────────────────────────────

  const handleClientImagePick = async () => {
    if (user?.role !== 'client') return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        showAlert('Permission required', 'Allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const fileName = asset.fileName ?? asset.uri.split('/').pop() ?? 'client-profile.jpg';
      const ext = getFileExtension(fileName, 'jpg');
      const contentType = PROFILE_IMAGE_MIME_MAP[ext];
      if (!contentType) {
        showAlert('Unsupported file', 'Profile image must be a JPG, PNG, or WebP image.');
        return;
      }

      const prepared = await prepareImageForUpload({
        uri: asset.uri,
        fileName,
        contentType,
        fileSizeMb: toFileSizeMb(asset.fileSize),
      });
      const response = await uploadClientProfileImage.mutateAsync({
        file: prepared.blob,
        contentType: prepared.contentType,
        fileName: prepared.fileName,
        fileSizeMb: prepared.fileSizeMb,
      });

      setProfileImageUrl(response.fileUrl);
      await refreshUser();
      showAlert('Success', 'Profile image updated.');
    } catch (e: unknown) {
      showAlert('Error', getAuthErrorMessage(e));
    }
  };

  const handleAgentImagePick = async () => {
    if (!isAgent) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        showAlert('Permission required', 'Allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
      });
      if (result.canceled || !result.assets[0]) return;

      const asset       = result.assets[0];
      const fileName = asset.fileName ?? asset.uri.split('/').pop() ?? 'agent-profile.jpg';
      const ext = getFileExtension(fileName, 'jpg');
      const contentType = PROFILE_IMAGE_MIME_MAP[ext] ?? asset.mimeType ?? 'image/jpeg';

      if (!PROFILE_IMAGE_MIME_MAP[ext] && !asset.mimeType?.startsWith('image/')) {
        showAlert('Unsupported file', 'Profile image must be a JPG, PNG, or WebP image.');
        return;
      }
      if (!displayName.trim()) {
        showAlert('Validation', 'Display name is required before updating your profile image.');
        return;
      }

      setUploadingImage(true);
      const phoneE164 = normalizedProfilePhone.trim() || null;
      if (phoneE164 && !isValidE164(phoneE164)) {
        showAlert('Validation', 'Enter a valid phone number.');
        return;
      }
      const prepared = await prepareImageForUpload({
        uri: asset.uri,
        fileName,
        contentType,
        fileSizeMb: toFileSizeMb(asset.fileSize),
      });
      const profileImageBase64 = await blobToBase64(prepared.blob);
      const updated = await updateAgentProfile.mutateAsync({
        displayName:             displayName.trim(),
        email:                   email.trim()  || null,
        phoneE164,
        profileImageBase64,
        profileImageContentType: prepared.contentType,
      });

      if (updated.profileImageUrl) setProfileImageUrl(updated.profileImageUrl);
      showAlert('Success', 'Profile image updated.');
    } catch (e: unknown) {
      showAlert('Error', getAuthErrorMessage(e));
    } finally {
      setUploadingImage(false);
    }
  };

  // ── save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!user || (user.role !== 'client' && user.role !== 'agent')) {
      showAlert('Error', 'Profile editing is only available for agents and clients.');
      return;
    }

    if (user.role === 'client') {
      if (!firstName.trim()) {
        showAlert('Validation', 'First name is required.');
        return;
      }
    } else {
      if (!displayName.trim()) {
        showAlert('Validation', 'Display name is required.');
        return;
      }

      const workErr = validateAddress(workAddr, 'Work address');
      if (workErr) {
        showAlert('Validation', workErr);
        return;
      }

      if (!sameAsWork) {
        const hasAnyHomeField =
          homeAddr.line1.trim() ||
          homeAddr.city.trim()  ||
          homeAddr.region       ||
          homeAddr.postalCode.trim();

        if (hasAnyHomeField) {
          const homeErr = validateAddress(homeAddr, 'Home address');
          if (homeErr) {
            showAlert('Validation', homeErr);
            return;
          }
        }
      }
    }

    const phoneE164 = normalizedProfilePhone.trim() || null;
    if (phoneE164 && !isValidE164(phoneE164)) {
      showAlert('Validation', 'Enter a valid phone number.');
      return;
    }

    try {
      setSaving(true);

      if (user.role === 'client') {
        await apiRequest('PUT', API_GLOBAL_PATHS.clientProfile, {
          firstName:       firstName.trim(),
          lastName:        lastName.trim()        || null,
          email:           email.trim()           || null,
          phoneE164,
          profileImageUrl: profileImageUrl.trim() || null,
        });
        await refreshUser();
        showAlert('Success', 'Profile updated successfully.');

      } else {
        const effectiveHome = sameAsWork ? workAddr : homeAddr;

        await updateAgentProfile.mutateAsync({
          displayName: displayName.trim(),
          email:       email.trim()  || null,
          phoneE164,
          bio:         bio.trim()    || null,
          addresses: [
            localAddrToApi(workAddr,      'WORK'),
            localAddrToApi(effectiveHome, 'HOME'),
          ],
        });

        // Mark as saved so the beforeRemove guard lets the user leave freely
        savedSuccessfully.current = true;
        addressFormRef.current?.markAsSaved();

        showAlert('Success', 'Your profile has been updated successfully.');
      }

    } catch (e: unknown) {
      showAlert('Error', getAuthErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  // ── render guards ─────────────────────────────────────────────────────────

  const loading = authLoading || (isAgent && agentLoading);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  if (user?.role !== 'client' && user?.role !== 'agent') {
    return (
      <View style={styles.centered}>
        <Text style={styles.hint}>Open this screen as an agent or client.</Text>
      </View>
    );
  }

  if (agentError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.hint}>Failed to load profile: {agentError.message}</Text>
      </View>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: footerHeight + 32 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <CardHeader>
            <CardTitle>
              {user.role === 'client' ? 'Client profile' : 'Agent profile'}
            </CardTitle>
          </CardHeader>
          <CardContent>

            {/* ── Basic info ── */}
            {user.role === 'client' ? (
              <>
                <Text style={styles.label}>First name *</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor="#94a3b8"
                />
                <Text style={styles.label}>Last name</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor="#94a3b8"
                />
                <Text style={styles.label}>Profile image</Text>
                {profileImageUrl ? (
                  <Image source={{ uri: profileImageUrl }} style={styles.profilePreview} />
                ) : null}
                <TouchableOpacity
                  style={[styles.secondaryBtn, uploadClientProfileImage.isPending && styles.btnDisabled]}
                  onPress={handleClientImagePick}
                  disabled={uploadClientProfileImage.isPending || saving}
                >
                  {uploadClientProfileImage.isPending ? (
                    <ActivityIndicator color="#1e40af" />
                  ) : (
                    <Text style={styles.secondaryBtnText}>{profileImageUrl ? 'Replace image' : 'Choose image'}</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>Display name *</Text>
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Your name as shown to clients"
                  placeholderTextColor="#94a3b8"
                />
                <Text style={styles.label}>Profile image</Text>
                {profileImageUrl ? (
                  <Image source={{ uri: profileImageUrl }} style={styles.profilePreview} />
                ) : null}
                <TouchableOpacity
                  style={[styles.secondaryBtn, uploadingImage && styles.btnDisabled]}
                  onPress={handleAgentImagePick}
                  disabled={uploadingImage || saving}
                >
                  {uploadingImage ? (
                    <ActivityIndicator color="#1e40af" />
                  ) : (
                    <Text style={styles.secondaryBtnText}>Choose image</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <CountryPhoneInput
              value={phone}
              onChangeText={setPhone}
              selectedCountryCode={selectedPhoneCountryCode}
              onCountryChange={setSelectedPhoneCountryCode}
              editable={!saving && !uploadingImage}
              containerStyle={styles.phonePicker}
            />

             {/* ── Bio — agents only ── */}
            {user.role === 'agent' && (
              <>
                <Text style={styles.label}>Bio</Text>
                <TextInput
                  style={styles.bioInput}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell clients a little about yourself…"
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  maxLength={1000}
                />
                <Text style={styles.charCount}>{bio.length}/1000</Text>
              </>
            )}

            {/* ── Address sections — agents only ── */}
            {user.role === 'agent' && (
              /*
               * ref={addressFormRef} wires the beforeRemove guard above.
               * The guard calls addressFormRef.current.validateAndMaybeBlock()
               * which highlights empty required fields and shows an alert if
               * the work address is not yet complete.
               */
              <AddressForm
                ref={addressFormRef}
                workAddress={workAddr}
                onWorkAddressChange={handleWorkAddrChange}
                homeAddress={homeAddr}
                onHomeAddressChange={setHomeAddr}
                sameAsWork={sameAsWork}
                onSameAsWorkChange={handleSameAsWorkChange}
                disabled={saving}
              />
            )}

            {/* ── Save ── */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>

          </CardContent>
        </Card>
      </ScrollView>
      </KeyboardAvoidingView>

      <AlertModal
        modal={alertModal}
        onDismiss={() => setAlertModal(null)}
      />

      {user.role === 'agent' ? <AgentFooter /> : <ClientFooter />}
    </>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  keyboardAvoider: { flex: 1 },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content:   { padding: 16 },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  hint:      { color: '#64748b', fontSize: 15, textAlign: 'center' },
  label: {
    fontSize:     13,
    fontWeight:   '500',
    color:        '#64748b',
    marginTop:    12,
    marginBottom: 4,
  },
  input: {
    backgroundColor:   '#f8fafc',
    borderRadius:      10,
    borderWidth:       1,
    borderColor:       '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical:   10,
    fontSize:          15,
    color:             '#1e293b',
  },
  phonePicker: {
    marginTop: 12,
    marginBottom: 0,
  },
  saveBtn: {
    marginTop:       24,
    backgroundColor: '#1e40af',
    borderRadius:    10,
    paddingVertical: 14,
    alignItems:      'center',
  },
  btnDisabled:      { opacity: 0.6 },
  saveBtnText:      { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: {
    marginTop:       8,
    marginBottom:    8,
    borderRadius:    10,
    borderWidth:     1,
    borderColor:     '#1e40af',
    paddingVertical: 10,
    alignItems:      'center',
    backgroundColor: '#eff6ff',
  },
  secondaryBtnText: { color: '#1e40af', fontSize: 14, fontWeight: '600' },
  profilePreview: {
    width:           96,
    height:          96,
    borderRadius:    48,
    marginTop:       4,
    marginBottom:    8,
    backgroundColor: '#e2e8f0',
  },



  bioInput: {
    backgroundColor:   '#f8fafc',
    borderRadius:      10,
    borderWidth:       1,
    borderColor:       '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical:   10,
    fontSize:          15,
    color:             '#1e293b',
    minHeight:         100,
  },
  charCount: {
    fontSize:  12,
    color:     '#94a3b8',
    textAlign: 'right',
    marginTop: 4,
  },
});
