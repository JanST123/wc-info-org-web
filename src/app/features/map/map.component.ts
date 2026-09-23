import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toilet } from '../../core/models/toilet.model';
import { Coordinates } from '../../core/services/location.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { GoogleMapsLoaderService } from '../../core/services/google-maps-loader.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="relative w-full h-full min-h-[300px]">
      <!-- Map Container -->
      <div #mapContainer class="w-full h-full"></div>

      <!-- Loading Overlay if Google Maps is still loading -->
      @if (!isMapReady()) {
        <div class="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
          <div class="flex items-center gap-2 text-purple-700 text-sm font-semibold">
            <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2v4M12 18v4"/>
            </svg>
            <span>Google Maps wird geladen...</span>
          </div>
        </div>
      }

      <!-- Floating Controls Top-Right -->
      <div class="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <!-- Satellite / Roadmap Toggle -->
        <button
          type="button"
          (click)="toggleMapType()"
          class="p-2.5 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-gray-200 text-gray-700 hover:text-purple-700 hover:bg-white transition-all active:scale-95"
          [title]="isSatellite() ? 'Karte' : 'Satellit'"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </button>

        <!-- Locate User CTA -->
        <button
          type="button"
          (click)="centerOnUser()"
          class="p-2.5 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-gray-200 text-gray-700 hover:text-purple-700 hover:bg-white transition-all active:scale-95"
          [title]="'nav.nearby' | translate"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
          </svg>
        </button>
      </div>

      <!-- Add Restroom FAB Bottom-Right on Map -->
      <button
        type="button"
        (click)="onAddRestroomAtCenter()"
        class="absolute bottom-6 right-4 z-10 hidden md:flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg font-semibold text-sm transition-all active:scale-95"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span>{{ 'nav.addToilet' | translate }}</span>
      </button>
    </div>
  `
})
export class MapComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainerElement!: ElementRef<HTMLDivElement>;

  private readonly mapsLoader = inject(GoogleMapsLoaderService);

  @Input() toilets: Toilet[] = [];
  @Input() selectedToilet: Toilet | null = null;
  @Input() center: Coordinates = { lat: 52.520008, lon: 13.404954 };
  @Input() zoom = 14;
  @Input() userLocation: Coordinates | null = null;

  @Output() boundsChange = new EventEmitter<{ south: number; west: number; north: number; east: number }>();
  @Output() toiletSelect = new EventEmitter<Toilet>();
  @Output() mapCreate = new EventEmitter<Coordinates>();

  readonly isSatellite = signal<boolean>(false);
  readonly isMapReady = signal<boolean>(false);

  private googleMap?: google.maps.Map;
  private markersMap = new Map<number, google.maps.marker.AdvancedMarkerElement>();
  private userMarker?: google.maps.marker.AdvancedMarkerElement;
  private idleListener?: google.maps.MapsEventListener;
  private clickListener?: google.maps.MapsEventListener;
  private moveEndTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.initGoogleMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.googleMap) return;

    if (changes['toilets']) {
      this.updateToiletMarkers();
    }

    if (changes['selectedToilet'] && this.selectedToilet) {
      this.highlightSelectedToilet();
    }

    if (changes['userLocation'] && this.userLocation) {
      this.updateUserMarker();
    }

    if (changes['center'] && !changes['center'].firstChange && this.center) {
      this.googleMap.panTo({ lat: this.center.lat, lng: this.center.lon });
    }
  }

  ngOnDestroy(): void {
    if (this.moveEndTimer) clearTimeout(this.moveEndTimer);
    if (this.idleListener) google.maps.event.removeListener(this.idleListener);
    if (this.clickListener) google.maps.event.removeListener(this.clickListener);
    this.clearAllMarkers();
  }

  private async initGoogleMap(): Promise<void> {
    try {
      const g = await this.mapsLoader.load();
      const mapOptions: google.maps.MapOptions = {
        center: { lat: this.center.lat, lng: this.center.lon },
        zoom: this.zoom,
        mapId: environment.googleMapsMapId || 'DEMO_MAP_ID',
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.TOP_LEFT
        },
        gestureHandling: 'greedy'
      };

      this.googleMap = new g.maps.Map(this.mapContainerElement.nativeElement, mapOptions);
      this.isMapReady.set(true);

      // Listen for idle events (camera pan / zoom finished)
      this.idleListener = this.googleMap.addListener('idle', () => {
        this.emitCurrentBounds();
      });

      // Right-click / contextmenu event
      this.clickListener = this.googleMap.addListener('rightclick', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          this.mapCreate.emit({ lat: e.latLng.lat(), lon: e.latLng.lng() });
        }
      });

      this.updateToiletMarkers();
      this.updateUserMarker();
      this.emitCurrentBounds();
    } catch (err) {
      console.error('Google Maps failed to initialize:', err);
    }
  }

  private emitCurrentBounds(): void {
    if (!this.googleMap) return;
    if (this.moveEndTimer) clearTimeout(this.moveEndTimer);

    this.moveEndTimer = setTimeout(() => {
      const bounds = this.googleMap?.getBounds();
      if (!bounds) return;

      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();

      this.boundsChange.emit({
        south: sw.lat(),
        west: sw.lng(),
        north: ne.lat(),
        east: ne.lng()
      });
    }, 300);
  }

  private updateToiletMarkers(): void {
    if (!this.googleMap || typeof google === 'undefined' || !google.maps.marker) return;

    const currentToiletIds = new Set(this.toilets.map((t) => t.id));

    // Remove markers that are no longer in the list
    for (const [id, marker] of this.markersMap.entries()) {
      if (!currentToiletIds.has(id)) {
        marker.map = null;
        this.markersMap.delete(id);
      }
    }

    // Add new markers
    for (const toilet of this.toilets) {
      if (this.markersMap.has(toilet.id)) continue;

      const position = { lat: toilet.lat, lng: toilet.lon };
      const el = this.createPinElement(toilet);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toiletSelect.emit(toilet);
      });

      const advMarker = new google.maps.marker.AdvancedMarkerElement({
        map: this.googleMap,
        position,
        content: el,
        title: toilet.name
      });

      this.markersMap.set(toilet.id, advMarker);
    }

    if (this.selectedToilet) {
      this.highlightSelectedToilet();
    }
  }

  private createPinElement(toilet: Toilet): HTMLElement {
    const el = document.createElement('div');
    el.className = 'custom-map-pin';
    el.setAttribute('data-id', toilet.id.toString());

    let iconSvg = '';
    let colorClass = 'text-purple-600';

    if (toilet.status === 'temporary_closed' || toilet.temporaryClosed) {
      colorClass = 'text-gray-400';
      iconSvg = `<svg class="w-5 h-5 ${colorClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`;
    } else if (toilet.hasWheelchairAccess) {
      colorClass = 'text-blue-600';
      iconSvg = `<svg class="w-5 h-5 ${colorClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="4" r="2"/><path d="M18 19a6 6 0 0 1-12 0 6 6 0 0 1 12 0Z"/><path d="m14 13 3 3"/><path d="M9 13v-2a2 2 0 0 1 2-2h3"/></svg>`;
    } else if (toilet.hasChangingTable) {
      colorClass = 'text-pink-600';
      iconSvg = `<svg class="w-5 h-5 ${colorClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"/></svg>`;
    } else {
      colorClass = 'text-purple-600';
      iconSvg = `<svg class="w-5 h-5 ${colorClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
    }

    el.innerHTML = iconSvg;
    return el;
  }

  private highlightSelectedToilet(): void {
    if (!this.selectedToilet || !this.googleMap) return;

    this.googleMap.panTo({
      lat: this.selectedToilet.lat,
      lng: this.selectedToilet.lon
    });

    // Update active marker styling
    this.markersMap.forEach((marker, id) => {
      if (marker.content) {
        const el = marker.content as HTMLElement;
        if (id === this.selectedToilet!.id) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      }
    });
  }

  private updateUserMarker(): void {
    if (!this.googleMap || !this.userLocation || typeof google === 'undefined' || !google.maps.marker) return;

    const position = { lat: this.userLocation.lat, lng: this.userLocation.lon };

    if (!this.userMarker) {
      const el = document.createElement('div');
      el.className = 'user-location-marker';

      this.userMarker = new google.maps.marker.AdvancedMarkerElement({
        position,
        map: this.googleMap,
        content: el,
        title: 'Dein Standort'
      });
    } else {
      this.userMarker.position = position;
    }
  }

  private clearAllMarkers(): void {
    this.markersMap.forEach((m) => {
      m.map = null;
    });
    this.markersMap.clear();

    if (this.userMarker) {
      this.userMarker.map = null;
      this.userMarker = undefined;
    }
  }

  toggleMapType(): void {
    if (!this.googleMap) return;
    const nextSat = !this.isSatellite();
    this.isSatellite.set(nextSat);
    this.googleMap.setMapTypeId(
      nextSat ? google.maps.MapTypeId.HYBRID : google.maps.MapTypeId.ROADMAP
    );
  }

  centerOnUser(): void {
    if (!this.googleMap) return;
    if (this.userLocation) {
      this.googleMap.panTo({
        lat: this.userLocation.lat,
        lng: this.userLocation.lon
      });
      this.googleMap.setZoom(16);
    }
  }

  onAddRestroomAtCenter(): void {
    if (!this.googleMap) return;
    const center = this.googleMap.getCenter();
    if (center) {
      this.mapCreate.emit({ lat: center.lat(), lon: center.lng() });
    }
  }
}
