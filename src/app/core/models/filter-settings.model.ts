export interface ToiletFilterSettings {
  showClosed: boolean;
  showNonPublic: boolean;
  showNonWheelchairAccessible: boolean;
  showWithoutChangingTable: boolean;
  showWithoutGenderSeparation: boolean;
  showWithoutEuroKey: boolean;
  allowNonPublicFallback?: boolean;
  maxPublicDistanceMeters?: number;
}

export const DEFAULT_FILTER_SETTINGS: ToiletFilterSettings = {
  showClosed: false,
  showNonPublic: false,
  showNonWheelchairAccessible: true,
  showWithoutChangingTable: true,
  showWithoutGenderSeparation: true,
  showWithoutEuroKey: true,
  allowNonPublicFallback: true,
  maxPublicDistanceMeters: 500
};

export function buildApiFilterQuery(settings: ToiletFilterSettings): string {
  const parts: string[] = [];

  if (!settings.showClosed) {
    parts.push('is_open:true');
  }
  if (!settings.showNonPublic) {
    parts.push('public_accessible:true');
  }
  if (!settings.showNonWheelchairAccessible) {
    parts.push('has_wheelchair_access:true');
  }
  if (!settings.showWithoutChangingTable) {
    parts.push('has_changing_table:true');
  }
  if (!settings.showWithoutGenderSeparation) {
    parts.push('is_gender_separated:true');
  }
  if (!settings.showWithoutEuroKey) {
    parts.push('euro_key:yes');
  }

  return parts.join(',');
}
