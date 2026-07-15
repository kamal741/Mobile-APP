import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Camera, Check, RotateCcw, Save, Trash2, Upload, X } from 'lucide-react-native';

import { AlertModal } from '../../components/AlertModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/Card';
import { colors, globalStyles } from '@/theme';
import { AlertModalState } from '../agent/TourDashboard/types/tour.types';
import { NavbarBroker } from './components/NavbarBroker';
import { BrokerageFooter } from './components/BrokerageFooter';
import {
  type UpdateBrokerSettingsPayload,
  useBrokerSettings,
  useUpdateBrokerSettings,
  useUploadBrokerLogo,
} from '../../lib/brokerApi';
import {
  getFileExtension,
  toFileSizeMb,
} from '../agent/MediaUpload/utils/mediaUpload.utils';
import { prepareImageForUpload } from '../agent/MediaUpload/services/compression.service';

const LOGO_MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const THEME_OPTIONS = ['light', 'dark', 'system'] as const;

const COLOR_PICKER_SWATCHES = [
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Sky', value: '#0284c7' },
  { name: 'Teal', value: '#0f766e' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Lime', value: '#65a30d' },
  { name: 'Gold', value: '#d97706' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Rose', value: '#e11d48' },
  { name: 'Pink', value: '#db2777' },
  { name: 'Fuchsia', value: '#c026d3' },
  { name: 'Slate', value: '#1e293b' },
  { name: 'Black', value: '#111827' },
] as const;

type ColorPickerTarget = 'primary' | 'secondary';

function colorPresetName(value: string): string {
  const normalized = value.trim().toLowerCase();
  return COLOR_PICKER_SWATCHES.find((preset) => preset.value.toLowerCase() === normalized)?.name ?? 'Custom';
}

function safeColor(value: string, fallback: string): string {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim()) ? value.trim() : fallback;
}

export function BrokerageSettingsScreen() {
  const navigation = useNavigation<any>();
  const { data: settings, isLoading } = useBrokerSettings();
  const updateMutation = useUpdateBrokerSettings();
  const logoUploadMutation = useUploadBrokerLogo();

  const [alertModal, setAlertModal] = useState<AlertModalState | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [theme, setTheme] = useState('');
  const [emailFooter, setEmailFooter] = useState('');
  const [showBrokerName, setShowBrokerName] = useState(true);
  const [colorPickerTarget, setColorPickerTarget] = useState<ColorPickerTarget | null>(null);

  const showAlert = (title: string, message: string, onOk?: () => void) =>
    setAlertModal({
      visible: true,
      title,
      message,
      buttons: [{ text: 'OK', style: 'default', onPress: onOk }],
    });

  const populateBranding = useCallback(() => {
    if (!settings) return;
    const branding = (settings.settings as any) ?? {};
    setLogoUrl(branding.logoUrl ?? '');
    setPrimaryColor(branding.primaryColor ?? '');
    setSecondaryColor(branding.secondaryColor ?? '');
    setTheme(branding.theme ?? '');
    setEmailFooter(branding.emailFooter ?? '');
    setShowBrokerName(branding.showBrokerName ?? true);
  }, [settings]);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ headerShown: false });
    }, [navigation]),
  );

  useEffect(() => {
    populateBranding();
  }, [populateBranding]);

  const handleSave = () => {
    const payload: UpdateBrokerSettingsPayload = {
      name: settings?.name ?? '',
      contactEmail: settings?.contactEmail ?? '',
      contactPhone: settings?.contactPhone ?? null,
      website: settings?.website ?? null,
      branding: {
        logoUrl: logoUrl.trim() || null,
        emailFooter: emailFooter.trim() || null,
        showBrokerName,
        primaryColor: primaryColor.trim() || null,
        secondaryColor: secondaryColor.trim() || null,
        theme: theme.trim() || null,
        faviconUrl: null,
      },
    };

    updateMutation.mutate(payload, {
      onSuccess: () => showAlert('Success', 'Branding settings updated successfully.'),
      onError: (err: any) => {
        showAlert('Error', err?.response?.data?.message || err.message || 'Failed to update branding settings.');
      },
    });
  };

  const handleUploadLogo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        showAlert('Permission required', 'Please allow media library access to upload a logo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const originalName = asset.fileName ?? asset.uri.split('/').pop() ?? 'logo.jpg';
      const ext = getFileExtension(originalName, 'jpg');
      const contentType = LOGO_MIME_MAP[ext] ?? 'image/jpeg';

      if (!LOGO_MIME_MAP[ext]) {
        showAlert('Unsupported file', 'Logo must be a JPG, PNG, or WebP image.');
        return;
      }

      const prepared = await prepareImageForUpload({
        uri: asset.uri,
        fileName: originalName,
        contentType,
        fileSizeMb: toFileSizeMb(asset.fileSize),
      });

      const response = await logoUploadMutation.mutateAsync({
        file: prepared.blob,
        contentType: prepared.contentType,
        fileName: prepared.fileName,
        fileSizeMb: prepared.fileSizeMb,
      });

      setLogoUrl(response.fileUrl);
      showAlert('Success', 'Branding logo uploaded successfully.');
    } catch (err: any) {
      showAlert('Upload failed', err?.response?.data?.message || err.message || 'Failed to upload logo.');
    }
  };

  const selectedPickerColor =
    colorPickerTarget === 'secondary'
      ? safeColor(secondaryColor, '#1e293b')
      : safeColor(primaryColor, '#7c3aed');
  const selectedPickerTitle = colorPickerTarget === 'secondary' ? 'Secondary Color' : 'Primary Color';

  const setSelectedPickerColor = (next: string) => {
    if (colorPickerTarget === 'secondary') {
      setSecondaryColor(next);
      return;
    }
    setPrimaryColor(next);
  };

  const renderColorPicker = (
    label: string,
    value: string,
    fallback: string,
    target: ColorPickerTarget,
  ) => {
    const selectedColor = safeColor(value, fallback);
    return (
      <View style={styles.paletteBlock}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TouchableOpacity
          style={styles.colorSelectorButton}
          onPress={() => setColorPickerTarget(target)}
          accessibilityRole="button"
          accessibilityLabel={`Choose ${label}`}
        >
          <View style={styles.selectedColorMeta}>
            <View style={[styles.selectedColorDot, { backgroundColor: selectedColor }]} />
            <View>
              <Text style={styles.selectedColorName}>{colorPresetName(selectedColor)}</Text>
              <Text style={styles.selectedColorHint}>Tap to choose</Text>
            </View>
          </View>
          <Text style={styles.chooseColorText}>Choose</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={globalStyles.screenContainer}>
      <NavbarBroker title="Branding Settings" showBack />

      <ScrollView style={globalStyles.flex1} contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <CardHeader>
            <CardTitle>Branding Settings</CardTitle>
            <CardDescription>Manage logo, colors, and client-facing brand presentation.</CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <ActivityIndicator color="#7c3aed" style={{ marginVertical: 24 }} />
            ) : (
              <View style={styles.formSection}>
                <View style={styles.sectionHeadingRow}>
                  <Text style={styles.sectionLabel}>BRANDING</Text>
                  <Text style={styles.sectionHint}>Logo and display preferences</Text>
                </View>

                <Text style={styles.fieldLabel}>Branding Logo</Text>
                <View style={styles.logoRow}>
                  <View style={styles.logoPreview}>
                    {logoUrl ? (
                      <Image source={{ uri: logoUrl }} style={styles.logoImage} resizeMode="contain" />
                    ) : (
                      <Camera size={24} color={colors.text.muted} />
                    )}
                  </View>
                  <View style={styles.logoActions}>
                    <Text style={styles.logoHelp} numberOfLines={2}>
                      JPG, PNG, or WebP. Max 5 MB.
                    </Text>
                    <TouchableOpacity
                      style={[styles.uploadLogoBtn, logoUploadMutation.isPending && styles.btnDisabled]}
                      onPress={handleUploadLogo}
                      disabled={logoUploadMutation.isPending}
                    >
                      {logoUploadMutation.isPending ? (
                        <ActivityIndicator color="#7c3aed" />
                      ) : (
                        <View style={styles.iconButtonContent}>
                          <Upload size={16} color="#7c3aed" />
                          <Text style={styles.uploadLogoText}>{logoUrl ? 'Replace Logo' : 'Upload Logo'}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    {logoUrl ? (
                      <TouchableOpacity
                        style={styles.removeLogoBtn}
                        onPress={() => setLogoUrl('')}
                        disabled={logoUploadMutation.isPending}
                      >
                        <View style={styles.iconButtonContent}>
                          <Trash2 size={15} color="#dc2626" />
                          <Text style={styles.removeLogoText}>Remove</Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {renderColorPicker('Primary Color', primaryColor, '#7c3aed', 'primary')}
                {renderColorPicker('Secondary Color', secondaryColor, '#1e293b', 'secondary')}

                <Text style={styles.fieldLabel}>Theme</Text>
                <View style={styles.themeSegment}>
                  {THEME_OPTIONS.map((option) => {
                    const active = theme === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[styles.themeOption, active && styles.themeOptionActive]}
                        onPress={() => setTheme(active ? '' : option)}
                      >
                        {active ? <Check size={14} color="#ffffff" /> : null}
                        <Text style={[styles.themeOptionText, active && styles.themeOptionTextActive]}>
                          {option[0].toUpperCase() + option.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>Email Footer</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={emailFooter}
                  onChangeText={setEmailFooter}
                  placeholder="Thank you for choosing Demo Realty."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <View style={styles.switchRow}>
                  <View style={styles.switchMeta}>
                    <Text style={styles.switchLabel}>Show Broker Name</Text>
                    <Text style={styles.switchHint}>Display brokerage name on client-facing pages</Text>
                  </View>
                  <Switch
                    value={showBrokerName}
                    onValueChange={setShowBrokerName}
                    trackColor={{ false: '#e2e8f0', true: '#7c3aed' }}
                    thumbColor="#ffffff"
                  />
                </View>

                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={populateBranding}>
                    <View style={styles.iconButtonContent}>
                      <RotateCcw size={16} color="#64748b" />
                      <Text style={styles.cancelBtnText}>Reset</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, updateMutation.isPending && styles.btnDisabled]}
                    onPress={handleSave}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <View style={styles.iconButtonContent}>
                        <Save size={16} color="#fff" />
                        <Text style={styles.saveBtnText}>Save Changes</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </CardContent>
        </Card>
      </ScrollView>

      <AlertModal modal={alertModal} onDismiss={() => setAlertModal(null)} />
      <Modal
        visible={colorPickerTarget !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setColorPickerTarget(null)}
      >
        <View style={styles.colorPickerScreen}>
          <View style={styles.colorPickerHeader}>
            <TouchableOpacity style={styles.colorPickerIconButton} onPress={() => setColorPickerTarget(null)}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
            <View style={styles.colorPickerTitleWrap}>
              <Text style={styles.colorPickerTitle}>{selectedPickerTitle}</Text>
              <Text style={styles.colorPickerSubtitle}>Pick a brand color for your brokerage</Text>
            </View>
            <TouchableOpacity style={styles.colorPickerDoneButton} onPress={() => setColorPickerTarget(null)}>
              <Text style={styles.colorPickerDoneText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.colorPreviewPanel}>
            <View style={[styles.colorPreviewSwatch, { backgroundColor: selectedPickerColor }]} />
            <View style={styles.colorPreviewTextWrap}>
              <Text style={styles.colorPreviewName}>{colorPresetName(selectedPickerColor)}</Text>
              <Text style={styles.colorPreviewHint}>This color will be saved in branding settings.</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.colorPickerContent}>
            <View style={styles.colorPickerGrid}>
              {COLOR_PICKER_SWATCHES.map((preset) => {
                const active = selectedPickerColor.toLowerCase() === preset.value.toLowerCase();
                return (
                  <TouchableOpacity
                    key={preset.value}
                    style={[styles.colorPickerOption, active && styles.colorPickerOptionActive]}
                    onPress={() => setSelectedPickerColor(preset.value)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${preset.name}`}
                  >
                    <View style={[styles.colorPickerSwatch, { backgroundColor: preset.value }]}>
                      {active ? <Check size={18} color="#ffffff" /> : null}
                    </View>
                    <Text style={[styles.colorPickerName, active && styles.colorPickerNameActive]}>
                      {preset.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>
      <BrokerageFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  card: { marginBottom: 16 },
  formSection: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
  },
  sectionHeadingRow: { marginBottom: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#7c3aed', letterSpacing: 0.8, marginBottom: 2 },
  sectionHint: { fontSize: 12, color: '#94a3b8' },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: '#64748b', marginTop: 14, marginBottom: 4 },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1e293b',
  },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  logoPreview: {
    width: 76,
    height: 76,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoActions: {
    flex: 1,
    gap: 8,
  },
  logoHelp: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 16,
  },
  uploadLogoBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7c3aed',
    paddingVertical: 10,
    alignItems: 'center',
  },
  iconButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  uploadLogoText: {
    color: '#7c3aed',
    fontSize: 14,
    fontWeight: '600',
  },
  removeLogoBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 10,
    alignItems: 'center',
  },
  removeLogoText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  paletteBlock: {
    marginTop: 4,
  },
  colorSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
  },
  selectedColorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedColorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.14)',
    marginRight: 10,
  },
  selectedColorName: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: '700',
  },
  selectedColorHint: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 1,
  },
  chooseColorText: {
    color: '#7c3aed',
    fontSize: 13,
    fontWeight: '700',
  },
  themeSegment: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  themeOption: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  themeOptionActive: {
    backgroundColor: '#7c3aed',
  },
  themeOptionText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  themeOptionTextActive: {
    color: '#ffffff',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingVertical: 4 },
  switchMeta: { flex: 1, marginRight: 12 },
  switchLabel: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
  switchHint: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  cancelBtnText: { fontSize: 15, color: '#64748b', fontWeight: '500' },
  saveBtn: { flex: 2, backgroundColor: '#7c3aed', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  colorPickerScreen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  colorPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  colorPickerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  colorPickerTitleWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  colorPickerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  colorPickerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  colorPickerDoneButton: {
    borderRadius: 18,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  colorPickerDoneText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  colorPreviewPanel: {
    margin: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorPreviewSwatch: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.14)',
    marginRight: 12,
  },
  colorPreviewTextWrap: {
    flex: 1,
  },
  colorPreviewName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  colorPreviewHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
  },
  colorPickerContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  colorPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorPickerOption: {
    width: '22.8%',
    minWidth: 72,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  colorPickerOptionActive: {
    borderColor: '#7c3aed',
    backgroundColor: '#faf5ff',
  },
  colorPickerSwatch: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPickerName: {
    marginTop: 7,
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  colorPickerNameActive: {
    color: '#7c3aed',
  },
});
