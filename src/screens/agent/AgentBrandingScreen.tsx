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
import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Check, RotateCcw, Save, Upload, X } from 'lucide-react-native';
import { AgentFooter, useAgentFooterHeight } from '@/screens/agent/components/AgentFooter';
import { AlertModal } from '@/components/AlertModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/Card';
import { colors, globalStyles } from '@/theme';
import {
  useAgentBrandingSettings,
  useUpdateAgentBrandingSettings,
  useUploadAgentBrandingAsset,
  type UpdateAgentBrandingSettingsPayload,
} from '@/lib/agentApi';
import { getFileExtension, toFileSizeMb } from './MediaUpload/utils/mediaUpload.utils';
import { prepareImageForUpload } from './MediaUpload/services/compression.service';
import type { AlertModalState } from './TourDashboard/types/tour.types';

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
  { name: 'Gold', value: '#d97706' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Rose', value: '#e11d48' },
  { name: 'Slate', value: '#1e293b' },
  { name: 'Black', value: '#111827' },
] as const;

type ColorPickerTarget = 'primary' | 'secondary';

function safeColor(value: string, fallback: string): string {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim()) ? value.trim() : fallback;
}

function colorName(value: string): string {
  const normalized = value.trim().toLowerCase();
  return COLOR_PICKER_SWATCHES.find((preset) => preset.value.toLowerCase() === normalized)?.name ?? 'Custom';
}

