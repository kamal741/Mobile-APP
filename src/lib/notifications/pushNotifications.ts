import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import axios from 'axios';
import { Platform } from 'react-native';
import { api, getApiBaseUrl } from '../api';
import { secureStorage } from '../secureStore';
import type { NotificationInboxRole } from './types';

const REGISTERED_PUSH_TOKEN_KEY = 'estateflow_registered_push_token';
const PUSH_ENABLED = process.env.EXPO_PUBLIC_FIREBASE_PUSH_ENABLED === 'true';

interface RegisteredPushToken {
  registrationToken: string;
  platform: 'android';
  role: NotificationInboxRole;
}

if (PUSH_ENABLED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function devicesPath(role: NotificationInboxRole): string {
  return role === 'agent' ? '/api/notifications/v1/agent/devices' : '/api/notifications/v1/client/devices';
}

export async function registerCurrentDeviceForPush(role: NotificationInboxRole): Promise<void> {
  if (!PUSH_ENABLED || Platform.OS !== 'android' || !Device.isDevice) {
    return;
  }

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Showing Trail notifications',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });

  const currentPermissions = await Notifications.getPermissionsAsync();
  const permissions =
    currentPermissions.status === 'granted' ? currentPermissions : await Notifications.requestPermissionsAsync();
  if (permissions.status !== 'granted') {
    return;
  }

  const nativeToken = await Notifications.getDevicePushTokenAsync();
  const registration: RegisteredPushToken = {
    registrationToken: String(nativeToken.data),
    platform: 'android',
    role,
  };

  await api.post(devicesPath(role), registration);
  await AsyncStorage.setItem(REGISTERED_PUSH_TOKEN_KEY, JSON.stringify(registration));
  console.info(`[push] registered Android device for ${role}`);
}

export async function unregisterCurrentDeviceFromPush(): Promise<void> {
  if (!PUSH_ENABLED) {
    return;
  }
  const stored = await AsyncStorage.getItem(REGISTERED_PUSH_TOKEN_KEY);
  if (!stored) {
    return;
  }

  let unregistered = false;
  try {
    const registration = JSON.parse(stored) as RegisteredPushToken;
    const token = await secureStorage.getToken();
    if (token) {
      await axios.delete(`${getApiBaseUrl()}${devicesPath(registration.role)}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: registration,
        timeout: 5000,
      });
      unregistered = true;
    }
  } catch (error) {
    console.warn('[push] device unregister failed', error);
  }
  if (unregistered) {
    await AsyncStorage.removeItem(REGISTERED_PUSH_TOKEN_KEY);
  }
}
