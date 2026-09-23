import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CompassService {
  readonly heading = signal<number | null>(null);
  readonly isSupported = signal<boolean>(false);
  readonly permissionGranted = signal<boolean>(false);
  
  private orientationListener?: (event: DeviceOrientationEvent) => void;

  constructor() {
    this.checkSupport();
  }

  private checkSupport(): void {
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      this.isSupported.set(true);
    }
  }

  async requestPermissionAndStart(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // iOS 13+ permission request
    const event = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof event?.requestPermission === 'function') {
      try {
        const response = await event.requestPermission();
        if (response === 'granted') {
          this.permissionGranted.set(true);
          this.startListening();
          return true;
        } else {
          this.permissionGranted.set(false);
          return false;
        }
      } catch (err) {
        console.error('Error requesting device orientation permission:', err);
        return false;
      }
    } else {
      // Non-iOS or standard browsers
      this.permissionGranted.set(true);
      this.startListening();
      return true;
    }
  }

  startListening(): void {
    if (typeof window === 'undefined') return;

    this.stopListening();

    this.orientationListener = (event: DeviceOrientationEvent) => {
      let compassHeading: number | null = null;

      // Webkit iOS native compass heading
      const webkitEvent = event as DeviceOrientationEvent & { webkitCompassHeading?: number };
      if (typeof webkitEvent.webkitCompassHeading === 'number') {
        compassHeading = webkitEvent.webkitCompassHeading;
      } else if (event.alpha !== null) {
        // Fallback for Android/standard browsers (alpha is 0..360, relative or absolute)
        if (event.absolute) {
          compassHeading = (360 - event.alpha) % 360;
        } else {
          compassHeading = (360 - event.alpha) % 360;
        }
      }

      if (compassHeading !== null) {
        this.heading.set(Math.round(compassHeading));
      }
    };

    if (typeof window !== 'undefined') {
      const win = window as any;
      if ('ondeviceorientationabsolute' in win) {
        win.addEventListener('deviceorientationabsolute', this.orientationListener, true);
      } else if ('ondeviceorientation' in win) {
        win.addEventListener('deviceorientation', this.orientationListener, true);
      }
    }
  }

  stopListening(): void {
    if (typeof window === 'undefined' || !this.orientationListener) return;

    window.removeEventListener('deviceorientationabsolute', this.orientationListener, true);
    window.removeEventListener('deviceorientation', this.orientationListener, true);
    this.orientationListener = undefined;
  }
}
