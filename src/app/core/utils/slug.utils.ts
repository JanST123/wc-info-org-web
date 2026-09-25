/**
 * Slug generation and parsing utilities for fancy SEO-friendly WC-Info URLs.
 */

/**
 * Converts text to a clean URL slug.
 * Example: "HANSA-PARK Freizeit- und Familienpark GmbH & Co. KG" -> "HANSA-PARK-Freizeit-und-Familienpark-GmbH-Co-KG"
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/[^\p{L}\p{N}\-_]+/gu, '-') // Replace non-alphanumeric (except hyphen/underscore) with hyphen
    .replace(/-+/g, '-')                // Collapse duplicate hyphens
    .replace(/^-|-$/g, '');             // Trim leading/trailing hyphens
}

/**
 * Generates a place slug.
 * Examples:
 * - createPlaceSlug('Aktueller Standort', 'NEARBY') => 'Aktueller-Standort---NEARBY'
 * - createPlaceSlug('HANSA-PARK Freizeit- und Familienpark GmbH & Co. KG', 'ChIJ-9dgo912skcRiDc2l2m7Mts')
 *     => 'HANSA-PARK-Freizeit-und-Familienpark-GmbH-Co-KG---ChIJ-9dgo912skcRiDc2l2m7Mts'
 * - createPlaceSlug('Berlin') => 'Berlin'
 */
export function createPlaceSlug(name: string, placeId?: string): string {
  const base = slugify(name) || 'Standort';
  if (placeId) {
    return `${base}---${placeId}`;
  }
  return base;
}

/**
 * Generates a toilet slug.
 * Example:
 * createToiletSlug('WC Service Center...', 6680)
 *   => 'WC-Service-Center...---6680'
 */
export function createToiletSlug(name: string, id: number): string {
  const base = slugify(name) || 'Toilet';
  return `${base}---${id}`;
}

export type PlaceSlugType = 'nearby' | 'place_id' | 'query';

export interface ParsedPlaceSlug {
  type: PlaceSlugType;
  rawName: string;
  name: string;
  placeId?: string;
}

/**
 * Parses a place slug into structured information.
 */
export function parsePlaceSlug(slug: string): ParsedPlaceSlug {
  if (!slug) {
    return {
      type: 'nearby',
      rawName: 'Aktueller-Standort',
      name: 'Aktueller Standort',
      placeId: 'NEARBY'
    };
  }

  const trimmed = decodeURIComponent(slug).trim();

  if (trimmed.includes('---')) {
    const separatorIdx = trimmed.lastIndexOf('---');
    const rawName = trimmed.substring(0, separatorIdx);
    const placeId = trimmed.substring(separatorIdx + 3);
    const name = rawName.replace(/-/g, ' ').trim() || 'Standort';

    if (placeId.toUpperCase() === 'NEARBY') {
      return { type: 'nearby', rawName, name, placeId: 'NEARBY' };
    }

    return { type: 'place_id', rawName, name, placeId };
  }

  const name = trimmed.replace(/-/g, ' ').trim();
  return { type: 'query', rawName: trimmed, name };
}

/**
 * Parses a toilet slug into a numeric toilet ID.
 * Matches trailing "---<id>", "--<id>", or "-<id>".
 */
export function parseToiletSlug(slug: string): number | null {
  if (!slug) return null;
  const decoded = decodeURIComponent(slug).trim();
  const match = decoded.match(/(?:---|--|-)(\d+)$/);
  if (match) {
    const id = parseInt(match[1], 10);
    return isNaN(id) ? null : id;
  }
  const directId = parseInt(decoded, 10);
  return isNaN(directId) ? null : directId;
}
