import type { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import {
  Check,
  CheckCheck,
  MoreHorizontal,
  Reply,
  Trash2,
  X,
} from 'lucide-react-native';
import { colors, border, fontSize, fontWeight } from '@/theme';
import {
  decodeMessageText,
  formatDateHeader,
  formatMessageTime,
  isOwnMessage,
  parseReplyMessageText,
} from '../../../lib/chat/display';
import type { ChatMessage, ChatRole } from '../../../lib/chat/types';

interface MessageBubbleProps {
  message: ChatMessage;
  role: ChatRole;
  userId: string;
  showDateHeader: boolean;
  isRead?: boolean;
  senderName?: string | null;
  /** Optional extra content rendered inside the bubble, below the text. */
  footer?: ReactNode;
  onOpenActions?: () => void;
  actionsVisible?: boolean;
  canDelete?: boolean;
  onReply?: () => void;
  onDelete?: () => void;
  onDismissActions?: () => void;
  selected?: boolean;
}

function renderMessageText(text: string, mine: boolean) {
  return text.split(/(@[a-zA-Z0-9_]+)/g).map((part, index) =>
    part.startsWith('@') ? (
      <Text
        key={`${part}-${index}`}
        style={[styles.mention, mine ? styles.mentionMine : styles.mentionTheirs]}
      >
        {part}
      </Text>
    ) : (
      part
    ),
  );
}

export function MessageBubble({
  message,
  role,
  userId,
  showDateHeader,
  isRead = false,
  senderName = null,
  footer = null,
  onOpenActions,
  actionsVisible = false,
  canDelete = false,
  onReply,
  onDelete,
  onDismissActions,
  selected = false,
}: Readonly<MessageBubbleProps>) {
  const mine = isOwnMessage(message, role, userId);
  const { replyTo, body: text } = parseReplyMessageText(decodeMessageText(message));

  return (
    <>
      {showDateHeader ? (
        <View style={styles.dateHeader}>
          <Text style={styles.dateHeaderText}>{formatDateHeader(message.createdAt)}</Text>
        </View>
      ) : null}

      {/* Outer row — controls left/right alignment */}
      <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
        {/* Column — maxWidth keeps bubbles from filling the screen */}
        <View style={[styles.column, mine ? styles.columnMine : styles.columnTheirs]}>
          {senderName ? (
            <Text
              style={[styles.senderName, mine ? styles.senderNameMine : styles.senderNameTheirs]}
            >
              {senderName}
            </Text>
          ) : null}

          {/* Bubble */}
          <Pressable
            style={[
              styles.bubble,
              mine ? styles.bubbleMine : styles.bubbleTheirs,
              selected && (mine ? styles.bubbleSelectedMine : styles.bubbleSelectedTheirs),
            ]}
            onLongPress={onOpenActions}
            delayLongPress={300}
            accessibilityHint="Long press for message options"
          >
            {replyTo ? (
              <View style={[styles.replyPreview, mine ? styles.replyPreviewMine : styles.replyPreviewTheirs]}>
                <View style={styles.replyIconWrap}>
                  <Reply size={12} color={mine ? colors.text.inverse : colors.primary.default} />
                </View>
                <View style={styles.replyTextWrap}>
                  <Text
                    style={[styles.replySender, mine ? styles.replySenderMine : styles.replySenderTheirs]}
                    numberOfLines={1}
                  >
                    {replyTo.senderName}
                  </Text>
                  <Text
                    style={[styles.replySnippet, mine ? styles.replySnippetMine : styles.replySnippetTheirs]}
                    numberOfLines={2}
                  >
                    {replyTo.preview}
                  </Text>
                </View>
              </View>
            ) : null}
            <Text style={[styles.text, mine ? styles.textMine : styles.textTheirs]}>
              {renderMessageText(text, mine)}
            </Text>
            {footer ? <View style={styles.footerContainer}>{footer}</View> : null}
          </Pressable>

          {actionsVisible ? (
            <View
              style={[
                styles.inlineActions,
                mine ? styles.inlineActionsMine : styles.inlineActionsTheirs,
              ]}
            >
              <TouchableOpacity
                style={styles.inlineAction}
                onPress={onReply}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Reply to message"
              >
                <Reply size={16} color={colors.primary.default} />
                <Text style={styles.inlineActionText}>Reply</Text>
              </TouchableOpacity>

              {canDelete ? (
                <>
                  <View style={styles.actionDivider} />
                  <TouchableOpacity
                    style={styles.inlineAction}
                    onPress={onDelete}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Delete message"
                  >
                    <Trash2 size={16} color="#DC2626" />
                    <Text style={styles.deleteActionText}>Delete</Text>
                  </TouchableOpacity>
                </>
              ) : null}

              <View style={styles.actionDivider} />
              <TouchableOpacity
                style={styles.dismissAction}
                onPress={onDismissActions}
                accessibilityRole="button"
                accessibilityLabel="Close message options"
              >
                <X size={16} color={colors.text.muted} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Timestamp + read receipt — outside bubble */}
          <View style={[styles.meta, mine ? styles.metaMine : styles.metaTheirs]}>
            <Text style={[styles.time, mine ? styles.timeMine : styles.timeTheirs]}>
              {formatMessageTime(message.createdAt)}
            </Text>
            {mine ? (
              isRead ? (
                <CheckCheck size={13} color={colors.primary.default} />
              ) : (
                <Check size={13} color={colors.text.muted} />
              )
            ) : null}
            {onOpenActions ? (
              <TouchableOpacity
                onPress={onOpenActions}
                style={[styles.moreButton, actionsVisible && styles.moreButtonActive]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Message options"
              >
                <MoreHorizontal
                  size={17}
                  color={actionsVisible ? colors.primary.default : colors.text.muted}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  dateHeader: {
    alignItems: 'center',
    marginVertical: 14,
  },
  dateHeaderText: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    backgroundColor: colors.background.subtle,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: border.radius.btn,
  },

  /* ── Row (full width, aligns bubble left or right) ── */
  row: {
    flexDirection: 'row',
    marginBottom: 2,
    paddingHorizontal: 12,
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowTheirs: {
    justifyContent: 'flex-start',
  },

  /* ── Column (constrains bubble width) ── */
  column: {
    maxWidth: '78%',
  },
  columnMine: {
    alignItems: 'flex-end',
  },
  columnTheirs: {
    alignItems: 'flex-start',
  },

  senderName: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semiBold,
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  senderNameMine: {
    color: colors.text.secondary,
    textAlign: 'right',
  },
  senderNameTheirs: {
    color: colors.primary.default,
  },

  /* ── Bubble ── */
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    // Sharp corner on the "tail" side mimics WA/iMessage
    borderRadius: 18,
  },
  bubbleMine: {
    backgroundColor: colors.primary.default,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: colors.background.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  bubbleSelectedMine: {
    shadowColor: colors.primary.default,
    shadowOpacity: 0.22,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  bubbleSelectedTheirs: {
    borderColor: '#93B4F5',
    shadowColor: colors.primary.default,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  inlineActions: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
    marginBottom: 1,
    overflow: 'hidden',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#D8E2F0',
    backgroundColor: colors.background.surface,
    shadowColor: '#0F172A',
    shadowOpacity: 0.09,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  inlineActionsMine: {
    alignSelf: 'flex-end',
  },
  inlineActionsTheirs: {
    alignSelf: 'flex-start',
  },
  inlineAction: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 11,
  },
  inlineActionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
    color: colors.primary.default,
  },
  deleteActionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
    color: '#DC2626',
  },
  actionDivider: {
    width: StyleSheet.hairlineWidth,
    height: 18,
    backgroundColor: '#D8E2F0',
  },
  dismissAction: {
    width: 34,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  text: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  textMine: {
    color: colors.text.inverse,
  },
  textTheirs: {
    color: colors.text.primary,
  },
  mention: {
    fontWeight: fontWeight.bold,
  },
  mentionMine: {
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
  mentionTheirs: {
    color: colors.primary.default,
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  replyPreviewMine: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  replyPreviewTheirs: {
    backgroundColor: colors.background.subtle,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  replyIconWrap: {
    paddingTop: 2,
  },
  replyTextWrap: {
    flex: 1,
  },
  replySender: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    marginBottom: 2,
  },
  replySenderMine: {
    color: colors.text.inverse,
  },
  replySenderTheirs: {
    color: colors.primary.default,
  },
  replySnippet: {
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  replySnippetMine: {
    color: colors.text.inverse,
  },
  replySnippetTheirs: {
    color: colors.text.secondary,
  },

  footerContainer: {
    marginTop: 8,
  },

  /* ── Timestamp row — sits below bubble ── */
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  metaMine: {
    justifyContent: 'flex-end',
  },
  metaTheirs: {
    justifyContent: 'flex-start',
  },
  time: {
    fontSize: fontSize.xs,
  },
  timeMine: {
    color: colors.text.muted,
  },
  timeTheirs: {
    color: colors.text.muted,
  },
  moreButton: {
    width: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.background.subtle,
  },
  moreButtonActive: {
    backgroundColor: '#E8F0FF',
  },
});









// import type { ReactNode } from 'react';
// import { View, Text, StyleSheet } from 'react-native';
// import { Check, CheckCheck } from 'lucide-react-native';
// import { colors, border, fontSize, fontWeight } from '@/theme';
// import {
//   decodeMessageText,
//   formatDateHeader,
//   formatMessageTime,
//   isOwnMessage,
// } from '../../../lib/chat/display';
// import type { ChatMessage, ChatRole } from '../../../lib/chat/types';

// interface MessageBubbleProps {
//   message: ChatMessage;
//   role: ChatRole;
//   userId: string;
//   showDateHeader: boolean;
//   isRead?: boolean;
//   senderName?: string | null;
//   footer?: ReactNode;
// }

// export function MessageBubble({
//   message,
//   role,
//   userId,
//   showDateHeader,
//   isRead = false,
//   senderName = null,
//   footer = null,
// }: Readonly<MessageBubbleProps>) {
//   const mine = isOwnMessage(message, role, userId);
//   const text = decodeMessageText(message);

//   return (
//     <>
//       {showDateHeader ? (
//         <View style={styles.dateHeader}>
//           <Text style={styles.dateHeaderText}>{formatDateHeader(message.createdAt)}</Text>
//         </View>
//       ) : null}

//       <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
//         <View style={[mine ? styles.columnMine : styles.columnTheirs]}>
//           {senderName ? (
//             <Text style={[styles.senderName, mine ? styles.senderNameMine : styles.senderNameTheirs]}>
//               {senderName}
//             </Text>
//           ) : null}

//           {/* Bubble + tail wrapper */}
//           <View style={mine ? styles.tailWrapperMine : styles.tailWrapperTheirs}>
//             {/* Tail for "theirs" — rendered before bubble so it sits behind */}
//             {!mine && <View style={styles.tailTheirs} />}

//             <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
//               <Text style={[styles.text, mine ? styles.textMine : styles.textTheirs]}>{text}</Text>

//               {footer ? (
//                 <View style={styles.footerContainer}>{footer}</View>
//               ) : null}
//             </View>

//             {/* Tail for "mine" — rendered after bubble */}
//             {mine && <View style={styles.tailMine} />}
//           </View>

//           {/* Timestamp + read receipt — outside bubble, below-right */}
//           <View style={[styles.meta, mine ? styles.metaMine : styles.metaTheirs]}>
//             <Text style={[styles.time, mine ? styles.timeMine : styles.timeTheirs]}>
//               {formatMessageTime(message.createdAt)}
//             </Text>
//             {mine ? (
//               isRead ? (
//                 <CheckCheck size={14} color={colors.primary.default} />
//               ) : (
//                 <Check size={14} color={colors.text.muted} />
//               )
//             ) : null}
//           </View>
//         </View>
//       </View>
//     </>
//   );
// }

// const TAIL_SIZE = 10;

// const styles = StyleSheet.create({
//   dateHeader: {
//     alignItems: 'center',
//     marginVertical: 14,
//   },
//   dateHeaderText: {
//     fontSize: fontSize.xs,
//     color: colors.text.secondary,
//     backgroundColor: colors.background.subtle,
//     paddingHorizontal: 14,
//     paddingVertical: 6,
//     borderRadius: border.radius.btn,
//   },
//   row: {
//     flexDirection: 'row',
//     marginBottom: 2,
//   },
//   rowMine: {
//     justifyContent: 'flex-end',
//   },
//   rowTheirs: {
//     justifyContent: 'flex-start',
//   },
//   // column: {
//   //   maxWidth: '80%',
//   // },
//   columnMine: {
//     alignItems: 'flex-end',
//   },
//   columnTheirs: {
//     alignItems: 'flex-start',
//   },
//   senderName: {
//     fontSize: fontSize.xs,
//     fontWeight: fontWeight.semiBold,
//     marginBottom: 2,
//     paddingHorizontal: 4,
//   },
//   senderNameMine: {
//     color: colors.text.secondary,
//     textAlign: 'right',
//   },
//   senderNameTheirs: {
//     color: colors.primary.default,
//   },

//   /* ── Tail wrappers ── */
// tailWrapperMine: {
//   flexDirection: 'row',
//   alignItems: 'flex-end',
//   maxWidth: '80%',
// },
// tailWrapperTheirs: {
//   flexDirection: 'row',
//   alignItems: 'flex-end',
//   maxWidth: '80%',
// },

//   /* ── Tails ── */
//   // "Mine" tail — bottom-right corner, points right
//   tailMine: {
//     width: 0,
//     height: 0,
//     borderTopWidth: TAIL_SIZE,
//     borderTopColor: 'transparent',
//     borderLeftWidth: TAIL_SIZE,
//     borderLeftColor: colors.primary.default,
//     borderBottomWidth: 0,
//     marginBottom: 0,
//     alignSelf: 'flex-end',
//   },
//   // "Theirs" tail — bottom-left corner, points left
//   tailTheirs: {
//     width: 0,
//     height: 0,
//     borderTopWidth: TAIL_SIZE,
//     borderTopColor: 'transparent',
//     borderRightWidth: TAIL_SIZE,
//     borderRightColor: colors.background.surface,
//     borderBottomWidth: 0,
//     marginBottom: 0,
//     alignSelf: 'flex-end',
//   },

//   /* ── Bubble ── */
// bubble: {
//   paddingHorizontal: 14,
//   paddingVertical: 8,
//   borderRadius: 18,
//   flexShrink: 1,
//   minWidth: 60,   // ← prevents character-per-line wrapping
// },
// bubbleMine: {
//   backgroundColor: colors.primary.default,
//   borderBottomRightRadius: 4,
//   flexShrink: 1,   // ← only mine needs to shrink (tail is on the right)
// },
// bubbleTheirs: {
//   backgroundColor: colors.background.surface,
//   borderBottomLeftRadius: 4,
//   borderWidth: 1,
//   borderColor: colors.border.light,
//   flexShrink: 1,   // ← keep this too but fix below
// },

//   text: {
//     fontSize: fontSize.md,
//     lineHeight: 22,
//   },
//   textMine: {
//     color: colors.text.inverse,
//   },
//   textTheirs: {
//     color: colors.text.primary,
//   },

//   footerContainer: {
//     marginTop: 8,
//   },

//   /* ── Timestamp row — outside bubble ── */
//   meta: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 3,
//     marginTop: 3,
//     marginBottom: 8,
//     paddingHorizontal: 4,
//   },
//   metaMine: {
//     justifyContent: 'flex-end',
//   },
//   metaTheirs: {
//     justifyContent: 'flex-start',
//   },
//   time: {
//     fontSize: fontSize.xs,
//   },
//   timeMine: {
//     color: colors.text.muted,
//   },
//   timeTheirs: {
//     color: colors.text.muted,
//   },
// });





// import type { ReactNode } from 'react';
// import { View, Text, StyleSheet } from 'react-native';
// import { Check, CheckCheck } from 'lucide-react-native';
// import { colors, border, fontSize, fontWeight } from '@/theme';
// import {
//   decodeMessageText,
//   formatDateHeader,
//   formatMessageTime,
//   isOwnMessage,
// } from '../../../lib/chat/display';
// import type { ChatMessage, ChatRole } from '../../../lib/chat/types';

// interface MessageBubbleProps {
//   message: ChatMessage;
//   role: ChatRole;
//   userId: string;
//   showDateHeader: boolean;
//   isRead?: boolean;
//   senderName?: string | null;
//   /** Optional extra content rendered inside the bubble, on the same row as the timestamp (left side). */
//   footer?: ReactNode;
// }

// export function MessageBubble({
//   message,
//   role,
//   userId,
//   showDateHeader,
//   isRead = false,
//   senderName = null,
//   footer = null,
// }: Readonly<MessageBubbleProps>) {
//   const mine = isOwnMessage(message, role, userId);
//   const text = decodeMessageText(message);

//   return (
//     <>
//       {showDateHeader ? (
//         <View style={styles.dateHeader}>
//           <Text style={styles.dateHeaderText}>{formatDateHeader(message.createdAt)}</Text>
//         </View>
//       ) : null}

//       <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
//         <View style={[styles.column, mine ? styles.columnMine : styles.columnTheirs]}>
//           {senderName ? (
//             <Text style={[styles.senderName, mine ? styles.senderNameMine : styles.senderNameTheirs]}>
//               {senderName}
//             </Text>
//           ) : null}
//           <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
//             <Text style={[styles.text, mine ? styles.textMine : styles.textTheirs]}>{text}</Text>
//             <View style={[styles.meta, footer ? styles.metaWithFooter : null]}>
//               {footer ? <View style={styles.footer}>{footer}</View> : null}
//               <View style={styles.metaTime}>
//                 <Text style={[styles.time, mine ? styles.timeMine : styles.timeTheirs]}>
//                   {formatMessageTime(message.createdAt)}
//                 </Text>
//                 {mine ? (
//                   isRead ? (
//                     <CheckCheck size={14} color="rgba(255,255,255,0.85)" />
//                   ) : (
//                     <Check size={14} color="rgba(255,255,255,0.75)" />
//                   )
//                 ) : null}
//               </View>
//             </View>
//           </View>
//         </View>
//       </View>
//     </>
//   );
// }

// const styles = StyleSheet.create({
//   dateHeader: {
//     alignItems: 'center',
//     marginVertical: 14,
//   },
//   dateHeaderText: {
//     fontSize: fontSize.xs,
//     color: colors.text.secondary,
//     backgroundColor: colors.background.subtle,
//     paddingHorizontal: 14,
//     paddingVertical: 6,
//     borderRadius: border.radius.btn,
//   },
//   row: {
//     flexDirection: 'row',
//     marginBottom: 10,
//   },
//   rowMine: {
//     justifyContent: 'flex-end',
//   },
//   rowTheirs: {
//     justifyContent: 'flex-start',
//   },
//   column: {
//     maxWidth: '80%',
//   },
//   columnMine: {
//     alignItems: 'flex-end',
//   },
//   columnTheirs: {
//     alignItems: 'flex-start',
//   },
//   senderName: {
//     fontSize: fontSize.xs,
//     fontWeight: fontWeight.semiBold,
//     marginBottom: 4,
//     paddingHorizontal: 4,
//   },
//   senderNameMine: {
//     color: colors.text.secondary,
//     textAlign: 'right',
//   },
//   senderNameTheirs: {
//     color: colors.primary.default,
//   },
//   bubble: {
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     borderRadius: 22,
//     shadowColor: colors.text.primary,
//     shadowOpacity: 0.04,
//     shadowRadius: 8,
//     shadowOffset: { width: 0, height: 4 },
//     elevation: 1,
//   },
//   bubbleMine: {
//     backgroundColor: colors.primary.default,
//     borderBottomRightRadius: border.radius.chipSm,
//   },
//   bubbleTheirs: {
//     backgroundColor: colors.background.surface,
//     borderBottomLeftRadius: border.radius.chipSm,
//     borderWidth: 1,
//     borderColor: colors.border.light,
//   },
//   text: {
//     fontSize: fontSize.md,
//     lineHeight: 22,
//   },
//   textMine: {
//     color: colors.text.inverse,
//   },
//   textTheirs: {
//     color: colors.text.primary,
//   },
//   meta: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'flex-end',
//     gap: 4,
//     marginTop: 6,
//   },
//   metaWithFooter: {
//     justifyContent: 'space-between',
//     marginTop: 10,
//   },
//   metaTime: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//   },
//   footer: {
//     flexShrink: 1,
//     marginRight: 10,
//   },
//   time: {
//     fontSize: fontSize.xs,
//   },
//   timeMine: {
//     color: 'rgba(255,255,255,0.72)',
//   },
//   timeTheirs: {
//     color: colors.text.muted,
//   },
// });
