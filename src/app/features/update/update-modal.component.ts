import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as exifr from 'exifr';
import { GooglePlacesPeriod, Toilet, ToiletPhoto, UpdateToiletPayload } from '../../core/models/toilet.model';
import { WcInfoApiService } from '../../core/services/wc-info-api.service';
import { GoogleMapsLoaderService } from '../../core/services/google-maps-loader.service';
import { ThemeService } from '../../core/services/theme.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { EuroKeyModalComponent } from '../../shared/components/euro-key-modal/euro-key-modal.component';
import { PhotoLegalModalComponent } from '../photo-upload/photo-legal-modal.component';

export interface OpeningHoursPeriodModel {
  days: number[];
  is247: boolean;
  openTime: string;
  closeTime: string;
}

export interface NearbyPlaceOption {
  placeId: string;
  name: string;
  vicinity?: string;
  formattedAddress?: string;
  openingHours?: GooglePlacesPeriod[];
}

@Component({
  selector: 'app-update-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, EuroKeyModalComponent, PhotoLegalModalComponent],
  templateUrl: './update-modal.component.html',
})
export class UpdateModalComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly api = inject(WcInfoApiService);
  private readonly mapsLoader = inject(GoogleMapsLoaderService);
  private readonly themeService = inject(ThemeService);

  @Input({ required: true }) toilet!: Toilet;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onUpdated = new EventEmitter<Toilet>();

  @ViewChild('updateMapContainer') mapContainerRef?: ElementRef<HTMLDivElement>;
  @ViewChild('directPhotoInput') directPhotoInputRef?: ElementRef<HTMLInputElement>;

  // Photos state
  readonly photos = signal<ToiletPhoto[]>([]);
  readonly isUploadingPhoto = signal<boolean>(false);
  readonly showPhotoModal = signal<boolean>(false);

  // Venue state
  belongsToVenue = false;
  selectedPlaceId: string | null = null;
  customVenueName = '';
  readonly nearbyPlaces = signal<NearbyPlaceOption[]>([]);

  // Toilet basic info
  name = '';

  // Features
  isGenderSeparated = false;
  hasChangingTable = false;
  hasWheelchairAccess = false;
  euroKey: string | null = null;
  readonly showEuroKeyModal = signal<boolean>(false);

  publicAccessible = true;
  accessibleOutsideOpeningTimes = false;

  // Storage
  storageSpace = 'none';

  // Opening Hours
  specifyOpeningHours = false;
  readonly periods = signal<OpeningHoursPeriodModel[]>([
    {
      days: [1, 2, 3, 4, 5, 6, 0],
      is247: false,
      openTime: '08:00',
      closeTime: '20:00'
    }
  ]);

  readonly dayOptions = [
    { day: 1, label: 'Mo' },
    { day: 2, label: 'Di' },
    { day: 3, label: 'Mi' },
    { day: 4, label: 'Do' },
    { day: 5, label: 'Fr' },
    { day: 6, label: 'Sa' },
    { day: 0, label: 'So' }
  ];

  // Map state
  readonly lat = signal<number>(52.520008);
  readonly lon = signal<number>(13.404954);
  readonly isSatellite = signal<boolean>(false);
  private googleMap?: google.maps.Map;
  private marker?: google.maps.Marker | google.maps.marker.AdvancedMarkerElement;

  // Details
  address = '';
  website = '';
  comment = '';

  readonly isSubmitting = signal<boolean>(false);
  readonly isSuccess = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly venueDropdownDefaultText = computed(() => {
    if (this.toilet.owner) return this.toilet.owner;
    return 'Einrichtung auswählen';
  });

  ngOnInit(): void {
    this.name = this.toilet.name || '';
    this.lat.set(this.toilet.lat || 52.520008);
    this.lon.set(this.toilet.lon || 13.404954);

    this.photos.set(this.toilet.photos ? [...this.toilet.photos] : []);

    this.belongsToVenue = Boolean(this.toilet.placeId || this.toilet.owner);
    this.selectedPlaceId = this.toilet.placeId || null;
    this.customVenueName = this.toilet.owner || '';

    this.isGenderSeparated = Boolean(this.toilet.isGenderSeparated);
    this.hasChangingTable = Boolean(this.toilet.hasChangingTable);
    this.hasWheelchairAccess = Boolean(this.toilet.hasWheelchairAccess);

    const euroKeyVal: any = this.toilet.euroKey;
    if (euroKeyVal === 'yes' || euroKeyVal === 'true' || euroKeyVal === '1' || euroKeyVal === true || euroKeyVal === 1) {
      this.euroKey = 'yes';
    } else {
      this.euroKey = 'no';
    }

    this.publicAccessible = this.toilet.publicAccessible !== false;
    this.accessibleOutsideOpeningTimes = Boolean(this.toilet.accessibleOutsideOpeningTimes);

    if (this.toilet.storageSpace) {
      this.storageSpace = this.toilet.storageSpace;
    } else {
      this.storageSpace = 'none';
    }

    this.address = this.toilet.address || '';
    this.website = this.toilet.website || '';
    this.comment = this.toilet.comment || '';

    // Initialize opening hours
    if (this.toilet.placeOpeningHours && this.toilet.placeOpeningHours.length > 0) {
      this.specifyOpeningHours = true;
      this.initPeriodsFromOpeningHours(this.toilet.placeOpeningHours);
    }

    this.loadNearbyPlaces();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initPickerMap();
    }, 150);
  }

  ngOnDestroy(): void {
    this.googleMap = undefined;
    this.marker = undefined;
  }

  private initPeriodsFromOpeningHours(periods: GooglePlacesPeriod[]): void {
    const periodMap = new Map<string, { days: number[]; is247: boolean; openTime: string; closeTime: string }>();

    for (const p of periods) {
      const is247 = !p.close;
      const openTime = p.open ? `${String(p.open.hour).padStart(2, '0')}:${String(p.open.minute).padStart(2, '0')}` : '08:00';
      const closeTime = p.close ? `${String(p.close.hour).padStart(2, '0')}:${String(p.close.minute).padStart(2, '0')}` : '20:00';
      const key = `${is247}_${openTime}_${closeTime}`;

      if (!periodMap.has(key)) {
        periodMap.set(key, {
          days: [p.open.day],
          is247,
          openTime,
          closeTime
        });
      } else {
        periodMap.get(key)!.days.push(p.open.day);
      }
    }

    const list = Array.from(periodMap.values());
    if (list.length > 0) {
      this.periods.set(list);
    }
  }

  private async loadNearbyPlaces(): Promise<void> {
    try {
      await this.mapsLoader.load();
      if (typeof google !== 'undefined' && google.maps?.importLibrary) {
        const { Place, SearchNearbyRankPreference }: any = await google.maps.importLibrary('places');
        const request = {
          fields: ['displayName', 'location', 'formattedAddress', 'regularOpeningHours'],
          locationRestriction: {
            center: { lat: this.lat(), lng: this.lon() },
            radius: 150
          },
          maxResultCount: 5,
          rankPreference: SearchNearbyRankPreference.DISTANCE
        };

        const { places } = await Place.searchNearby(request);
        if (places && places.length > 0) {
          const mapped: NearbyPlaceOption[] = places.map((r: any) => ({
            placeId: r.id,
            name: r.displayName || '',
            vicinity: r.formattedAddress || '',
            formattedAddress: r.formattedAddress || ''
          }));
          this.nearbyPlaces.set(mapped);
        }
      }
    } catch {
      // Ignore places loader error
    }
  }

  onToggleBelongsToVenue(): void {
    if (!this.belongsToVenue) {
      this.selectedPlaceId = null;
      this.customVenueName = '';
    }
  }

  onVenueSelectChange(): void {
    if (this.selectedPlaceId && this.selectedPlaceId !== 'CUSTOM') {
      const found = this.nearbyPlaces().find((p) => p.placeId === this.selectedPlaceId);
      if (found?.formattedAddress && !this.address) {
        this.address = found.formattedAddress;
      }
    }
  }

  toggleWheelchair(): void {
    this.hasWheelchairAccess = !this.hasWheelchairAccess;
    if (!this.hasWheelchairAccess) {
      this.euroKey = 'no';
    }
  }

  // --- Opening Hours Actions ---
  addPeriod(): void {
    this.periods.update((list) => [
      ...list,
      {
        days: [6, 0],
        is247: false,
        openTime: '10:00',
        closeTime: '18:00'
      }
    ]);
  }

  removePeriod(index: number): void {
    if (this.periods().length > 1) {
      this.periods.update((list) => list.filter((_, i) => i !== index));
    }
  }

  toggleDayForPeriod(periodIndex: number, day: number): void {
    this.periods.update((list) =>
      list.map((p, i) => {
        if (i !== periodIndex) return p;
        const days = [...p.days];
        const idx = days.indexOf(day);
        if (idx >= 0) {
          if (days.length > 1) {
            days.splice(idx, 1);
          }
        } else {
          days.push(day);
        }
        return { ...p, days };
      })
    );
  }

  toggle247ForPeriod(periodIndex: number): void {
    this.periods.update((list) =>
      list.map((p, i) => {
        if (i !== periodIndex) return p;
        return { ...p, is247: !p.is247 };
      })
    );
  }

  updatePeriodTime(periodIndex: number, field: 'openTime' | 'closeTime', value: string): void {
    this.periods.update((list) =>
      list.map((p, i) => {
        if (i !== periodIndex) return p;
        return { ...p, [field]: value };
      })
    );
  }

  // --- Map Logic ---
  private async initPickerMap(): Promise<void> {
    if (!this.mapContainerRef?.nativeElement) return;

    try {
      const g = await this.mapsLoader.load();
      const isDark = this.themeService.isDark();
      const center = { lat: this.lat(), lng: this.lon() };

      const mapOptions: google.maps.MapOptions = {
        center,
        zoom: 17,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy'
      };

      this.googleMap = new g.maps.Map(this.mapContainerRef.nativeElement, mapOptions);

      if (g.maps.marker?.AdvancedMarkerElement) {
        this.marker = new g.maps.marker.AdvancedMarkerElement({
          map: this.googleMap,
          position: center,
          gmpDraggable: true
        });

        this.marker.addListener('dragend', (e: any) => {
          if (e.latLng) {
            this.lat.set(e.latLng.lat());
            this.lon.set(e.latLng.lng());
          }
        });
      } else {
        this.marker = new g.maps.Marker({
          map: this.googleMap,
          position: center,
          draggable: true
        });

        this.marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            this.lat.set(e.latLng.lat());
            this.lon.set(e.latLng.lng());
          }
        });
      }

      this.googleMap.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const lat = e.latLng.lat();
          const lon = e.latLng.lng();
          this.lat.set(lat);
          this.lon.set(lon);

          if (this.marker) {
            if ((this.marker as any).position) {
              (this.marker as any).position = { lat, lng: lon };
            }
          }
        }
      });
    } catch (err) {
      console.error('Failed to init update modal map:', err);
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

  confirmLocation(): void {
    // Reverse geocode location if address is empty
    if (!this.address && typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
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

  private buildGooglePlacesPeriods(): GooglePlacesPeriod[] {
    const result: GooglePlacesPeriod[] = [];

    for (const p of this.periods()) {
      if (p.is247) {
        for (const day of p.days) {
          result.push({
            open: { day, hour: 0, minute: 0 },
            close: null
          });
        }
      } else {
        const [hOpen, mOpen] = (p.openTime || '08:00').split(':').map((n) => parseInt(n, 10) || 0);
        const [hClose, mClose] = (p.closeTime || '20:00').split(':').map((n) => parseInt(n, 10) || 0);

        for (const day of p.days) {
          result.push({
            open: { day, hour: hOpen, minute: mOpen },
            close: { day, hour: hClose, minute: mClose }
          });
        }
      }
    }

    return result;
  }

  triggerPhotoUpload(): void {
    const isConfirmed = typeof window !== 'undefined' && localStorage.getItem('wc_photo_legal_confirmed') === 'true';
    if (isConfirmed) {
      this.directPhotoInputRef?.nativeElement?.click();
    } else {
      this.showPhotoModal.set(true);
    }
  }

  async onDirectPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.isUploadingPhoto.set(true);

    let exifDataString: string | undefined;
    let fixedGeo: { lat: number; lon: number } | undefined;

    try {
      const parsed = await exifr.parse(file, { gps: true });
      if (parsed) {
        exifDataString = JSON.stringify(parsed);
        if (parsed.latitude && parsed.longitude) {
          fixedGeo = { lat: parsed.latitude, lon: parsed.longitude };
        }
      }
    } catch {
      // Ignore exif parse error
    }

    this.api.uploadPhoto(file, this.toilet.id, exifDataString, fixedGeo).subscribe({
      next: (res) => {
        this.isUploadingPhoto.set(false);
        input.value = '';
        const newPhoto: ToiletPhoto = {
          id: Date.now(),
          toiletId: this.toilet.id,
          url: res.imageUrl || '',
          urlThumb: res.thumbUrl || res.imageUrl || '',
          filename: res.filename
        };
        this.photos.update((list) => [...list, newPhoto]);
        if (this.toilet.photos) {
          this.toilet.photos = [...this.toilet.photos, newPhoto];
        } else {
          this.toilet.photos = [newPhoto];
        }
      },
      error: (err) => {
        this.isUploadingPhoto.set(false);
        input.value = '';
        this.errorMessage.set(err?.message || 'Photo upload failed');
      }
    });
  }

  onPhotoUploaded(data: { url: string; thumbUrl?: string; filename: string }): void {
    this.showPhotoModal.set(false);
    const newPhoto: ToiletPhoto = {
      id: Date.now(),
      toiletId: this.toilet.id,
      url: data.url,
      urlThumb: data.thumbUrl || data.url,
      filename: data.filename
    };
    this.photos.update((list) => [...list, newPhoto]);
    if (this.toilet.photos) {
      this.toilet.photos = [...this.toilet.photos, newPhoto];
    } else {
      this.toilet.photos = [newPhoto];
    }
  }

  deletePhoto(photo: ToiletPhoto, index: number, event: Event): void {
    event.stopPropagation();
    if (photo.filename) {
      this.api.deletePhoto(this.toilet.id, photo.filename).subscribe({
        error: (err) => console.error('Failed to delete photo:', err)
      });
    }
    this.photos.update((list) => list.filter((_, i) => i !== index));
    if (this.toilet.photos) {
      this.toilet.photos = this.toilet.photos.filter((_, i) => i !== index);
    }
  }

  submitUpdate(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    let ownerValue: string | null = null;
    let placeIdValue: string | null = null;

    if (this.belongsToVenue) {
      if (this.selectedPlaceId === 'CUSTOM') {
        ownerValue = this.customVenueName.trim() || null;
        placeIdValue = null;
      } else if (this.selectedPlaceId) {
        placeIdValue = this.selectedPlaceId;
        const place = this.nearbyPlaces().find((p) => p.placeId === this.selectedPlaceId);
        ownerValue = place?.name || this.toilet.owner || null;
      } else {
        ownerValue = this.toilet.owner || null;
        placeIdValue = this.toilet.placeId || null;
      }
    }

    const payload: UpdateToiletPayload = {
      lat: this.lat(),
      lon: this.lon(),
      name: this.name.trim() || null,
      owner: ownerValue,
      place_id: placeIdValue,
      is_gender_separated: this.isGenderSeparated,
      is_unisex: !this.isGenderSeparated,
      has_wheelchair_access: this.hasWheelchairAccess,
      has_changing_table: this.hasChangingTable,
      euro_key: this.hasWheelchairAccess ? (this.euroKey === 'yes' ? 'yes' : 'no') : 'no',
      public_accessible: this.publicAccessible,
      accessible_outside_opening_times: this.accessibleOutsideOpeningTimes,
      storage_space: this.storageSpace || 'none',
      place_opening_hours: this.specifyOpeningHours ? this.buildGooglePlacesPeriods() : null,
      address: this.address.trim() || null,
      website: this.website.trim() || null,
      comment: this.comment.trim() || null
    };

    this.api.updateToilet(this.toilet.id, payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isSuccess.set(true);
        const updated: Toilet = {
          ...this.toilet,
          lat: this.lat(),
          lon: this.lon(),
          name: this.name.trim() || this.toilet.name,
          owner: ownerValue,
          placeId: placeIdValue,
          isGenderSeparated: this.isGenderSeparated,
          isUnisex: !this.isGenderSeparated,
          hasWheelchairAccess: this.hasWheelchairAccess,
          hasChangingTable: this.hasChangingTable,
          euroKey: this.hasWheelchairAccess ? (this.euroKey === 'yes' ? 'yes' : 'no') : 'no',
          publicAccessible: this.publicAccessible,
          accessibleOutsideOpeningTimes: this.accessibleOutsideOpeningTimes,
          storageSpace: this.storageSpace || 'none',
          placeOpeningHours: this.specifyOpeningHours ? this.buildGooglePlacesPeriods() : null,
          address: this.address.trim() || null,
          website: this.website.trim() || null,
          comment: this.comment.trim() || null,
          photos: this.photos()
        };
        this.onUpdated.emit(updated);
        setTimeout(() => this.onCancel.emit(), 1200);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.message || 'Update failed');
      }
    });
  }
}
