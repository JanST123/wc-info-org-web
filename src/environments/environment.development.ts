import { EnvironmentConfig } from './environment.interface';

export const environment: EnvironmentConfig = {
  production: false,
  apiBaseUrl: 'http://localhost:8000',
  apiKey: 'wc_web_033a571d80f43ad67135edca3e6f9e0e',
  googleMapsApiKey: 'AIzaSyDxkqjduGkK9ijPlVILPGnQOpyxBK2Xo8M',
  googleMapsMapId: 'DEMO_MAP_ID',
  matomo: {
    trackerUrl: "https://piwik.jan8.de",
    siteId: "1"
  },
  sentryDsn: "https://1067b32b6a77457e9e21ea78981a2a57@bringlist.bugsink.com/7"
};
