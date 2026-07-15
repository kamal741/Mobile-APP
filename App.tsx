import { QueryClientProvider } from '@tanstack/react-query';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { TourCartProvider } from './src/contexts/TourCartContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { queryClient } from './src/lib/queryClient';
import { AppStatusBar } from './src/components/AppStatusBar';
import { useAppPermissions } from './src/hooks/usePermissions';
import { useEffect, useRef } from 'react';
import performance from 'react-native-performance';
import { CacheLogger } from './src/debug/CacheLogger';

// Marked at module load time — this fires as early as possible,
// right when the JS bundle starts executing App.tsx
performance.mark('app_start');

export default function App() {
  useAppPermissions();
  const hasMarkedInteractive = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    void NavigationBar.setPositionAsync('absolute');
    void NavigationBar.setBackgroundColorAsync('#ffffff00');
    void NavigationBar.setButtonStyleAsync('dark');
  }, []);

  useEffect(() => {
    if (hasMarkedInteractive.current) return;
    hasMarkedInteractive.current = true;

    performance.mark('app_interactive');
    performance.measure('time_to_interactive', 'app_start', 'app_interactive');

    const [measure] = performance.getEntriesByName('time_to_interactive');
    if (measure) {
      console.log(`[Perf] TTI: ${measure.duration.toFixed(0)}ms`);
      // TODO: pipe this to Sentry/Firebase Performance instead of console.log in production
    }
  }, []);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TourCartProvider>
            <AppStatusBar />
            <CacheLogger />
            <RootNavigator />
          </TourCartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
