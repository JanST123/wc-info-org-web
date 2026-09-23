import { EnvironmentConfig } from './environment.interface';

export const environment: EnvironmentConfig = {
  production: true,
  apiBaseUrl: 'https://api.wc-info.org',
  apiKey: 'wc_web_89745c8e0365016915492a7496f70659',
  googleMapsApiKey: 'AIzaSyDxkqjduGkK9ijPlVILPGnQOpyxBK2Xo8M',
  googleMapsMapId: 'DEMO_MAP_ID',
  matomo: {
    trackerUrl: "https://piwik.jan8.de",
    siteId: "1"
  },
  sentryDsn: "https://1067b32b6a77457e9e21ea78981a2a57@bringlist.bugsink.com/7"
};
