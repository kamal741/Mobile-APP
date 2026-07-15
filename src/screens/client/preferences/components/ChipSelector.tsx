import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { fieldRowStyles as S } from "../styles/fieldRowStyles";

interface Props {
  options: string[];
  isMulti: boolean;
  isSelected: (opt: string) => boolean;
  onSelect: (opt: string) => void;
}

export function ChipSelector({
  options,
  isMulti,
  isSelected,
  onSelect,
}: Props) {
  return (
    <View style={S.chipsWrap}>
      {(options ?? []).map((opt) => {
        const selected = isSelected(opt);
        return (
          <TouchableOpacity
            key={opt}
            activeOpacity={0.7}
            onPress={() => onSelect(opt)}
            style={[S.chip, selected && S.chipSel]}
          >
            {selected && <Text style={S.chipTick}>✓ </Text>}
            <Text style={[S.chipTxt, selected && S.chipTxtSel]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
