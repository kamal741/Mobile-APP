import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { reviewScreenStyles as S } from '../styles/reviewScreenStyles';
import { hasAnswer, formatAnswer } from '../utils/preferenceHelpers';
import type { ScreenDef, Answers } from '../types/preferences';

interface Props {
  screens: ScreenDef[];
  answers: Answers;
}

export function ReviewScreen({ screens, answers }: Props) {
  const allFields   = screens.flatMap(s => s.fields);
  const allTotal    = allFields.length;
  const allAnswered = allFields.filter(f => hasAnswer(answers[f.key])).length;

  return (
    <ScrollView contentContainerStyle={S.reviewScroll} showsVerticalScrollIndicator={false}>
      <View style={S.reviewHeader}>
        <Text style={S.reviewEmoji}>🎉</Text>
        <Text style={S.reviewTitle}>Review Your Preferences</Text>
        <Text style={S.reviewSub}>
          {allAnswered} of {allTotal} answered — looks good? Hit Submit!
        </Text>
      </View>

      {screens.map(screen => {
        const reviewFields = screen.fields;
        if (reviewFields.length === 0) return null;
        const answeredInSection = reviewFields.filter(f => hasAnswer(answers[f.key])).length;

        return (
          <View key={screen.key} style={S.reviewGroup}>
            <View style={S.reviewGroupHdr}>
              <View style={[S.reviewGroupDot, { backgroundColor: screen.dotColor }]} />
              <Text style={S.reviewGroupTitle}>{screen.title}</Text>
              <View style={[S.reviewGroupBadge, { borderColor: screen.dotColor }]}>
                <Text style={[S.reviewGroupBadgeTxt, { color: screen.dotColor }]}>
                  {answeredInSection}/{reviewFields.length}
                </Text>
              </View>
            </View>

            <View style={S.reviewCard}>
              {reviewFields.map((f, i) => {
                const isAnswered = hasAnswer(answers[f.key]);

                return (
                  <View
                    key={f.key}
                    style={[S.reviewRow, i < reviewFields.length - 1 && S.reviewRowBorder]}
                  >
                    <View style={S.reviewRowLeft}>
                      <Text style={S.reviewRowLabel}>{f.label}</Text>
                      {f.subLabel ? (
                        <Text style={S.reviewRowSubLabel}>{f.subLabel}</Text>
                      ) : null}
                    </View>
                    <Text
                      style={[S.reviewRowValue, !isAnswered && S.reviewRowValueEmpty]}
                      numberOfLines={2}
                    >
                      {isAnswered ? formatAnswer(answers[f.key], f.valueType) : 'Not set'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}

      <View style={S.submitNote}>
        <Text style={S.submitNoteTxt}>
          💡 Your agent will use these preferences to find the best property matches.
          You can update them at any time.
        </Text>
      </View>
    </ScrollView>
    
  );
}

