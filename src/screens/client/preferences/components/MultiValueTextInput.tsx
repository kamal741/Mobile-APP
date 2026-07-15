import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { fieldRowStyles as S } from '../styles/fieldRowStyles';
import { Colors } from '../constants/theme';

interface Props {
  values:       string[];
  onChange:     (values: string[]) => void;
  placeholder?: string;
  hasError?:    boolean;
}

function parseTokens(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

export function MultiValueTextInput({
  values,
  onChange,
  placeholder = 'Type an area and press Add',
  hasError = false,
}: Props) {
  const [draft, setDraft] = useState('');

  function addValues(next: string[]) {
    if (next.length === 0) return;
    const seen = new Set(values.map(v => v.toLowerCase()));
    const merged = [...values];
    for (const item of next) {
      const key = item.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }
    onChange(merged);
  }

  function handleAdd() {
    const tokens = parseTokens(draft);
    if (tokens.length === 0) return;
    addValues(tokens);
    setDraft('');
  }

  function removeAt(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <TextInput
          style={[S.textInput, styles.flexInput, hasError && styles.inputError]}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
          blurOnSubmit={false}
          autoCapitalize="words"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.addBtn, !draft.trim() && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={!draft.trim()}
          activeOpacity={0.75}
        >
          <Text style={styles.addBtnTxt}>Add</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>Separate multiple areas with commas or tap Add after each one.</Text>

      {values.length > 0 && (
        <View style={S.chipsWrap}>
          {values.map((item, index) => (
            <TouchableOpacity
              key={`${item}-${index}`}
              style={[S.chip, S.chipSel]}
              onPress={() => removeAt(index)}
              activeOpacity={0.7}
            >
              <Text style={S.chipTxtSel}>{item}</Text>
              <Text style={styles.removeIcon}> ×</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flexInput: {
    flex: 1,
  },
  inputError: {
    borderColor: '#FC8181',
    borderWidth: 1.5,
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  addBtnDisabled: {
    opacity: 0.45,
  },
  addBtnTxt: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  removeIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
});
