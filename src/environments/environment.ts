import { EnvironmentConfig } from './environment.interface';

export const environment: EnvironmentConfig = {
  production: true,
  apiBaseUrl: 'https://api.wc-info.org',
  apiKey: 'xxx',
  googleMapsApiKey: 'xxx',
  googleMapsMapId: 'DEMO_MAP_ID',
  matomo: {
    trackerUrl: "https://piwik.jan8.de",
    siteId: "1"
  },
  sentryDsn: "xxx"
};
