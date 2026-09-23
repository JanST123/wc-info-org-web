import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsLoaderService {
  private loadPromise?: Promise<typeof google>;
  readonly isLoaded = signal<boolean>(false);
  readonly loadError = signal<string | null>(null);

  load(): Promise<typeof google> {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('Window not available'));
    }

    if (typeof google !== 'undefined' && google.maps) {
      this.isLoaded.set(true);
      return Promise.resolve(google);
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise<typeof google>((resolve, reject) => {
      const apiKey = environment.googleMapsApiKey || '';
      const callbackName = `__googleMapsInit_${Date.now()}`;

      (window as any)[callbackName] = () => {
        this.isLoaded.set(true);
        delete (window as any)[callbackName];
        resolve(google);
      };

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker,geometry&callback=${callbackName}&loading=async`;

      script.onerror = (err) => {
        this.loadError.set('Failed to load Google Maps script');
        delete (window as any)[callbackName];
        reject(err);
      };

      document.head.appendChild(script);
    });

    return this.loadPromise;
  }
}
