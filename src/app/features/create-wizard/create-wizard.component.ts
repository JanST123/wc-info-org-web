import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Coordinates, LocationService } from '../../core/services/location.service';
import {
  AddToiletPayload,
  GooglePlacesPeriod,
  Toilet,
  UpdateToiletPayload
} from '../../core/models/toilet.model';
import { WcInfoApiService } from '../../core/services/wc-info-api.service';
import { GoogleMapsLoaderService } from '../../core/services/google-maps-loader.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TranslationService } from '../../core/services/translation.service';
import { PhotoLegalModalComponent } from '../photo-upload/photo-legal-modal.component';
import confetti from 'canvas-confetti';

export type WizardStepId =
  | 'place_id'
  | 'name'
  | 'sensor_location'
  | 'map_location'
  | 'gender_separated'
  | 'wheelchair'
  | 'euro_key'
  | 'address'
  | 'opening_hours'
  | 'public_accessible'
  | 'accessible_outside'
  | 'storage_space'
  | 'photo'
  | 'comment'
  | 'success';

export interface NearbyPlaceOption {
  placeId: string;
  name: string;
  vicinity?: string;
  distanceMeters?: number;
  lat?: number;
  lon?: number;
  formattedAddress?: string;
  openingHours?: GooglePlacesPeriod[];
}

@Component({
  selector: 'app-create-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PhotoLegalModalComponent],
  templateUrl: './create-wizard.component.html'
})
export class CreateWizardComponent implements OnInit {
  private readonly api = inject(WcInfoApiService);
  private readonly locationService = inject(LocationService);
  private readonly mapsLoader = inject(GoogleMapsLoaderService);
  private readonly translationService = inject(TranslationService);

  @Input() initialCoords: Coordinates | null = null;

  @Output() onCancel = new EventEmitter<void>();
  @Output() onCreated = new EventEmitter<Toilet>();

  @ViewChild('mapContainer') mapContainerRef?: ElementRef<HTMLDivElement>;

  // Dynamic step identifier
  readonly currentStepId = signal<WizardStepId>('place_id');

  // Toilet creation persistence state
  readonly createdToiletId = signal<number | null>(null);
  readonly isSaved = computed(() => this.createdToiletId() !== null);

  // Places Search state (Step 1)
  readonly loadingNearbyPlaces = signal<boolean>(false);
  readonly nearbyPlaces = signal<NearbyPlaceOption[]>([]);
  readonly selectedPlace = signal<NearbyPlaceOption | null>(null);
  readonly selectedPlaceNoChoice = signal<boolean>(false);

  // Name (Step 2)
  name = '';

  // Sensor location (Step 3)
  readonly usedSensorLocation = signal<boolean | null>(null);

  // Map location (Step 4)
  readonly lat = signal<number>(52.520008);
  readonly lon = signal<number>(13.404954);
  private pickerMap?: google.maps.Map;
  private pickerMarker?: google.maps.Marker;

  // Gender separated (Step 5)
  readonly isGenderSeparated = signal<boolean | null>(null);
  readonly isUnisex = signal<boolean | null>(null);

  // Wheelchair (Step 6)
  readonly hasWheelchairAccess = signal<boolean | null>(null);

  // Euro Key (Step 7)
  readonly euroKey = signal<string | null>(null);

  // Address (Step 8)
  address = '';

  // Opening Hours (Step 9)
  readonly knowsOpeningHours = signal<boolean | null>(null);
  readonly hours247 = signal<boolean>(false);
  readonly selectedDays = signal<number[]>([1, 2, 3, 4, 5, 6, 0]); // Mon..Sat, Sun
  period1Open = '08:00';
  period1Close = '20:00';
  readonly hasPeriod2 = signal<boolean>(false);
  period2Open = '14:00';
  period2Close = '22:00';
  readonly configuredOpeningHours = signal<GooglePlacesPeriod[] | null>(null);

  readonly dayOptions = [
    { day: 1, label: 'Mo' },
    { day: 2, label: 'Di' },
    { day: 3, label: 'Mi' },
    { day: 4, label: 'Do' },
    { day: 5, label: 'Fr' },
    { day: 6, label: 'Sa' },
    { day: 0, label: 'So' }
  ];

