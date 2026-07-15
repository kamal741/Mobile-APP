import { StatusBar } from 'expo-status-bar';

/**
 * Default status bar for light app surfaces. Most screens use white headers,
 * so icons should stay dark regardless of the device color scheme.
 */
export function AppStatusBar() {
  return <StatusBar style="dark" />;
}
