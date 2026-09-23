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

function toFlexibleBool(val: any): boolean {
  if (val === true || val === 1 || val === '1' || val === 'true') return true;
  return false;
}

export function normalizeToilet(raw: any): Toilet {
  if (!raw) {
    return {
      id: 0,
      name: '',
      lat: 0,
      lon: 0
    };
  }

  const id = typeof raw.id === 'number' ? raw.id : (parseInt(raw.id, 10) || 0);
  const lat = typeof raw.lat === 'number' ? raw.lat : (parseFloat(raw.lat) || 0);
  const lon = typeof raw.lon === 'number' ? raw.lon : (parseFloat(raw.lon) || 0);
  const isClosed = toFlexibleBool(raw.temporary_closed ?? raw.temporaryClosed);

  return {
    id,
    name: raw.name || '',
    owner: raw.owner || null,
    lat,
    lon,
    placeId: raw.place_id ?? raw.placeId ?? null,
    status: raw.status || (isClosed ? 'temporary_closed' : 'active'),
    temporaryClosed: isClosed,
    isQualified: raw.is_qualified !== undefined ? toFlexibleBool(raw.is_qualified) : (raw.isQualified !== undefined ? toFlexibleBool(raw.isQualified) : null),
    isUnisex: toFlexibleBool(raw.is_unisex ?? raw.isUnisex),
    isGenderSeparated: toFlexibleBool(raw.is_gender_separated ?? raw.isGenderSeparated),
    hasWheelchairAccess: toFlexibleBool(raw.has_wheelchair_access ?? raw.hasWheelchairAccess),
    hasChangingTable: toFlexibleBool(raw.has_changing_table ?? raw.hasChangingTable),
    publicAccessible: raw.public_accessible !== undefined
      ? toFlexibleBool(raw.public_accessible)
      : (raw.isPublicAccessible !== undefined
        ? toFlexibleBool(raw.isPublicAccessible)
        : (raw.publicAccessible !== undefined ? toFlexibleBool(raw.publicAccessible) : true)),
    accessibleOutsideOpeningTimes: toFlexibleBool(raw.accessible_outside_opening_times ?? raw.accessibleOutsideOpeningTimes),
    euroKey: raw.euro_key ?? raw.euroKey ?? null,
    storageSpace: raw.storage_space ?? raw.storageSpace ?? null,
    isOpen: raw.is_open !== undefined ? toFlexibleBool(raw.is_open) : (raw.isOpen !== undefined ? toFlexibleBool(raw.isOpen) : null),
    openTimestamp: raw.open_timestamp ?? raw.openTimestamp ?? null,
    closeTimestamp: raw.close_timestamp ?? raw.closeTimestamp ?? null,
    placeOpeningHours: raw.place_opening_hours ?? raw.placeOpeningHours ?? null,
    address: raw.address || null,
    website: raw.website || null,
    comment: raw.comment || null,
    distance: raw.distance !== undefined ? (typeof raw.distance === 'number' ? raw.distance : parseFloat(raw.distance)) : null,
    photos: Array.isArray(raw.photos)
      ? raw.photos.map((p: any) => ({
          id: p.id || 0,
          toiletId: p.toilet_id ?? p.toiletId,
          url: p.url || '',
          urlThumb: p.url_thumb ?? p.urlThumb ?? p.url,
          isMain: toFlexibleBool(p.is_main ?? p.isMain),
          filename: p.filename
        }))
      : []
  };
}

export function normalizeToiletList(rawList: any[]): Toilet[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.map(normalizeToilet);
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