  // Public Accessibility (Step 10)
  readonly publicAccessible = signal<boolean | null>(null);

  // Outside Access (Step 11)
  readonly accessibleOutsideOpeningTimes = signal<boolean | null>(null);

  // Storage Space (Step 12)
  readonly storageSpace = signal<string | null>(null);

  // Photos (Step 13)
  readonly showPhotoModal = signal<boolean>(false);
  readonly uploadedPhotosCount = signal<number>(0);

  // Comment (Step 14)
  comment = '';

  // Dynamic step engine
  readonly activeSteps = computed<WizardStepId[]>(() => {
    const steps: WizardStepId[] = ['place_id', 'name', 'sensor_location'];

    // Map picker step: ONLY if NO place was selected in step 1 AND sensor was denied in step 3
    if (this.selectedPlace() === null && this.usedSensorLocation() === false) {
      steps.push('map_location');
    }

    steps.push('gender_separated', 'wheelchair');

    // Euro key step: ONLY if wheelchair access is YES
    if (this.hasWheelchairAccess() === true) {
      steps.push('euro_key');
    }

    // Address step: ONLY if NO place was selected in step 1
    if (this.selectedPlace() === null) {
      steps.push('address');
    }

    // Opening hours step: ONLY if NO place was selected OR selected place has no opening hours
    const placeHasHours = !!this.selectedPlace()?.openingHours && this.selectedPlace()!.openingHours!.length > 0;
    if (this.selectedPlace() === null || !placeHasHours) {
      steps.push('opening_hours');
    }

    steps.push(
      'public_accessible',
      'accessible_outside',
      'storage_space',
      'photo',
      'comment',
      'success'
    );

    return steps;
  });

  readonly totalQuestions = computed<number>(() => {
    return this.activeSteps().filter((s) => s !== 'success').length;
  });

  readonly currentStepNumber = computed<number>(() => {
    const index = this.activeSteps().indexOf(this.currentStepId());
    return index >= 0 ? index + 1 : 1;
  });

  readonly canGoBack = computed<boolean>(() => {
    return this.currentStepId() !== 'place_id' && this.currentStepId() !== 'success';
  });

  ngOnInit(): void {
    if (this.initialCoords) {
      this.lat.set(this.initialCoords.lat);
      this.lon.set(this.initialCoords.lon);
    }
    this.fetchNearbyPlaces();
  }

  // --- Step 1: Nearby Places Search ---
  private async fetchNearbyPlaces(): Promise<void> {
    this.loadingNearbyPlaces.set(true);

    try {
      await this.mapsLoader.load();

      if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
        const dummyDiv = document.createElement('div');
        const service: google.maps.places.PlacesService = new (window as any).google.maps.places.PlacesService(dummyDiv);
        const center = new (window as any).google.maps.LatLng(this.lat(), this.lon());

        service.nearbySearch(
          {
            location: center,
            radius: 100,
            rankBy: google.maps.places.RankBy.DISTANCE,
          },
          (results: any[], status: any) => {
            this.loadingNearbyPlaces.set(false);
            if (status === 'OK' && results && results.length > 0) {
              const mapped: NearbyPlaceOption[] = results
                .slice(0, 3)
                .map((r: any) => {
                  const placeLat = r.geometry?.location?.lat?.() ?? this.lat();
                  const placeLng = r.geometry?.location?.lng?.() ?? this.lon();
                  const dist = Math.round(
                    this.locationService.calculateDistance(this.lat(), this.lon(), placeLat, placeLng)
                  );

                  return {
                    placeId: r.place_id,
                    name: r.name,
                    vicinity: r.vicinity || r.formatted_address,
                    distanceMeters: dist,
                    lat: placeLat,
                    lon: placeLng
                  };
                });
              this.nearbyPlaces.set(mapped);
            } else {
              this.nearbyPlaces.set([]);
            }
          }
        );
        return;
      }
    } catch {
      // Fallback
    }

