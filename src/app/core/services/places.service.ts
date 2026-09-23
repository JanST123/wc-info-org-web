import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PlaceSuggestion {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  lat?: number;
  lon?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PlacesService {
  private readonly http = inject(HttpClient);

  searchPlaces(query: string): Observable<PlaceSuggestion[]> {
    if (!query || query.trim().length < 2) {
      return of([]);
    }

    const trimmed = query.trim();

    // If Google Maps API is loaded, we can use google.maps.places.AutocompleteService
    if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
      return new Observable((observer) => {
        const service = new (window as any).google.maps.places.AutocompleteService();
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

    // Out-of-the-box fallback geocoder using OpenStreetMap Nominatim
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

  getPlaceDetails(place: PlaceSuggestion): Promise<{ lat: number; lon: number }> {
    if (place.lat !== undefined && place.lon !== undefined) {
      return Promise.resolve({ lat: place.lat, lon: place.lon });
    }

    if (typeof window !== 'undefined' && (window as any).google?.maps?.places && place.placeId) {
      return new Promise((resolve, reject) => {
        const dummyDiv = document.createElement('div');
        const service = new (window as any).google.maps.places.PlacesService(dummyDiv);
        service.getDetails({ placeId: place.placeId, fields: ['geometry'] }, (result: any, status: any) => {
          if (status === 'OK' && result?.geometry?.location) {
            resolve({
              lat: result.geometry.location.lat(),
              lon: result.geometry.location.lng()
            });
          } else {
            reject(new Error('Failed to resolve place geometry'));
          }
        });
      });
    }

    return Promise.reject(new Error('Coordinates not found for place'));
  }
}
