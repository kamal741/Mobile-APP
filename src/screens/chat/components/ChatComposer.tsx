import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Text,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { AtSign, SendHorizonal, X } from 'lucide-react-native';
import { colors, fontSize, fontWeight } from '@/theme';
import type { ChatReplyContext } from '../../../lib/chat/display';

export interface ChatMentionCandidate {
  key: string;
  id: number;
  name: string;
  handle: string;
  kind: 'agent' | 'client';
}

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending?: boolean;
  disabled?: boolean;
  replyTo?: ChatReplyContext | null;
  onCancelReply?: () => void;
  mentionCandidates?: ChatMentionCandidate[];
  onLayout?: (height: number) => void;
  onFocusChange?: (focused: boolean) => void;
}

const LINE_HEIGHT = 22;
const MAX_LINES = 5;
const MIN_HEIGHT = 50;
const VERTICAL_PADDING = Platform.OS === 'ios' ? 10 : 8;
const MAX_HEIGHT = LINE_HEIGHT * MAX_LINES + VERTICAL_PADDING * 2;

export function ChatComposer({
  value,
  onChange,
  onSend,
  sending = false,
  disabled = false,
  replyTo = null,
  onCancelReply,
  mentionCandidates = [],
  onLayout,
  onFocusChange,
}: ChatComposerProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [inputHeight, setInputHeight] = useState(MIN_HEIGHT);
  const [selectionEnd, setSelectionEnd] = useState(value.length);
  const canSend = value.trim().length > 0 && !sending && !disabled;

  const activeMention = useMemo(() => {
    const beforeCursor = value.slice(0, selectionEnd);
    const atIndex = beforeCursor.lastIndexOf('@');
    if (atIndex < 0) return null;
    if (atIndex > 0 && !/\s/.test(beforeCursor[atIndex - 1])) return null;
    const query = beforeCursor.slice(atIndex + 1);
    if (/\s/.test(query)) return null;
    return { atIndex, query: query.toLowerCase() };
  }, [selectionEnd, value]);

  const mentionMatches = useMemo(() => {
    if (!activeMention) return [];
    return mentionCandidates
      .filter((candidate) => {
        const query = activeMention.query;
        return (
          candidate.name.toLowerCase().includes(query) ||
          candidate.handle.toLowerCase().includes(query)
        );
      })
      .slice(0, 5);
  }, [activeMention, mentionCandidates]);

  useEffect(() => {
    if (value.length === 0) {
      setInputHeight(MIN_HEIGHT);
    }
  }, [value]);

  const handleSendPress = () => {
    if (!canSend) return;
    setInputHeight(MIN_HEIGHT);
    onSend();
  };

  const selectMention = (candidate: ChatMentionCandidate) => {
    if (!activeMention) return;
    const replacement = `@${candidate.handle} `;
    const nextValue =
      value.slice(0, activeMention.atIndex) +
      replacement +
      value.slice(selectionEnd);
    const nextSelection = activeMention.atIndex + replacement.length;
    onChange(nextValue);
    setSelectionEnd(nextSelection);
  };

  const handleContentSizeChange: TextInput['props']['onContentSizeChange'] = (
    event,
  ) => {
    const contentHeight = Math.ceil(event.nativeEvent.contentSize.height);
    const paddedHeight =
      Platform.OS === 'ios'
        ? contentHeight + VERTICAL_PADDING * 2
        : contentHeight;

    setInputHeight(
      value.length
        ? Math.min(Math.max(paddedHeight, MIN_HEIGHT), MAX_HEIGHT)
        : MIN_HEIGHT,
    );
  };

  const resolvedInputHeight = Math.min(
    Math.max(inputHeight, MIN_HEIGHT),
    MAX_HEIGHT,
  );

  return (
    <View
      onLayout={(event) => onLayout?.(event.nativeEvent.layout.height)}
      style={styles.wrapper}
    >
      <View style={styles.bar}>
        <View style={styles.inputColumn}>
          {mentionMatches.length > 0 ? (
            <View style={styles.mentionMenu}>
              <Text style={styles.mentionHeading}>Mention someone</Text>
              {mentionMatches.map((candidate) => (
                <TouchableOpacity
                  key={candidate.key}
                  style={styles.mentionOption}
                  onPress={() => selectMention(candidate)}
                  activeOpacity={0.7}
                >
                  <View style={styles.mentionAvatar}>
                    <Text style={styles.mentionAvatarText}>
                      {candidate.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.mentionDetails}>
                    <Text style={styles.mentionName} numberOfLines={1}>
                      {candidate.name}
                    </Text>
                    <Text style={styles.mentionRole}>
                      {candidate.kind === 'agent' ? 'Agent' : 'Client'}
                    </Text>
                  </View>
                  <AtSign size={17} color={colors.primary.default} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {replyTo ? (
            <View style={styles.replyBar}>
              <View style={styles.replyAccent} />
              <View style={styles.replyText}>
                <Text style={styles.replyLabel} numberOfLines={1}>
                  Replying to {replyTo.senderName}
                </Text>
                <Text style={styles.replyPreview} numberOfLines={1}>
                  {replyTo.preview}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onCancelReply}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.cancelReplyButton}
              >
                <X size={16} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
          ) : null}

          <TextInput
            style={[
              styles.input,
              isFocused && styles.inputFocused,
              Platform.OS === 'ios'
                ? {
                    minHeight: MIN_HEIGHT,
                    maxHeight: MAX_HEIGHT,
                  }
                : {
                    height: resolvedInputHeight,
                  },
            ]}
            value={value}
            onChangeText={onChange}
            onSelectionChange={(event) =>
              setSelectionEnd(event.nativeEvent.selection.end)
            }
            placeholder="Write a message or type @..."
            placeholderTextColor="#90A8C3"
            multiline
            blurOnSubmit={false}
            submitBehavior="newline"
            maxLength={2000}
            editable={!disabled}
            cursorColor="#90A8C3"
            selectionColor="#B8D0E8"
            underlineColorAndroid="transparent"
            scrollEnabled={inputHeight >= MAX_HEIGHT}
            onFocus={() => {
              setIsFocused(true);
              onFocusChange?.(true);
            }}
            onBlur={() => {
              setIsFocused(false);
              onFocusChange?.(false);
            }}
            onContentSizeChange={handleContentSizeChange}
          />
        </View>

        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSendPress}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#90A8C3" />
          ) : (
            <SendHorizonal
              size={22}
              color={canSend ? colors.primary.default : '#90A8C3'}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
    backgroundColor: colors.background.surface,
  },
  inputColumn: {
    flex: 1,
    gap: 8,
  },
  mentionMenu: {
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.surface,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 6,
  },
  mentionHeading: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  mentionOption: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.light,
  },
  mentionAvatar: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#E8F0FF',
  },
  mentionAvatarText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary.default,
  },
  mentionDetails: {
    flex: 1,
  },
  mentionName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
    color: colors.text.primary,
  },
  mentionRole: {
    marginTop: 1,
    fontSize: fontSize.xs,
    color: colors.text.secondary,
  },
  replyBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  replyAccent: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: colors.primary.default,
  },
  replyText: {
    flex: 1,
    gap: 2,
  },
  replyLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary.default,
  },
  replyPreview: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
  },
  cancelReplyButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.background.surface,
  },
  input: {
    fontSize: fontSize.md,
    lineHeight: LINE_HEIGHT,
    color: '#2C4A6B',
    paddingVertical: VERTICAL_PADDING,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#D6E4F0',
    ...(Platform.OS === 'android'
      ? { textAlignVertical: 'center' as const }
      : {}),
  },
  inputFocused: {
    marginHorizontal: -2,
    borderWidth: 2,
    borderColor: '#000000',
  },
  sendButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: VERTICAL_PADDING / 2,
  },
});
