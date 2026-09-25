import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, catchError, firstValueFrom, from, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GoogleMapsLoaderService } from './google-maps-loader.service';

export interface PlaceSuggestion {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  lat?: number;
  lon?: number;
}

export interface ResolvedPlace {
  lat: number;
  lon: number;
  name?: string;
  placeId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PlacesService {
  private readonly http = inject(HttpClient);
  private readonly mapsLoader = inject(GoogleMapsLoaderService);

  searchPlaces(query: string): Observable<PlaceSuggestion[]> {
    if (!query || query.trim().length < 2) {
      return of([]);
    }

    const trimmed = query.trim();

    return from(this.mapsLoader.load().catch(() => null)).pipe(
      switchMap((g) => {
        if (g && (g.maps as any)?.places) {
          return new Observable<PlaceSuggestion[]>((observer) => {
            const service = new (g.maps as any).places.AutocompleteService();
            service.getPlacePredictions(
              { input: trimmed },
              (predictions: any[], status: any) => {
                if (status === 'OK' && predictions) {
                  const results: PlaceSuggestion[] = predictions.map((p) => ({
                    placeId: p.place_id,
                    primaryText: p.structured_formatting?.main_text || p.description,
                    secondaryText: p.structured_formatting?.secondary_text || ''
                  }));
                  observer.next(results);
                  observer.complete();
                } else {
                  observer.next([]);
                  observer.complete();
                }
              }
            );
          });
        }
        return this.fallbackNominatim(trimmed);
      }),
      catchError(() => this.fallbackNominatim(trimmed))
    );
  }

  private fallbackNominatim(trimmed: string): Observable<PlaceSuggestion[]> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=5&addressdetails=1`;
    return this.http.get<any[]>(url).pipe(
      map((items) => {
        return items.map((item) => {
          const parts = (item.display_name || '').split(',');
          const primary = parts[0]?.trim() || item.name || trimmed;
          const secondary = parts.slice(1, 4).join(',').trim();

          return {
            placeId: String(item.place_id || item.osm_id),
            primaryText: primary,
            secondaryText: secondary,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon)
          };
        });
      }),
      catchError(() => of([]))
    );
  }

  getPlaceDetails(place: PlaceSuggestion): Promise<ResolvedPlace> {
    if (place.lat !== undefined && place.lon !== undefined) {
      return Promise.resolve({ lat: place.lat, lon: place.lon, name: place.primaryText, placeId: place.placeId });
    }

    return this.getPlaceDetailsByPlaceId(place.placeId, place.primaryText);
  }

  async getPlaceDetailsByPlaceId(placeId: string, fallbackName?: string): Promise<ResolvedPlace> {
    try {
      await this.mapsLoader.load();
    } catch {
      // ignore loader error, fallback below
    }

    if (typeof window !== 'undefined' && (window as any).google?.maps?.places && placeId) {
      const googleResult = await new Promise<ResolvedPlace | null>((resolve) => {
        try {
          const dummyDiv = document.createElement('div');
          const service = new (window as any).google.maps.places.PlacesService(dummyDiv);
          service.getDetails(
            { placeId, fields: ['geometry', 'name', 'formatted_address'] },
            (result: any, status: any) => {
              if (status === 'OK' && result?.geometry?.location) {
                resolve({
                  lat: result.geometry.location.lat(),
                  lon: result.geometry.location.lng(),
                  name: result.name || fallbackName?.replace(/-/g, ' '),
                  placeId
                });
              } else {
                resolve(null);
              }
            }
          );
        } catch {
          resolve(null);
        }
      });

      if (googleResult) {
        return googleResult;
      }
    }

    // Fallback: If placeId was numeric (OSM) or Google getDetails failed, search by name
    if (fallbackName && fallbackName.trim()) {
      return this.searchAndResolveFirst(fallbackName.replace(/-/g, ' '));
    }

    throw new Error('Coordinates not found for placeId: ' + placeId);
  }

  async searchAndResolveFirst(query: string): Promise<ResolvedPlace> {
    const trimmed = query.trim();
    if (!trimmed) {
      throw new Error('Empty search query');
    }

    // 1. Try Google Maps Geocoder first for fast, exact place/address resolution
    try {
      const g = await this.mapsLoader.load();
      if (g && (g.maps as any)?.Geocoder) {
        const geocodeResult = await new Promise<ResolvedPlace | null>((resolve) => {
          const geocoder = new (g.maps as any).Geocoder();
          geocoder.geocode({ address: trimmed }, (results: any[], status: any) => {
            if (status === 'OK' && results && results.length > 0) {
              const first = results[0];
              resolve({
                lat: first.geometry.location.lat(),
                lon: first.geometry.location.lng(),
                name: first.address_components?.[0]?.long_name || first.formatted_address || trimmed,
                placeId: first.place_id
              });
            } else {
              resolve(null);
            }
          });
        });

        if (geocodeResult) {
          return geocodeResult;
        }
      }
    } catch (err) {
      console.warn('Google Maps Geocoder lookup failed, trying autocomplete:', err);
    }

    // 2. Try Autocomplete predictions
    const suggestions = await firstValueFrom(this.searchPlaces(trimmed));
    if (suggestions && suggestions.length > 0) {
      const first = suggestions[0];
      const details = await this.getPlaceDetails(first);
      return { ...details, placeId: first.placeId, name: details.name || first.primaryText };
    }

    // 3. Fallback to Nominatim direct geocoding
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=1`;
    const direct = await firstValueFrom(this.http.get<any[]>(url).pipe(catchError(() => of([]))));
    if (direct && direct.length > 0) {
      return {
        lat: parseFloat(direct[0].lat),
        lon: parseFloat(direct[0].lon),
        name: direct[0].name || trimmed,
        placeId: String(direct[0].place_id || direct[0].osm_id)
      };
    }

    throw new Error('No places found for ' + trimmed);
  }
}
