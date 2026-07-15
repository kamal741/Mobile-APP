// components/common/BottomSheetOverlay.tsx
import { ReactNode, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  StyleProp,
  ViewStyle,
} from 'react-native';

interface BottomSheetOverlayProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Renders a bottom-sheet overlay WITHOUT React Native's core `Modal`.
 *
 * Why: this app uses edge-to-edge / absolute-positioned navigation bar
 * via expo-navigation-bar (`NavigationBar.setPositionAsync('absolute')`
 * in App.tsx). RN's core `Modal` opens a separate native Dialog window
 * on Android that doesn't automatically inherit that edge-to-edge setup
 * — there's no `navigationBarTranslucent` prop (unlike
 * `statusBarTranslucent`). That's what caused the bottom-row overlap on
 * Vivo/FuntouchOS regardless of button-nav vs gesture-nav, even though
 * useSafeAreaInsets() "looked" correct.
 *
 * Rendering as a plain absolutely-positioned View in the SAME window as
 * the rest of the screen sidesteps this — there's only one window to
 * measure, so useSafeAreaInsets() behaves normally for any child here.
 */
export function BottomSheetOverlay({
  visible,
  onClose,
  children,
  style,
}: Readonly<BottomSheetOverlayProps>) {
  useEffect(() => {
    if (!visible) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => subscription.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.backdropOverlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[styles.sheetWrapper, style]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  sheetWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});