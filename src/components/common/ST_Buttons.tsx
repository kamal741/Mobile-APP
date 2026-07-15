import React, { type ReactNode } from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * All buttons share the same outline style:
 *   light tinted background · colored border · colored text · no shadow
 *
 * Variants differ only in colour:
 *  - "primary" → indigo   (#6366f1)
 *  - "edit"    → amber    (#f59e0b)
 *  - "danger"  → red      (#ef4444)
 *  - "success" → green    (#10b981)
 *  - "warning" → orange   (#f97316)
 */
export type ButtonVariant = "primary" | "edit" | "danger" | "success" | "warning";
export type ButtonSize    = "sm" | "md" | "lg";

interface BaseButtonProps {
  label:       string;
  onPress:     () => void;
  variant?:    ButtonVariant;
  size?:       ButtonSize;
  disabled?:   boolean;
  loading?:    boolean;
  fullWidth?:  boolean;
  style?:      StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export interface IconButtonProps extends BaseButtonProps {
  /**
   * Emoji/text string  →  rendered via <Text> (existing behaviour).
   * React element      →  rendered as-is; pass color manually to match the variant.
   *
   * @example
   * // Emoji
   * icon="✏️"
   *
   * // Vector icon (@expo/vector-icons)
   * icon={<MaterialCommunityIcons name="image-plus" size={16} color="#6366f1" />}
   */
  icon: string | ReactNode;
}

export interface NormalButtonProps extends BaseButtonProps {}

// ─── Colour palette ───────────────────────────────────────────────────────────
// Every variant: tinted light bg + matching border + matching text.
// Disabled state fades each colour to its lightest tint.

const VARIANT_TOKENS: Record<
  ButtonVariant,
  {
    bg:             string;
    borderColor:    string;
    textColor:      string;
    disabledBg:     string;
    disabledBorder: string;
    disabledText:   string;
  }
> = {
  primary: {
    bg:             "#eef2ff",  // indigo-50
    borderColor:    "#6366f1",  // indigo-500
    textColor:      "#6366f1",
    disabledBg:     "#f5f3ff",
    disabledBorder: "#c7d2fe",  // indigo-200
    disabledText:   "#a5b4fc",  // indigo-300
  },
  edit: {
    bg:             "#fffbeb",  // amber-50
    borderColor:    "#f59e0b",  // amber-400
    textColor:      "#d97706",  // amber-600
    disabledBg:     "#fefce8",
    disabledBorder: "#fde68a",  // amber-200
    disabledText:   "#fcd34d",  // amber-300
  },
  danger: {
    bg:             "#fef2f2",  // red-50
    borderColor:    "#ef4444",  // red-500
    textColor:      "#ef4444",
    disabledBg:     "#fff5f5",
    disabledBorder: "#fca5a5",  // red-300
    disabledText:   "#fca5a5",
  },
  success: {
    bg:             "#ecfdf5",  // emerald-50
    borderColor:    "#10b981",  // emerald-500
    textColor:      "#059669",  // emerald-600
    disabledBg:     "#f0fdf4",
    disabledBorder: "#6ee7b7",  // emerald-300
    disabledText:   "#6ee7b7",
  },
  warning: {
    bg:             "#fff7ed",  // orange-50
    borderColor:    "#f97316",  // orange-500
    textColor:      "#ea6c00",  // orange-600
    disabledBg:     "#fff8f0",
    disabledBorder: "#fdba74",  // orange-300
    disabledText:   "#fdba74",
  },
};

// ─── Variant color helper ─────────────────────────────────────────────────────

/**
 * Returns the active text/icon color for a given variant.
 * Useful when you need to pass a matching color to a vector icon component:
 *
 * @example
 * import { getVariantColor } from "@/components/common/ST_Buttons";
 * icon={<MaterialCommunityIcons name="image-plus" size={16} color={getVariantColor("primary")} />}
 */
export function getVariantColor(variant: ButtonVariant): string {
  return VARIANT_TOKENS[variant].textColor;
}

// ─── Size tokens ──────────────────────────────────────────────────────────────

const SIZE_TOKENS: Record<
  ButtonSize,
  {
    paddingVertical:   number;
    paddingHorizontal: number;
    fontSize:          number;
    iconSize:          number;
    gap:               number;
    borderRadius:      number;
  }
> = {
  sm: { paddingVertical: 8,  paddingHorizontal: 14, fontSize: 14, iconSize: 14, gap: 6,  borderRadius: 10 },
  md: { paddingVertical: 12, paddingHorizontal: 18, fontSize: 15, iconSize: 16, gap: 8,  borderRadius: 12 },
  lg: { paddingVertical: 16, paddingHorizontal: 24, fontSize: 16, iconSize: 18, gap: 10, borderRadius: 16 },
};

// ─── Shared style builder ─────────────────────────────────────────────────────

function buildStyle(
  variant:   ButtonVariant,
  size:      ButtonSize,
  disabled:  boolean,
  fullWidth: boolean,
) {
  const v = VARIANT_TOKENS[variant];
  const s = SIZE_TOKENS[size];

  return StyleSheet.create({
    btn: {
      flexDirection:     "row",
      alignItems:        "center",
      justifyContent:    "center",
      backgroundColor:   disabled ? v.disabledBg    : v.bg,
      borderWidth:       1.5,
      borderColor:       disabled ? v.disabledBorder : v.borderColor,
      paddingVertical:   s.paddingVertical,
      paddingHorizontal: s.paddingHorizontal,
      borderRadius:      s.borderRadius,
      alignSelf:         fullWidth ? "stretch" : "flex-start",
      gap:               s.gap,
      // Flat — no drop shadows on outline buttons
      ...Platform.select({
        ios:     { shadowOpacity: 0 },
        android: { elevation: 0 },
      }),
    },
    label: {
      color:         disabled ? v.disabledText : v.textColor,
      fontSize:      s.fontSize,
      fontWeight:    "700" as const,
      letterSpacing: 0.2,
    },
    icon: {
      fontSize:   s.iconSize,
      lineHeight: s.iconSize + 2,
      color:      disabled ? v.disabledText : v.textColor,
    },
  });
}

// ─── IconButton ───────────────────────────────────────────────────────────────

/**
 * Outlined button with an icon on the left.
 * Accepts either an emoji/text string or any React element (e.g. vector icon).
 *
 * @example
 * // Emoji string (existing usage)
 * <IconButton icon="✏️" label="Edit Feedback" variant="primary"  size="sm" fullWidth={false} onPress={...} />
 * <IconButton icon="🗑"  label="Delete"        variant="danger"   size="md" fullWidth={false} onPress={...} />
 * <IconButton icon="✓"  label="Confirm"        variant="success"  onPress={...} />
 *
 * // Vector icon component (@expo/vector-icons)
 * import { MaterialCommunityIcons } from "@expo/vector-icons";
 * import { getVariantColor } from "@/components/common/ST_Buttons";
 *
 * <IconButton
 *   icon={<MaterialCommunityIcons name="image-plus" size={16} color={getVariantColor("primary")} />}
 *   label="Media"
 *   variant="primary"
 *   size="sm"
 *   fullWidth={false}
 *   onPress={...}
 * />
 */
export function IconButton({
  label,
  icon,
  onPress,
  variant   = "primary",
  size      = "lg",
  disabled  = false,
  loading   = false,
  fullWidth = true,
  style,
  labelStyle,
}: IconButtonProps) {
  const s = buildStyle(variant, size, disabled || loading, fullWidth);
  const spinnerColor = VARIANT_TOKENS[variant].textColor;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[s.btn, style]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <>
          {typeof icon === "string" ? (
            <Text style={s.icon}>{icon}</Text>
          ) : (
            icon
          )}
          <Text style={[s.label, labelStyle]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── NormalButton ─────────────────────────────────────────────────────────────

/**
 * Outlined button, text only (no icon).
 *
 * @example
 * <NormalButton label="Cancel"       variant="danger"  size="md" fullWidth={false} onPress={...} />
 * <NormalButton label="Save Changes" variant="success" onPress={...} />
 */
export function NormalButton({
  label,
  onPress,
  variant   = "primary",
  size      = "lg",
  disabled  = false,
  loading   = false,
  fullWidth = true,
  style,
  labelStyle,
}: NormalButtonProps) {
  const s = buildStyle(variant, size, disabled || loading, fullWidth);
  const spinnerColor = VARIANT_TOKENS[variant].textColor;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[s.btn, style]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text style={[s.label, labelStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Colour reference ─────────────────────────────────────────────────────────
//
//  variant    bg        border    text
//  ─────────  ────────  ────────  ────────
//  primary    #eef2ff   #6366f1   #6366f1   ← indigo
//  edit       #fffbeb   #f59e0b   #d97706   ← amber
//  danger     #fef2f2   #ef4444   #ef4444   ← red
//  success    #ecfdf5   #10b981   #059669   ← green
//  warning    #fff7ed   #f97316   #ea6c00   ← orange


