import React from 'react';
import { View, Text } from 'react-native';
import { createOfferStyles as s } from '../../styles/createOffer.styles';

interface Props {
  icon:     string;
  title:    string;
  subtitle: string;
}

export function OfferStepHeader({ icon, title, subtitle }: Props) {
  return (
    <View style={s.stepHeader}>
      <Text style={s.stepHeaderIcon}>{icon}</Text>
      <Text style={s.stepHeaderTitle}>{title}</Text>
      <Text style={s.stepHeaderSubtitle}>{subtitle}</Text>
    </View>
  );
}
