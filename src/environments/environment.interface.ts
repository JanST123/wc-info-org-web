export interface EnvironmentConfig {
  production: boolean;
  apiBaseUrl: string;
  apiKey?: string;
  googleMapsApiKey?: string;
  googleMapsMapId?: string;
  matomo?: {
    siteId: string;
    trackerUrl: string;
  };
  sentryDsn?: string;
}
