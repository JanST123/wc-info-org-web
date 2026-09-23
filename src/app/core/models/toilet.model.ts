export interface GooglePlacesPoint {
  day: number;      // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  hour: number;     // 0 - 23
  minute: number;   // 0 - 59
}

export interface GooglePlacesPeriod {
  open: GooglePlacesPoint;
  close?: GooglePlacesPoint | null;
}

export interface ToiletPhoto {
  id: number;
  toiletId?: number;
  url: string;
  urlThumb?: string;
  isMain?: boolean;
  filename?: string;
}

export interface ToiletPropertyItem {
  id?: number;
  type: string;     // e.g. "storage_space", "euro_key", "operator"
  value: string;
}

export interface Toilet {
  id: number;
  name: string;
  owner?: string | null;
  lat: number;
  lon: number;
  placeId?: string | null;
  status?: 'active' | 'temporary_closed' | 'inactive' | string;
  temporaryClosed?: boolean;
  
  // Accessibility & Features
  isQualified?: boolean | null;
  isUnisex?: boolean;
  isGenderSeparated?: boolean;
  hasWheelchairAccess?: boolean;
  hasChangingTable?: boolean;
  publicAccessible?: boolean;
  accessibleOutsideOpeningTimes?: boolean;
  euroKey?: string | null;            // "yes", "no", "true", "false", "1", "0"
  storageSpace?: 'none' | 'little' | 'much' | string | null;
  
  // Opening Hours
  isOpen?: boolean | null;
  openTimestamp?: string | null;      // ISO-8601 string
  closeTimestamp?: string | null;     // ISO-8601 string
  placeOpeningHours?: GooglePlacesPeriod[] | null;
  
  // Metadata
  address?: string | null;
  website?: string | null;
  comment?: string | null;
  distance?: number | null;           // Distance in kilometers or meters
  distanceMeters?: number | null;
  photos?: ToiletPhoto[];
  properties?: ToiletPropertyItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AddToiletPayload {
  name?: string | null;
  owner?: string | null;
  lat: number;
  lon: number;
  placeId?: string | null;
  isUnisex?: boolean;
  isGenderSeparated?: boolean;
  hasWheelchairAccess?: boolean;
  hasChangingTable?: boolean;
  accessibleOutsideOpeningTimes?: boolean;
  publicAccessible?: boolean;
  placeOpeningHours?: GooglePlacesPeriod[] | null;
  address?: string | null;
  website?: string | null;
  comment?: string | null;
  euroKey?: string | null;
  storageSpace?: string | null;
  status?: string;
}

export interface UpdateToiletPayload extends AddToiletPayload {
  isQualified?: boolean | null;
}

export interface AddToiletResponse {
  success?: boolean;
  status?: string;
  id: number;
}

export interface UpdateToiletResponse {
  success?: boolean;
  status?: string;
  id?: number;
}

export interface SendToiletFeedbackRequest {
  subject: string;
  message?: string | null;
}

export interface SendToiletFeedbackResponse {
  status?: string;
  message?: string;
  success?: boolean;
}

export interface AddToiletPropertiesResponse {
  success?: boolean;
  count?: number;
}

export interface UploadPhotoResponse {
  success: boolean;
  toiletId?: number;
  filename: string;
  imageUrl?: string;
  thumbUrl?: string;
}

export interface DeletePhotoResponse {
  success: boolean;
}
