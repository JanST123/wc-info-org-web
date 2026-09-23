import { Injectable, computed, inject, signal } from '@angular/core';
import { Toilet } from '../models/toilet.model';
import { DEFAULT_FILTER_SETTINGS, ToiletFilterSettings, buildApiFilterQuery } from '../models/filter-settings.model';
import { WcInfoApiService } from './wc-info-api.service';
import { Coordinates, LocationService } from './location.service';

@Injectable({
  providedIn: 'root'
})
export class ToiletStateService {
  private readonly api = inject(WcInfoApiService);
  private readonly locationService = inject(LocationService);

  readonly toilets = signal<Toilet[]>([]);
  readonly selectedToilet = signal<Toilet | null>(null);
  readonly filterSettings = signal<ToiletFilterSettings>(DEFAULT_FILTER_SETTINGS);
  readonly userLocation = signal<Coordinates | null>(null);
  readonly mapCenter = signal<Coordinates>({ lat: 52.520008, lon: 13.404954 }); // Default Berlin
  readonly zoom = signal<number>(14);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Mobile drawer state
  readonly mobileSheetState = signal<'peek' | 'half' | 'full'>('peek');
  readonly isCreateWizardOpen = signal<boolean>(false);
  readonly createInitialCoords = signal<Coordinates | null>(null);
  readonly isFeedbackOpen = signal<boolean>(false);
  readonly isUpdateOpen = signal<boolean>(false);

  // Computed: Toilets with live distances from userLocation (if available)
  readonly enrichedToilets = computed(() => {
    const list = this.toilets();
    const user = this.userLocation();

    if (!user) {
      return list;
    }

    return list
      .map((t) => {
        const distanceMeters = this.locationService.calculateDistance(user.lat, user.lon, t.lat, t.lon);
        return {
          ...t,
          distanceMeters,
          distance: distanceMeters / 1000
        };
      })
      .sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
  });

  // Computed: Active filter count (deviations from defaults)
  readonly activeFilterCount = computed(() => {
    const f = this.filterSettings();
    let count = 0;
    if (f.showClosed) count++;
    if (!f.showNonPublic) count++;
    if (!f.showNonWheelchairAccessible) count++;
    if (!f.showWithoutChangingTable) count++;
    if (!f.showWithoutGenderSeparation) count++;
    if (!f.showWithoutEuroKey) count++;
    return count;
  });

  constructor() {
    this.initUserLocation();
  }

  private initUserLocation(): void {
    this.locationService.getCurrentPosition()
      .then((coords) => {
        this.userLocation.set(coords);
        this.mapCenter.set(coords);
      })
      .catch(() => {
        // Geolocation denied or unavailable
      });
  }

  private lastBounds: { south: number; west: number; north: number; east: number } | null = null;
  private lastNearby: { lat: number; lon: number; distance: number } | null = null;

  setFilterSettings(settings: ToiletFilterSettings): void {
    this.filterSettings.set(settings);
    this.reloadCurrentView();
  }

  resetFilterSettings(): void {
    this.filterSettings.set(DEFAULT_FILTER_SETTINGS);
    this.reloadCurrentView();
  }

  reloadCurrentView(): void {
    if (this.lastBounds) {
      this.loadToiletsInBounds(
        this.lastBounds.south,
        this.lastBounds.west,
        this.lastBounds.north,
        this.lastBounds.east
      );
    } else if (this.lastNearby) {
      this.loadToiletsNearby(
        this.lastNearby.lat,
        this.lastNearby.lon,
        this.lastNearby.distance
      );
    } else if (this.userLocation()) {
      const user = this.userLocation()!;
      this.loadToiletsNearby(user.lat, user.lon);
    } else {
      const center = this.mapCenter();
      this.loadToiletsNearby(center.lat, center.lon);
    }
  }

  setSelectedToilet(toilet: Toilet | null): void {
    this.selectedToilet.set(toilet);
    if (toilet) {
      this.mobileSheetState.set('peek');
    }
  }

  loadToiletsInBounds(south: number, west: number, north: number, east: number): void {
    this.lastBounds = { south, west, north, east };
    const filterQuery = buildApiFilterQuery(this.filterSettings());
    this.isLoading.set(true);
    this.error.set(null);

    this.api.fetchToiletsInBounds(south, west, north, east, filterQuery).subscribe({
      next: (items) => {
        this.isLoading.set(false);
        // Merge or replace toilets
        this.toilets.set(items);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set('Failed to load toilets in bounds');
        console.error('Bounds load error:', err);
      }
    });
  }

  loadToiletsNearby(lat: number, lon: number, distance = 10): void {
    this.lastNearby = { lat, lon, distance };
    const filterQuery = buildApiFilterQuery(this.filterSettings());
    this.isLoading.set(true);
    this.error.set(null);

    this.api.fetchToiletsNearby(lat, lon, distance, filterQuery).subscribe({
      next: (items) => {
        this.isLoading.set(false);
        this.toilets.set(items);
        this.mapCenter.set({ lat, lon });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set('Failed to load nearby toilets');
        console.error('Nearby load error:', err);
      }
    });
  }

  addToiletToState(toilet: Toilet): void {
    this.toilets.update((prev) => [toilet, ...prev.filter((t) => t.id !== toilet.id)]);
    this.selectedToilet.set(toilet);
  }

  updateToiletInState(toilet: Toilet): void {
    this.toilets.update((prev) =>
      prev.map((t) => (t.id === toilet.id ? { ...t, ...toilet } : t))
    );
    if (this.selectedToilet()?.id === toilet.id) {
      this.selectedToilet.update((current) => (current ? { ...current, ...toilet } : toilet));
    }
  }

  openCreateWizard(coords?: Coordinates): void {
    this.createInitialCoords.set(coords || this.userLocation() || this.mapCenter());
    this.isCreateWizardOpen.set(true);
  }

  closeCreateWizard(): void {
    this.isCreateWizardOpen.set(false);
    this.createInitialCoords.set(null);
  }
}
