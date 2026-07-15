// hooks/useAndroidNavBarHeight.ts
import { useState, useEffect } from 'react';
import { Dimensions, Platform, StatusBar } from 'react-native';

/**
 * On Android, `Dimensions.get('window')` excludes system bars while
 * `Dimensions.get('screen')` includes them. The difference gives us the
 * combined status bar + navigation bar height. Subtracting the status bar
 * height leaves just the navigation bar — this works for BOTH 3-button
 * nav and gesture nav, unlike `useSafeAreaInsets().bottom`, which some
 * OEM skins (e.g. Vivo/FuntouchOS) report as 0 even when a button nav
 * bar is present.
 */
function computeAndroidNavBarHeight(): number {
  if (Platform.OS !== 'android') return 0;

  const screenHeight = Dimensions.get('screen').height;
  const windowHeight = Dimensions.get('window').height;
  const statusBarHeight = StatusBar.currentHeight ?? 0;

  const diff = screenHeight - windowHeight - statusBarHeight;
  return diff > 0 ? Math.round(diff) : 0;
}

export function useAndroidNavBarHeight() {
  const [navBarHeight, setNavBarHeight] = useState(computeAndroidNavBarHeight);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = Dimensions.addEventListener('change', () => {
      setNavBarHeight(computeAndroidNavBarHeight());
    });

    return () => subscription.remove();
  }, []);

  return navBarHeight;
}