    this.loadingNearbyPlaces.set(false);
    this.nearbyPlaces.set([]);
  }

  selectPlace(place: NearbyPlaceOption): void {
    this.selectedPlace.set(place);
    this.selectedPlaceNoChoice.set(false);

    if (place.lat !== undefined && place.lon !== undefined) {
      this.lat.set(place.lat);
      this.lon.set(place.lon);
    }

    // Fetch place details for address & opening hours if Google Places is available
    if (typeof window !== 'undefined' && (window as any).google?.maps?.places && place.placeId) {
      try {
        const dummyDiv = document.createElement('div');
        const service = new (window as any).google.maps.places.PlacesService(dummyDiv);
        service.getDetails(
          {
            placeId: place.placeId,
            fields: ['name', 'formatted_address', 'opening_hours', 'geometry']
          },
          (detail: any, status: any) => {
            if (status === 'OK' && detail) {
              const periods: GooglePlacesPeriod[] | undefined = detail.opening_hours?.periods?.map((p: any) => ({
                open: {
                  day: p.open?.day ?? 0,
                  hour: p.open?.hours ?? p.open?.hour ?? 0,
                  minute: p.open?.minutes ?? p.open?.minute ?? 0
                },
                close: p.close
                  ? {
                      day: p.close?.day ?? 0,
                      hour: p.close?.hours ?? p.close?.hour ?? 0,
                      minute: p.close?.minutes ?? p.close?.minute ?? 0
                    }
                  : null
              }));

              this.selectedPlace.set({
                ...place,
                formattedAddress: detail.formatted_address || place.vicinity,
                openingHours: periods,
                lat: detail.geometry?.location?.lat?.() ?? place.lat,
                lon: detail.geometry?.location?.lng?.() ?? place.lon
              });

              if (detail.formatted_address) {
                this.address = detail.formatted_address;
              }
            }
          }
        );
      } catch {
        // Ignore details fetch errors
      }
    }

    this.advanceToNextStep();
  }

  selectNoPlace(): void {
    this.selectedPlace.set(null);
    this.selectedPlaceNoChoice.set(true);
    this.advanceToNextStep();
  }

  // --- Step 3: Sensor Choice ---
  async handleSensorChoice(useSensor: boolean): Promise<void> {
    this.usedSensorLocation.set(useSensor);

    if (useSensor) {
      try {
        const pos = await this.locationService.getCurrentPosition();
        this.lat.set(pos.lat);
        this.lon.set(pos.lon);
      } catch {
        // Use initial coords fallback
      }
      this.advanceToNextStep();
    } else {
      this.advanceToNextStep();
      if (this.currentStepId() === 'map_location') {
        setTimeout(() => this.initPickerMap(), 150);
      }
    }
  }

  // --- Step 4: Map Location Picker ---
  private async initPickerMap(): Promise<void> {
    if (!this.mapContainerRef?.nativeElement) return;

    try {
      const g = await this.mapsLoader.load();
      const pos = { lat: this.lat(), lng: this.lon() };

      this.pickerMap = new g.maps.Map(this.mapContainerRef.nativeElement, {
        center: pos,
        zoom: 17,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy'
      });

      this.pickerMarker = new g.maps.Marker({
        position: pos,
        map: this.pickerMap,
        draggable: true,
        animation: g.maps.Animation.DROP
      });

      this.pickerMarker.addListener('dragend', (evt: any) => {
        if (evt.latLng) {
          this.lat.set(evt.latLng.lat());
          this.lon.set(evt.latLng.lng());
        }
      });

      this.pickerMap.addListener('click', (evt: any) => {
        if (evt.latLng) {
          this.lat.set(evt.latLng.lat());
          this.lon.set(evt.latLng.lng());
          this.pickerMarker?.setPosition(evt.latLng);
        }
      });
    } catch {
      // Map error fallback
    }
  }

  advanceAfterMap(): void {
    this.advanceToNextStep();
  }

  // --- Step 5: Gender Separation ---
  setGender(separated: boolean): void {
    this.isGenderSeparated.set(separated);
    this.isUnisex.set(!separated);
    this.advanceToNextStep();
  }

  // --- Step 6: Wheelchair Access ---
  setWheelchair(hasAccess: boolean): void {
    this.hasWheelchairAccess.set(hasAccess);

    if (hasAccess) {
      // Moves to Step 7 (euro_key)
      this.advanceToNextStep();
    } else {
      // Persist baseline creation right away!
      this.persistBaselineAndAdvance();
    }
  }

  // --- Step 7: Euro Key ---
  setEuroKey(value: string): void {
    this.euroKey.set(value);
    this.persistBaselineAndAdvance();
  }

  // --- Milestone: Persistence (POST baseline creation) ---
  private persistBaselineAndAdvance(): void {
    if (this.createdToiletId()) {
      this.savePatchAndAdvance();
      return;
    }

    const payload: AddToiletPayload = {
      lat: this.lat(),
      lon: this.lon(),
      owner: this.selectedPlace()?.name || null,
      placeId: this.selectedPlace()?.placeId || null,
      name: this.name.trim() || null,
      publicAccessible: this.publicAccessible() ?? true,
      hasWheelchairAccess: this.hasWheelchairAccess() ?? false,
      isGenderSeparated: this.isGenderSeparated() ?? false,
      isUnisex: this.isUnisex() ?? true,
      euroKey: this.euroKey() || null,
      address: this.selectedPlace()?.formattedAddress || null,
      placeOpeningHours: this.selectedPlace()?.openingHours || null
    };

    this.api.addToilet(payload).subscribe({
      next: (res) => {
        this.createdToiletId.set(res.id);
        this.advanceToNextStep();
        this.checkAndPreloadAddress();
      },
      error: () => {
        // Fallback fake ID so user can still continue wizard offline
        this.createdToiletId.set(Date.now());
        this.advanceToNextStep();
        this.checkAndPreloadAddress();
      }
    });
  }

  private checkAndPreloadAddress(): void {
    if (!this.address && this.selectedPlace() === null) {
      this.reverseGeocode();
    }
  }

  private reverseGeocode(): void {
    if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode(
        { location: { lat: this.lat(), lng: this.lon() } },
        (results: any[], status: any) => {
          if (status === 'OK' && results && results[0]?.formatted_address) {
            this.address = results[0].formatted_address;
          }
        }
      );
    }
  }

  // --- Step 8: Address Confirmation ---
  saveAddressAndNext(): void {
    this.savePatchAndAdvance();
  }

  skipAddressAndNext(): void {
    this.address = '';
    this.advanceToNextStep();
  }

  // --- Step 9: Opening Hours ---
  toggleDay(day: number): void {
    const current = [...this.selectedDays()];
    const index = current.indexOf(day);
    if (index >= 0) {
      if (current.length > 1) {
        current.splice(index, 1);
      }
    } else {
      current.push(day);
    }
    this.selectedDays.set(current);
  }

  skipOpeningHours(): void {
    this.configuredOpeningHours.set(null);
    this.advanceToNextStep();
  }

  saveOpeningHoursAndNext(): void {
    const periods: GooglePlacesPeriod[] = [];
    const days = this.selectedDays();

    if (this.hours247()) {
      for (const day of days) {
        periods.push({
          open: { day, hour: 0, minute: 0 },
          close: null
        });
      }
    } else {
      const [h1Open, m1Open] = this.period1Open.split(':').map((n) => parseInt(n, 10) || 0);
      const [h1Close, m1Close] = this.period1Close.split(':').map((n) => parseInt(n, 10) || 0);

      for (const day of days) {
        periods.push({
          open: { day, hour: h1Open, minute: m1Open },
          close: { day, hour: h1Close, minute: m1Close }
        });

        if (this.hasPeriod2()) {
          const [h2Open, m2Open] = this.period2Open.split(':').map((n) => parseInt(n, 10) || 0);
          const [h2Close, m2Close] = this.period2Close.split(':').map((n) => parseInt(n, 10) || 0);
          periods.push({
            open: { day, hour: h2Open, minute: m2Open },
            close: { day, hour: h2Close, minute: m2Close }
          });
        }
      }
    }

    this.configuredOpeningHours.set(periods);
    this.savePatchAndAdvance();
  }

  // --- Step 10: Public Accessibility ---
  setPublicAccessible(value: boolean): void {
    this.publicAccessible.set(value);
    this.savePatchAndAdvance();
  }

  // --- Step 11: Outside Access ---
  setOutsideAccess(value: boolean): void {
    this.accessibleOutsideOpeningTimes.set(value);
    this.savePatchAndAdvance();
  }

  // --- Step 12: Storage Space ---
  setStorageSpace(value: string | null): void {
    this.storageSpace.set(value);
    this.savePatchAndAdvance();
  }

  // --- Step 13: Photos ---
  onPhotoUploaded(data: { url: string; thumbUrl?: string; filename: string }): void {
    this.uploadedPhotosCount.update((c) => c + 1);
    this.showPhotoModal.set(false);
  }

  // --- Universal Step Navigation & Subsequent PATCH Updates ---
  nextStep(): void {
    if (this.createdToiletId()) {
      this.savePatchAndAdvance();
    } else {
      this.advanceToNextStep();
    }
  }

  prevStep(): void {
    const steps = this.activeSteps();
    const currentIndex = steps.indexOf(this.currentStepId());
    if (currentIndex > 0) {
      this.currentStepId.set(steps[currentIndex - 1]);
    }
  }

  private advanceToNextStep(): void {
    const steps = this.activeSteps();
    const currentIndex = steps.indexOf(this.currentStepId());
    if (currentIndex >= 0 && currentIndex < steps.length - 1) {
      const nextStepId = steps[currentIndex + 1];
      this.currentStepId.set(nextStepId);

      if (nextStepId === 'success') {
        this.triggerConfetti();
      }
    }
  }

  private savePatchAndAdvance(): void {
    const toiletId = this.createdToiletId();
    if (toiletId) {
      const payload: UpdateToiletPayload = {
        lat: this.lat(),
        lon: this.lon(),
        name: this.name.trim() || null,
        owner: this.selectedPlace()?.name || null,
        euroKey: this.euroKey() || null,
        isGenderSeparated: this.isGenderSeparated() ?? false,
        isUnisex: this.isUnisex() ?? true,
        hasWheelchairAccess: this.hasWheelchairAccess() ?? false,
        publicAccessible: this.publicAccessible() ?? true,
        accessibleOutsideOpeningTimes: this.accessibleOutsideOpeningTimes() ?? false,
        storageSpace: this.storageSpace(),
        address: this.address.trim() || this.selectedPlace()?.formattedAddress || null,
        placeOpeningHours: this.configuredOpeningHours() || this.selectedPlace()?.openingHours || null,
        comment: this.comment.trim() || null
      };

      this.api.updateToilet(toiletId, payload).subscribe();
    }

    this.advanceToNextStep();
  }

  triggerConfetti(): void {
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignore
    }
  }

  finishDirectly(): void {
    this.currentStepId.set('success');
    this.triggerConfetti();
  }

  handleClose(): void {
    if (this.isSaved()) {
      this.onComplete();
    } else {
      this.onCancel.emit();
    }
  }

  onComplete(): void {
    const created: Toilet = {
      id: this.createdToiletId() || Date.now(),
      name: this.name.trim() || 'Öffentliche Toilette',
      owner: this.selectedPlace()?.name || null,
      lat: this.lat(),
      lon: this.lon(),
      placeId: this.selectedPlace()?.placeId || null,
      publicAccessible: this.publicAccessible() ?? true,
      hasWheelchairAccess: this.hasWheelchairAccess() ?? false,
      euroKey: this.euroKey() || null,
      isUnisex: this.isUnisex() ?? true,
      isGenderSeparated: this.isGenderSeparated() ?? false,
      storageSpace: this.storageSpace(),
      address: this.address.trim() || this.selectedPlace()?.formattedAddress || null,
      placeOpeningHours: this.configuredOpeningHours() || this.selectedPlace()?.openingHours || null,
      accessibleOutsideOpeningTimes: this.accessibleOutsideOpeningTimes() ?? false,
      comment: this.comment.trim() || null,
      photos: []
    };

    this.onCreated.emit(created);
  }
}
