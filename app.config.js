const baseConfig = require('./app.json');

module.exports = () => {
  const config = baseConfig.expo;
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;
  const googleMapsApiKey = (
    process.env.GOOGLE_MAPS_API_KEY
    || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
    || ''
  ).trim();
  const { googleMapsApiKey: _ignoredIosPlaceholder, ...iosConfig } =
    config.ios?.config ?? {};
  const { googleMaps: _ignoredAndroidPlaceholder, ...androidConfig } =
    config.android?.config ?? {};

  return {
    ...config,
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
      config: {
        ...androidConfig,
        ...(googleMapsApiKey
          ? { googleMaps: { apiKey: googleMapsApiKey } }
          : {}),
      },
    },
    ios: {
      ...config.ios,
      config: {
        ...iosConfig,
        ...(googleMapsApiKey ? { googleMapsApiKey } : {}),
      },
    },
  };
};
