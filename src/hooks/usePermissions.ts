import { useEffect } from 'react';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';

export async function requestAppPermissions() {
  const locationStatus = await Location.requestForegroundPermissionsAsync();
  const mediaLibraryStatus = await MediaLibrary.requestPermissionsAsync();
  const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();

  return {
    location: locationStatus.status === 'granted',
    mediaLibrary: mediaLibraryStatus.status === 'granted',
    camera: cameraStatus.status === 'granted',
  };
}

export function useAppPermissions() {
  useEffect(() => {
    requestAppPermissions();
  }, []);
}