export function AgentBrandingScreen() {
  const footerHeight = useAgentFooterHeight();
  const [alertModal, setAlertModal] = useState<AlertModalState | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [theme, setTheme] = useState('');
  const [emailFooter, setEmailFooter] = useState('');
  const [showAgentName, setShowAgentName] = useState(true);
  const [useOwnBranding, setUseOwnBranding] = useState(true);
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [brokerageName, setBrokerageName] = useState('');
  const [colorPickerTarget, setColorPickerTarget] = useState<ColorPickerTarget | null>(null);

  const { data: branding, isLoading } = useAgentBrandingSettings();
  const updateMutation = useUpdateAgentBrandingSettings();
  const uploadMutation = useUploadAgentBrandingAsset();

  const showAlert = (title: string, message: string) =>
    setAlertModal({ visible: true, title, message, buttons: [{ text: 'OK', style: 'default' }] });

  useEffect(() => {
    if (!branding) return;
    setLogoUrl(branding.logoUrl ?? '');
    setPrimaryColor(branding.primaryColor ?? '');
    setSecondaryColor(branding.secondaryColor ?? '');
    setTheme(branding.theme ?? '');
    setEmailFooter(branding.emailFooter ?? '');
    setShowAgentName(branding.showAgentName ?? true);
    setUseOwnBranding(branding.useOwnBranding ?? true);
    setAgentName(branding.agentName ?? '');
    setAgentEmail(branding.agentEmail ?? '');
    setBrokerageName(branding.brokerageName ?? '');
  }, [branding]);

  const resetForm = () => {
    if (!branding) return;
    setLogoUrl(branding.logoUrl ?? '');
    setPrimaryColor(branding.primaryColor ?? '');
    setSecondaryColor(branding.secondaryColor ?? '');
    setTheme(branding.theme ?? '');
    setEmailFooter(branding.emailFooter ?? '');
    setShowAgentName(branding.showAgentName ?? true);
    setUseOwnBranding(branding.useOwnBranding ?? true);
    setAgentName(branding.agentName ?? '');
    setAgentEmail(branding.agentEmail ?? '');
    setBrokerageName(branding.brokerageName ?? '');
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
      const fileName = asset.fileName ?? asset.uri.split('/').pop() ?? 'agent-logo.jpg';
      const ext = getFileExtension(fileName, 'jpg');
      const contentType = LOGO_MIME_MAP[ext];
      if (!contentType) {
        showAlert('Unsupported file', 'Logo must be a JPG, PNG, or WebP image.');
        return;
      }
      const prepared = await prepareImageForUpload({
        uri: asset.uri,
        fileName,
        contentType,
        fileSizeMb: toFileSizeMb(asset.fileSize),
      });
      const response = await uploadMutation.mutateAsync({
        file: prepared.blob,
        contentType: prepared.contentType,
        fileName: prepared.fileName,
        fileSizeMb: prepared.fileSizeMb,
        assetType: 'logo',
      });
      setLogoUrl(response.fileUrl);
      showAlert('Success', 'Agent branding logo uploaded successfully.');
    } catch (err: any) {
      showAlert('Upload failed', err?.response?.data?.message || err.message || 'Failed to upload logo.');
    }
  };

  const handleSave = () => {
    if (!agentName.trim() || !agentEmail.trim() || !brokerageName.trim()) {
      showAlert('Validation', 'Agent name, agent email, and brokerage name are required.');
      return;
    }
    const payload: UpdateAgentBrandingSettingsPayload = {
      logoUrl: logoUrl.trim() || null,
      primaryColor: primaryColor.trim() || null,
      secondaryColor: secondaryColor.trim() || null,
      theme: theme.trim() || null,
      emailFooter: emailFooter.trim() || null,
      faviconUrl: branding?.faviconUrl ?? null,
      showAgentName,
      useOwnBranding,
      agentName: agentName.trim(),
      agentEmail: agentEmail.trim(),
      brokerageName: brokerageName.trim(),
    };
    updateMutation.mutate(payload, {
      onSuccess: () => showAlert('Success', 'Agent branding updated successfully.'),
      onError: (err: any) =>
        showAlert('Error', err?.response?.data?.message || err.message || 'Failed to update branding.'),
    });
  };

  const selectedPickerColor =
    colorPickerTarget === 'secondary'
      ? safeColor(secondaryColor, '#1e293b')
      : safeColor(primaryColor, '#7c3aed');
  const selectedPickerTitle = colorPickerTarget === 'secondary' ? 'Secondary Color' : 'Primary Color';
  const setSelectedPickerColor = (next: string) => {
    if (colorPickerTarget === 'secondary') {
      setSecondaryColor(next);
    } else {
      setPrimaryColor(next);
    }
  };

  const renderColorButton = (label: string, value: string, fallback: string, target: ColorPickerTarget) => {
    const selected = safeColor(value, fallback);
    return (
      <View style={styles.colorBlock}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TouchableOpacity style={styles.colorButton} onPress={() => setColorPickerTarget(target)}>
          <View style={styles.colorMeta}>
            <View style={[styles.colorDot, { backgroundColor: selected }]} />
            <View>
              <Text style={styles.colorName}>{colorName(selected)}</Text>
              <Text style={styles.colorHint}>Tap to choose</Text>
            </View>
          </View>
          <Text style={styles.chooseText}>Choose</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={globalStyles.screenContainer}>
      <ScrollView
        style={globalStyles.flex1}
        contentContainerStyle={[styles.content, { paddingBottom: footerHeight + 16 }]}
      >
        <Card style={styles.card}>
          <CardHeader>
            <CardTitle>Agent Branding</CardTitle>
            <CardDescription>Customize how your name, logo, and colors appear to clients.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ActivityIndicator color="#7c3aed" style={{ marginVertical: 28 }} />
            ) : (
              <View>
                <View style={styles.formSection}>
                  <Text style={styles.sectionLabel}>IDENTITY</Text>
                  <Text style={styles.fieldLabel}>Agent Name *</Text>
                  <TextInput style={styles.input} value={agentName} onChangeText={setAgentName} />
                  <Text style={styles.fieldLabel}>Agent Email *</Text>
                  <TextInput
                    style={styles.input}
                    value={agentEmail}
                    onChangeText={setAgentEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Text style={styles.fieldLabel}>Brokerage Name *</Text>
                  <TextInput style={styles.input} value={brokerageName} onChangeText={setBrokerageName} />
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.sectionLabel}>BRANDING</Text>
                  <View style={[styles.switchRow, styles.firstSwitchRow]}>
                    <View style={styles.switchMeta}>
                      <Text style={styles.switchLabel}>Use Own Branding</Text>
                      <Text style={styles.switchHint}>Use your logo and colors instead of brokerage defaults</Text>
                    </View>
                    <Switch
                      value={useOwnBranding}
                      onValueChange={setUseOwnBranding}
                      trackColor={{ false: '#e2e8f0', true: '#7c3aed' }}
                      thumbColor="#ffffff"
                    />
                  </View>

                  <Text style={styles.fieldLabel}>Logo</Text>
                  <View style={styles.logoRow}>
                    <View style={styles.logoPreview}>
                      {logoUrl ? (
                        <Image source={{ uri: logoUrl }} style={styles.logoImage} resizeMode="contain" />
                      ) : (
                        <Camera size={24} color={colors.text.muted} />
                      )}
                    </View>
                    <View style={styles.logoActions}>
                      <Text style={styles.helpText}>JPG, PNG, or WebP. Max 5 MB.</Text>
                      <TouchableOpacity
                        style={[styles.outlineButton, uploadMutation.isPending && styles.disabled]}
                        onPress={handleUploadLogo}
                        disabled={uploadMutation.isPending}
                      >
                        {uploadMutation.isPending ? (
                          <ActivityIndicator color="#7c3aed" />
                        ) : (
                          <View style={styles.iconText}>
                            <Upload size={16} color="#7c3aed" />
                            <Text style={styles.outlineButtonText}>{logoUrl ? 'Replace Logo' : 'Upload Logo'}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {renderColorButton('Primary Color', primaryColor, '#7c3aed', 'primary')}
                  {renderColorButton('Secondary Color', secondaryColor, '#1e293b', 'secondary')}

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
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    placeholder="Thanks for working with me."
                    placeholderTextColor="#94a3b8"
                  />

                  <View style={styles.switchRow}>
                    <View style={styles.switchMeta}>
                      <Text style={styles.switchLabel}>Show Agent Name</Text>
                      <Text style={styles.switchHint}>Display your name on client-facing pages</Text>
                    </View>
                    <Switch
                      value={showAgentName}
                      onValueChange={setShowAgentName}
                      trackColor={{ false: '#e2e8f0', true: '#7c3aed' }}
                      thumbColor="#ffffff"
                    />
                  </View>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity style={styles.resetButton} onPress={resetForm}>
                    <View style={styles.iconText}>
                      <RotateCcw size={16} color="#64748b" />
                      <Text style={styles.resetText}>Reset</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, updateMutation.isPending && styles.disabled]}
                    onPress={handleSave}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <View style={styles.iconText}>
                        <Save size={16} color="#ffffff" />
                        <Text style={styles.saveText}>Save Branding</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </CardContent>
        </Card>
      </ScrollView>

      <Modal visible={colorPickerTarget !== null} animationType="slide" onRequestClose={() => setColorPickerTarget(null)}>
        <View style={styles.pickerScreen}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity style={styles.iconButton} onPress={() => setColorPickerTarget(null)}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
            <View style={styles.pickerTitleWrap}>
              <Text style={styles.pickerTitle}>{selectedPickerTitle}</Text>
              <Text style={styles.pickerSubtitle}>Choose a client-facing brand color</Text>
            </View>
            <TouchableOpacity style={styles.doneButton} onPress={() => setColorPickerTarget(null)}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.previewPanel}>
            <View style={[styles.previewSwatch, { backgroundColor: selectedPickerColor }]} />
            <View>
              <Text style={styles.previewName}>{colorName(selectedPickerColor)}</Text>
              <Text style={styles.previewHint}>Saved as branding color</Text>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.pickerContent}>
            <View style={styles.pickerGrid}>
              {COLOR_PICKER_SWATCHES.map((preset) => {
                const active = selectedPickerColor.toLowerCase() === preset.value.toLowerCase();
                return (
                  <TouchableOpacity
                    key={preset.value}
                    style={[styles.pickerOption, active && styles.pickerOptionActive]}
                    onPress={() => setSelectedPickerColor(preset.value)}
                  >
                    <View style={[styles.pickerSwatch, { backgroundColor: preset.value }]}>
                      {active ? <Check size={18} color="#ffffff" /> : null}
                    </View>
                    <Text style={[styles.pickerName, active && styles.pickerNameActive]}>{preset.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>
      <AlertModal modal={alertModal} onDismiss={() => setAlertModal(null)} />
      <AgentFooter />
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
    marginBottom: 14,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#7c3aed', letterSpacing: 0.8 },
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
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  logoPreview: {
    width: 76,
    height: 76,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: '100%', height: '100%' },
  logoActions: { flex: 1, gap: 8 },
  helpText: { color: '#64748b', fontSize: 12, lineHeight: 16 },
  outlineButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7c3aed',
    paddingVertical: 10,
    alignItems: 'center',
  },
  outlineButtonText: { color: '#7c3aed', fontSize: 14, fontWeight: '600' },
  colorBlock: { marginTop: 4 },
  colorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
  },
  colorMeta: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.14)',
    marginRight: 10,
  },
  colorName: { color: '#1e293b', fontSize: 14, fontWeight: '700' },
  colorHint: { color: '#64748b', fontSize: 12, marginTop: 1 },
  chooseText: { color: '#7c3aed', fontSize: 13, fontWeight: '700' },
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
  themeOptionActive: { backgroundColor: '#7c3aed' },
  themeOptionText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  themeOptionTextActive: { color: '#ffffff' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  firstSwitchRow: { marginTop: 10, marginBottom: 2 },
  switchMeta: { flex: 1, marginRight: 12 },
  switchLabel: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
  switchHint: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  resetButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resetText: { fontSize: 15, color: '#64748b', fontWeight: '500' },
  saveButton: { flex: 2, backgroundColor: '#7c3aed', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  iconText: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  disabled: { opacity: 0.6 },
  pickerScreen: { flex: 1, backgroundColor: '#f8fafc' },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickerTitleWrap: { flex: 1, marginHorizontal: 12 },
  pickerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  pickerSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  doneButton: { borderRadius: 18, backgroundColor: '#7c3aed', paddingHorizontal: 14, paddingVertical: 9 },
  doneText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  previewPanel: {
    margin: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewSwatch: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.14)',
    marginRight: 12,
  },
  previewName: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  previewHint: { fontSize: 12, color: '#64748b', marginTop: 3 },
  pickerContent: { paddingHorizontal: 16, paddingBottom: 28 },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pickerOption: {
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
  pickerOptionActive: { borderColor: '#7c3aed', backgroundColor: '#faf5ff' },
  pickerSwatch: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerName: { marginTop: 7, color: '#64748b', fontSize: 11, fontWeight: '700' },
  pickerNameActive: { color: '#7c3aed' },
});
