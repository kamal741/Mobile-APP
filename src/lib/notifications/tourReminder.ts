import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const CHANNEL_ID = 'test-channel-v2';

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
    
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Test Channel',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
  });
}


export async function scheduleNotificationForDate(fireDate: Date, label: string) {
  await ensureAndroidChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[tourReminder] Notification permission not granted');
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Tour Reminder',
      body: label,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireDate,
      channelId: CHANNEL_ID,
    },
  });

  console.log('[tourReminder] scheduled for', fireDate.toString(), 'id:', id);

  const pending = await Notifications.getAllScheduledNotificationsAsync();
  console.log('[tourReminder] all pending notifications:', JSON.stringify(pending, null, 2));
}

export async function scheduleNotificationAt(hour: number, minute: number) {
  await ensureAndroidChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[tourReminder] Notification permission not granted');
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  const fireDate = new Date();
  fireDate.setHours(hour, minute, 0, 0);

  if (fireDate.getTime() <= Date.now()) {
    fireDate.setDate(fireDate.getDate() + 1);
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Scheduled Notification',
      body: `Fires at ${hour}:${minute.toString().padStart(2, '0')}`,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireDate,
      channelId: CHANNEL_ID,
    },
  });

  console.log('[tourReminder] scheduled for', fireDate.toString(), 'id:', id);

  const pending = await Notifications.getAllScheduledNotificationsAsync();
  console.log('[tourReminder] all pending notifications:', JSON.stringify(pending, null, 2));
}



export async function scheduleTourNotification(fireDate: Date, label: string, tourId: string) {
  if (fireDate.getTime() <= Date.now()) {
    console.warn(
      `[tourReminder] Skipping tour ${tourId}, reminder time is in the past:`,
      fireDate.toString()
    );
    return { success: false, reason: 'past' as const };
  }

  await ensureAndroidChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[tourReminder] Notification permission not granted');
    return { success: false, reason: 'permission' as const };
  }

  // Passing an explicit identifier makes this REPLACE any existing
  // notification scheduled with the same id, instead of stacking duplicates.
  const id = await Notifications.scheduleNotificationAsync({
    identifier: `tour-reminder-${tourId}`,
    content: {
      title: 'Tour Reminder',
      body: label,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireDate,
      channelId: CHANNEL_ID,
    },
  });

  console.log(`[tourReminder] tour ${tourId} reminder scheduled for`, fireDate.toString(), 'id:', id);

  return { success: true, id } as const;
}

