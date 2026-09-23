import { Injectable } from '@angular/core';

export interface Coordinates {
  lat: number;
  lon: number;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  getCurrentPosition(): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    });
  }

  watchPosition(callback: (coords: Coordinates) => void, errorCallback?: (error: GeolocationPositionError) => void): number | null {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return null;
    }

    return navigator.geolocation.watchPosition(
      (position) => {
        callback({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      errorCallback,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000
      }
    );
  }

  clearWatch(watchId: number): void {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  /**
   * Calculates Haversine distance between two coordinates in meters
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    const km = (meters / 1000).toFixed(1);
    return `${km} km`;
  }

  /**
   * Calculates Great-Circle bearing in degrees (0..360) from user to destination
   */
  calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const deltaLambda = toRad(lon2 - lon1);

    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
    const theta = Math.atan2(y, x);

    return (toDeg(theta) + 360) % 360;
  }

  /**
   * Returns direction string key based on relative bearing angle
   */
  getDirectionKey(relativeAngle: number, distanceMeters: number): string {
    if (distanceMeters <= 10) return 'urgent.arrived';
    const angle = (relativeAngle + 360) % 360;
    if (angle >= 337.5 || angle < 22.5) return 'urgent.dir.straight';
    if (angle >= 22.5 && angle < 67.5) return 'urgent.dir.slightRight';
    if (angle >= 67.5 && angle < 112.5) return 'urgent.dir.right';
    if (angle >= 112.5 && angle < 247.5) return 'urgent.dir.back';
    if (angle >= 247.5 && angle < 292.5) return 'urgent.dir.left';
    return 'urgent.dir.slightLeft';
  }
}
