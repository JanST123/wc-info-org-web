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

export interface SummaryBounds {
  south: number;
  west: number;
  north: number;
  east: number;
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
  
  // Summary mode fields
  isSummary?: boolean;
  summaryCount?: number;
  summaryBounds?: SummaryBounds | null;
  summaryLocationName?: string | null;

  // Accessibility & Features
  isQualified?: boolean | null;
  isUnisex?: boolean;
  isGenderSeparated?: boolean;
  hasWheelchairAccess?: boolean;
  hasChangingTable?: boolean;
  publicAccessible?: boolean;
  accessibleOutsideOpeningTimes?: boolean;
  euroKey?: string | null;            // "yes", "no", "unknown"
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

export function parseSummaryBounds(rawBounds: any): SummaryBounds | null {
  if (!rawBounds) return null;
  if (typeof rawBounds === 'object' && 'south' in rawBounds && 'north' in rawBounds) {
    const south = parseFloat(rawBounds.south);
    const west = parseFloat(rawBounds.west);
    const north = parseFloat(rawBounds.north);
    const east = parseFloat(rawBounds.east);
    if (!isNaN(south) && !isNaN(west) && !isNaN(north) && !isNaN(east)) {
      return { south, west, north, east };
    }
  }
  if (typeof rawBounds === 'string') {
    try {
      const parsed = JSON.parse(rawBounds);
      if (parsed && typeof parsed === 'object') {
        return parseSummaryBounds(parsed);
      }
    } catch {
      const parts = rawBounds.split(',').map((p) => parseFloat(p.trim()));
      if (parts.length === 4 && !parts.some(isNaN)) {
        return { south: parts[0], west: parts[1], north: parts[2], east: parts[3] };
      }
    }
  }
  return null;
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

  const isSummary = toFlexibleBool(raw.is_summary ?? raw.isSummary);
  const summaryCount = typeof raw.summary_count === 'number'
    ? raw.summary_count
    : (typeof raw.summarize_count === 'number'
      ? raw.summarize_count
      : (parseInt(raw.summary_count ?? raw.summarize_count, 10) || (isSummary ? 1 : 0)));
  const summaryLocationName = raw.summary_location_name ?? raw.summary_location ?? raw.summarize_location ?? null;
  const summaryBounds = parseSummaryBounds(raw.summary_bounds ?? raw.summaryBounds ?? raw.summarize_bounds);

  let name = raw.name || '';
  if (isSummary) {
    const loc = summaryLocationName || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    name = `${summaryCount} Toilets around ${loc}`;
  }

  return {
    id,
    name,
    owner: raw.owner || null,
    lat,
    lon,
    placeId: raw.place_id ?? raw.placeId ?? null,
    status: raw.status || (isClosed ? 'temporary_closed' : 'active'),
    temporaryClosed: isClosed,
    isSummary,
    summaryCount: isSummary ? summaryCount : undefined,
    summaryBounds,
    summaryLocationName,
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
          filename: p.filename || (p.url ? p.url.split('/').pop()?.split('?')[0] : undefined)
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
  place_id?: string | null;
  is_unisex?: boolean;
  is_gender_separated?: boolean;
  has_wheelchair_access?: boolean;
  has_changing_table?: boolean;
  accessible_outside_opening_times?: boolean;
  public_accessible?: boolean;
  place_opening_hours?: GooglePlacesPeriod[] | null;
  address?: string | null;
  website?: string | null;
  comment?: string | null;
  euro_key?: string | null;
  storage_space?: string | null;
  status?: string;
}

export interface UpdateToiletPayload extends AddToiletPayload {
  is_qualified?: boolean | null;
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
  id?: number;
  toiletId?: number;
  filename: string;
  imageUrl?: string;
  thumbUrl?: string;
}

export interface DeletePhotoResponse {
  success: boolean;
}
