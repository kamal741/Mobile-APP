import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Fallback when Android edge-to-edge reports 0 before insets are measured. */
const ANDROID_BOTTOM_FALLBACK = 48;

export function useBottomInset(): number {
  const { bottom } = useSafeAreaInsets();

  if (Platform.OS !== 'android') {
    return bottom;
  }

  if (bottom > 0) {
    return bottom;
  }

  return ANDROID_BOTTOM_FALLBACK;
}

export function useSafeAreaPadding() {
  const insets = useSafeAreaInsets();
  const bottom = useBottomInset();

  return {
    top: insets.top,
    bottom,
    left: insets.left,
    right: insets.right,
  };
}

/** Bottom padding for sheets/modals that sit above the system navigation bar. */
export function useSheetBottomPadding(base = 16): number {
  return base + useBottomInset();
}
