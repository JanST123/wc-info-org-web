export interface EnvironmentConfig {
  production: boolean;
  apiBaseUrl: string;
  apiKey?: string;
  googleMapsApiKey?: string;
  matomo?: {
    siteId: string;
    trackerUrl: string;
  };
  sentryDsn?: string;
}
