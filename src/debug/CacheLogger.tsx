import { useEffect } from 'react';
import { AppState } from 'react-native';
import { queryClient } from '@/lib/queryClient';
import { scheduleAllTourReminders } from '@/lib/notifications/mapTourReminders';

const TOURS_QUERY_KEY_MATCHERS = ['agent-tours', 'client-tours', 'tours'];
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // re-check the rolling window every 10 minutes

function isToursQuery(queryKey: readonly unknown[]) {
  return queryKey.some(
    (part) => typeof part === 'string' && TOURS_QUERY_KEY_MATCHERS.some((m) => part.includes(m))
  );
}

export function CacheLogger() {
  useEffect(() => {
    // Triggered by actual cache changes (new/edited/refetched tours)
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated') return;
      if (!isToursQuery(event.query.queryKey)) return;

      console.log('[CacheLogger] tours query updated:', event.query.queryKey);
      console.log(JSON.stringify(event.query.state.data, null, 2));

      void scheduleAllTourReminders();
    });

    // Triggered purely by time passing, independent of any cache change —
    // this is what pulls the next tour into the "nearest 5" window once
    // an earlier one's reminder has fired and its time has passed.
    const intervalId = setInterval(() => {
      console.log('[CacheLogger] periodic refresh — rechecking upcoming tour reminders');
      void scheduleAllTourReminders();
    }, REFRESH_INTERVAL_MS);

    // Also refresh whenever the app comes back to the foreground —
    // covers the case where the app was backgrounded for a while.
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        console.log('[CacheLogger] app foregrounded — rechecking upcoming tour reminders');
        void scheduleAllTourReminders();
      }
    });

    return () => {
      unsubscribe();
      clearInterval(intervalId);
      appStateSubscription.remove();
    };
  }, []);

  return null;
}










// import { useEffect } from 'react';
// import { queryClient } from '@/lib/queryClient';
// import { scheduleAllTourReminders } from '@/lib/notifications/mapTourReminders';

// const TOURS_QUERY_KEY_MATCHERS = ['agent-tours', 'client-tours', 'tours'];

// function isToursQuery(queryKey: readonly unknown[]) {
//   return queryKey.some(
//     (part) => typeof part === 'string' && TOURS_QUERY_KEY_MATCHERS.some((m) => part.includes(m))
//   );
// }

// export function CacheLogger() {
//   useEffect(() => {
//     const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
//       if (event.type !== 'updated') return;
//       if (!isToursQuery(event.query.queryKey)) return;

//       console.log('[CacheLogger] tours query updated:', event.query.queryKey);
//       console.log(JSON.stringify(event.query.state.data, null, 2));

//       void scheduleAllTourReminders();
//     });

//     return unsubscribe;
//   }, []);

//   return null;
// }

