import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, spacing } from '../styles/shared.styles';

export interface BrokerageEditPayload {
  name: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
}

interface Props {
  visible:     boolean;
  initialData: BrokerageEditPayload;
  isLoading:   boolean;
  onClose:     () => void;
  onSubmit:    (payload: BrokerageEditPayload) => void;
}

export function BrokerEditModal({ visible, initialData, isLoading, onClose, onSubmit }: Props) {
  const [name,         setName]         = useState(initialData.name);
  const [contactEmail, setContactEmail] = useState(initialData.contactEmail);
  const [contactPhone, setContactPhone] = useState(initialData.contactPhone);
  const [website,      setWebsite]      = useState(initialData.website);

  // Sync if parent data changes
  useEffect(() => {
    setName(initialData.name);
    setContactEmail(initialData.contactEmail);
    setContactPhone(initialData.contactPhone);
    setWebsite(initialData.website);
  }, [initialData]);

  const handleSubmit = () => {
    onSubmit({ name, contactEmail, contactPhone, website });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          <Text style={styles.title}>Edit Brokerage Profile</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {([
              { label: 'Brokerage Name *', value: name,         setter: setName,         placeholder: 'e.g. Apex Realty Group',     keyboard: 'default'        },
              { label: 'Contact Email',    value: contactEmail, setter: setContactEmail, placeholder: 'contact@brokerage.com',       keyboard: 'email-address'  },
              { label: 'Contact Phone',   value: contactPhone, setter: setContactPhone, placeholder: '+1 555 000 0000',             keyboard: 'phone-pad'      },
              { label: 'Website',          value: website,      setter: setWebsite,      placeholder: 'https://brokerage.com',       keyboard: 'url'            },
            ] as const).map((field) => (
              <View key={field.label} style={styles.fieldWrap}>
                <Text style={styles.label}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  value={field.value}
                  onChangeText={field.setter as (t: string) => void}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.textDisabled}
                  keyboardType={field.keyboard as any}
                  autoCapitalize="none"
                />
              </View>
            ))}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isLoading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, isLoading && styles.saveBtnDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading
                ? <ActivityIndicator size="small" color={colors.textInverted} />
                : <Text style={styles.saveText}>Save Changes</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    marginTop: 12,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  fieldWrap: { marginBottom: spacing.md },
  label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    backgroundColor: colors.bgPage,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgMuted,
  },
  cancelText: { fontSize: 15, color: colors.textBody, fontWeight: '500' },
  saveBtn: {
    flex: 2,
    backgroundColor: colors.brand,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: colors.textInverted, fontSize: 15, fontWeight: '600' },
});
