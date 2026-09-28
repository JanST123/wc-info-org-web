import { Component, ElementRef, OnInit, ViewChild, effect, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import * as exifr from 'exifr';
import { FilterBannerComponent } from '../../shared/components/filter-banner/filter-banner.component';
import { ToiletCardComponent } from '../../shared/components/toilet-card/toilet-card.component';
import { MapComponent } from '../map/map.component';
import { DetailComponent } from '../detail/detail.component';
import { CreateWizardComponent } from '../create-wizard/create-wizard.component';
import { FeedbackModalComponent } from '../feedback/feedback-modal.component';
import { UpdateModalComponent } from '../update/update-modal.component';
import { PhotoLegalModalComponent } from '../photo-upload/photo-legal-modal.component';
import { PhotoLightboxModalComponent } from '../../shared/components/photo-lightbox-modal/photo-lightbox-modal.component';
import { ToiletStateService } from '../../core/services/toilet-state.service';
import { Coordinates, LocationService } from '../../core/services/location.service';
import { PlacesService } from '../../core/services/places.service';
import { WcInfoApiService } from '../../core/services/wc-info-api.service';
import { SeoService } from '../../core/services/seo.service';
import { Toilet, ToiletPhoto } from '../../core/models/toilet.model';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { parsePlaceSlug, parseToiletSlug, createToiletSlug, createPlaceSlug } from '../../core/utils/slug.utils';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FilterBannerComponent,
    ToiletCardComponent,
    MapComponent,
    DetailComponent,
    CreateWizardComponent,
    FeedbackModalComponent,
    UpdateModalComponent,
    PhotoLegalModalComponent,
    PhotoLightboxModalComponent,
    TranslatePipe
  ],
  templateUrl: './results.component.html',
})
export class ResultsComponent implements OnInit {
  readonly toiletState = inject(ToiletStateService);
  private readonly placesService = inject(PlacesService);
  private readonly locationService = inject(LocationService);
  private readonly api = inject(WcInfoApiService);
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seoService = inject(SeoService);

  readonly toilets = this.toiletState.enrichedToilets;
  readonly selectedToilet = this.toiletState.selectedToilet;
  readonly mapCenter = this.toiletState.mapCenter;
  readonly userLocation = this.toiletState.userLocation;
  readonly isLoading = this.toiletState.isLoading;

  readonly listHeightPercent = signal<number>(60);
  readonly currentPlaceSlug = signal<string>('Aktueller-Standort---NEARBY');

  constructor() {
    effect(() => {
      const detailToilet = this.activeDetailToilet();
      if (detailToilet) {
        this.seoService.setToiletSeo(detailToilet);
        return;
      }

      const searchLoc = this.toiletState.searchLocation();
      if (searchLoc?.name && searchLoc.name.trim().length > 0) {
        this.seoService.setPlacesSeo(searchLoc.name.trim());
        return;
      }

      const placeSlug = this.currentPlaceSlug();
      if (placeSlug) {
        const parsed = parsePlaceSlug(placeSlug);
        if (parsed.name && parsed.name.trim().length > 0) {
          this.seoService.setPlacesSeo(parsed.name.trim());
          return;
        }
      }

      this.seoService.setPlacesSeo('Öffentliche Toiletten');
    });
  }

  private isDragging = false;
  private startY = 0;
  private startHeightPercent = 60;
  private containerHeight = 0;

  // Modal Signals
  readonly activeDetailToilet = signal<Toilet | null>(null);
  readonly activeUpdateToilet = signal<Toilet | null>(null);
  readonly activeFeedbackToilet = signal<Toilet | null>(null);
  readonly activePhotoToilet = signal<Toilet | null>(null);
  readonly activeLightboxPhoto = signal<{ photo: ToiletPhoto; toiletId?: number; title?: string } | null>(null);

  ngOnInit(): void {
    // 1. Handle route path params (:placeSlug, :toiletSlug)
    this.route.params.subscribe((params) => {
      const placeSlug = params['placeSlug'] as string | undefined;
      const toiletSlug = params['toiletSlug'] as string | undefined;

      if (placeSlug) {
        this.currentPlaceSlug.set(placeSlug);
        this.handlePlaceSlug(placeSlug);
      }

      if (toiletSlug) {
        const toiletId = parseToiletSlug(toiletSlug);
        if (toiletId) {
          this.loadAndOpenToiletDetail(toiletId);
        }
      }
    });

    // 2. Handle legacy / query params
    this.route.queryParams.subscribe((params) => {
      if (params['lat'] && params['lon']) {
        const lat = parseFloat(params['lat']);
        const lon = parseFloat(params['lon']);
        const name = params['name'] || undefined;
        if (!isNaN(lat) && !isNaN(lon)) {
          this.toiletState.setSearchLocation({ lat, lon, name });
          this.toiletState.loadToiletsNearby(lat, lon, 10, name);
        }
      } else if (params['q']) {
        const query = (params['q'] as string).trim();
        if (query) {
          this.placesService.searchAndResolveFirst(query)
            .then((result) => {
              this.toiletState.setSearchLocation({ lat: result.lat, lon: result.lon, name: result.name });
              this.toiletState.loadToiletsNearby(result.lat, result.lon, 10, result.name);
            })
            .catch(() => {
              this.toiletState.reloadCurrentView();
            });
        }
      }

      if (params['toilet']) {
        const id = parseInt(params['toilet'], 10);
        if (!isNaN(id)) {
          this.loadAndOpenToiletDetail(id);
        }
      }
    });
  }

  private handlePlaceSlug(placeSlug: string): void {
    const parsed = parsePlaceSlug(placeSlug);

    if (parsed.type === 'nearby') {
      this.locationService.getCurrentPosition()
        .then((coords) => {
          this.toiletState.setSearchLocation({ lat: coords.lat, lon: coords.lon, name: parsed.name });
          this.toiletState.loadToiletsNearby(coords.lat, coords.lon, 10, parsed.name);
        })
        .catch((err) => {
          console.warn('Geolocation error for nearby route:', err);
          this.toiletState.reloadCurrentView();
        });
      return;
    }

    if (parsed.type === 'place_id' && parsed.placeId) {
      this.placesService.getPlaceDetailsByPlaceId(parsed.placeId, parsed.rawName)
        .then((coords) => {
          const resolvedName = coords.name || parsed.name;
          this.toiletState.setSearchLocation({ lat: coords.lat, lon: coords.lon, name: resolvedName });
          this.toiletState.loadToiletsNearby(coords.lat, coords.lon, 10, resolvedName);
          this.saveRecentSearch(resolvedName, parsed.placeId);
        })
        .catch((err) => {
          console.error('Failed to resolve placeId for slug:', placeSlug, err);
          this.placesService.searchAndResolveFirst(parsed.name)
            .then((coords) => {
              const resolvedName = coords.name || parsed.name;
              this.toiletState.setSearchLocation({ lat: coords.lat, lon: coords.lon, name: resolvedName });
              this.toiletState.loadToiletsNearby(coords.lat, coords.lon, 10, resolvedName);
              if (coords.placeId) {
                this.currentPlaceSlug.set(createPlaceSlug(resolvedName, coords.placeId));
                this.saveRecentSearch(resolvedName, coords.placeId);
              }
            })
            .catch(() => this.toiletState.reloadCurrentView());
        });
      return;
    }

    if (parsed.type === 'query') {
      this.placesService.searchAndResolveFirst(parsed.name)
        .then((coords) => {
          const resolvedName = coords.name || parsed.name;
          this.toiletState.setSearchLocation({ lat: coords.lat, lon: coords.lon, name: resolvedName });
          this.toiletState.loadToiletsNearby(coords.lat, coords.lon, 10, resolvedName);
          if (coords.placeId) {
            this.currentPlaceSlug.set(createPlaceSlug(resolvedName, coords.placeId));
            this.saveRecentSearch(resolvedName, coords.placeId);
          } else {
            this.saveRecentSearch(resolvedName);
          }
        })
        .catch((err) => {
          console.error('Failed to resolve place query for slug:', placeSlug, err);
          this.toiletState.reloadCurrentView();
        });
      return;
    }
  }

  private saveRecentSearch(name: string, placeId?: string): void {
    try {
      const slug = createPlaceSlug(name, placeId);
      const newItem = { name, placeId, slug };
      const data = localStorage.getItem('wc_recent_searches');
      const existing = data ? JSON.parse(data) : [];
      const current = Array.isArray(existing) ? existing.map((i: any) => typeof i === 'string' ? { name: i, slug: createPlaceSlug(i) } : i) : [];
      const filtered = current.filter(
        (s: any) => s.slug?.toLowerCase() !== slug.toLowerCase() && s.name?.toLowerCase() !== name.toLowerCase()
      );
      const updated = [newItem, ...filtered].slice(0, 5);
      localStorage.setItem('wc_recent_searches', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }

  private loadAndOpenToiletDetail(id: number): void {
    const existing = this.toilets().find((t) => t.id === id);
    if (existing) {
      this.activeDetailToilet.set(existing);
      this.toiletState.setSelectedToilet(existing);
      return;
    }

    this.api.fetchToiletById(id).subscribe({
      next: (toilet) => {
        if (toilet) {
          this.toiletState.addToiletToState(toilet);
          this.activeDetailToilet.set(toilet);
          this.toiletState.setSelectedToilet(toilet);
        }
      },
      error: (err) => {
        console.warn('Could not fetch toilet details for id:', id, err);
      }
    });
  }

  onBoundsChange(bounds: { south: number; west: number; north: number; east: number }): void {
    this.toiletState.loadToiletsInBounds(bounds.south, bounds.west, bounds.north, bounds.east);
  }

  onSelectToilet(toilet: Toilet | null): void {
    this.toiletState.setSelectedToilet(toilet);
  }

  onOpenDetails(toilet: Toilet): void {
    this.activeDetailToilet.set(toilet);
    this.toiletState.setSelectedToilet(toilet);
    const placeSlug = this.currentPlaceSlug() || 'Aktueller-Standort---NEARBY';
    const toiletSlug = createToiletSlug(toilet.name, toilet.id);
    this.location.go(`/Toilets/${placeSlug}/${toiletSlug}`);
  }

  onCloseDetails(): void {
    this.activeDetailToilet.set(null);
    const placeSlug = this.currentPlaceSlug() || 'Aktueller-Standort---NEARBY';
    this.location.go(`/Toilets/${placeSlug}`);
  }

  onStartNavigation(toilet: Toilet): void {
    this.toiletState.setNavigationTarget(toilet);
    this.router.navigate(['/Urgent'], { queryParams: { toilet: toilet.id } });
  }

  onOpenSuggestEdit(toilet: Toilet): void {
    this.activeUpdateToilet.set(toilet);
  }

  @ViewChild('directFileInput') directFileInput?: ElementRef<HTMLInputElement>;
  private activePhotoUploadToilet: Toilet | null = null;
  readonly isDirectUploadingPhoto = signal<boolean>(false);

  onOpenReportProblem(toilet: Toilet): void {
    this.activeFeedbackToilet.set(toilet);
  }

  onOpenAddPhoto(toilet: Toilet): void {
    let isConfirmed = false;
    try {
      isConfirmed = localStorage.getItem('wc_photo_legal_confirmed') === 'true';
    } catch {
      // Ignore
    }

    if (isConfirmed) {
      this.activePhotoUploadToilet = toilet;
      this.directFileInput?.nativeElement?.click();
    } else {
      this.activePhotoToilet.set(toilet);
    }
  }

  async onDirectPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0 || !this.activePhotoUploadToilet) return;

    const file = input.files[0];
    const toilet = this.activePhotoUploadToilet;
    this.isDirectUploadingPhoto.set(true);

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

    this.api.uploadPhoto(file, toilet.id, exifDataString, fixedGeo).subscribe({
      next: () => {
        this.isDirectUploadingPhoto.set(false);
        this.activePhotoUploadToilet = null;
        input.value = '';
        this.toiletState.reloadCurrentView();
        if (this.activeDetailToilet()?.id === toilet.id) {
          this.loadAndOpenToiletDetail(toilet.id);
        }
      },
      error: (err) => {
        this.isDirectUploadingPhoto.set(false);
        this.activePhotoUploadToilet = null;
        input.value = '';
        console.error('Photo upload failed:', err);
      }
    });
  }

  onMapCreate(coords: Coordinates): void {
    this.toiletState.openCreateWizard(coords);
  }

  openAddModal(): void {
    this.toiletState.openCreateWizard();
  }

  onToiletCreated(toilet: Toilet): void {
    this.toiletState.closeCreateWizard();
    this.toiletState.addToiletToState(toilet);
    this.toiletState.reloadCurrentView();
  }

  onToiletUpdated(toilet: Toilet): void {
    this.activeUpdateToilet.set(null);
    this.toiletState.updateToiletInState(toilet);
    if (this.activeDetailToilet()?.id === toilet.id) {
      this.activeDetailToilet.set(toilet);
    }
    this.toiletState.reloadCurrentView();
  }

  onPhotoUploaded(data: { url: string; thumbUrl?: string; filename: string }): void {
    const toiletId = this.activePhotoToilet()?.id;
    this.activePhotoToilet.set(null);
    if (toiletId) {
      this.toiletState.reloadCurrentView();
      if (this.activeDetailToilet()?.id === toiletId) {
        this.loadAndOpenToiletDetail(toiletId);
      }
    }
  }

  onOpenPhoto(photo: ToiletPhoto, toilet: Toilet): void {
    this.activeLightboxPhoto.set({ photo, toiletId: toilet.id, title: toilet.name });
  }

  onLightboxPhotoDeleted(event: { toiletId?: number; photo: ToiletPhoto }): void {
    this.activeLightboxPhoto.set(null);
    this.toiletState.reloadCurrentView();
    if (event.toiletId && this.activeDetailToilet()?.id === event.toiletId) {
      this.loadAndOpenToiletDetail(event.toiletId);
    }
  }

  startDragging(event: MouseEvent | TouchEvent): void {
    this.isDragging = true;
    this.startY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    this.startHeightPercent = this.listHeightPercent();

    const container = document.getElementById('results-portrait-container');
    this.containerHeight = container ? container.getBoundingClientRect().height : window.innerHeight;

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!this.isDragging) return;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaY = clientY - this.startY;
      const deltaPercent = (deltaY / (this.containerHeight || 1)) * 100;
      const newPercent = Math.min(85, Math.max(15, this.startHeightPercent + deltaPercent));
      this.listHeightPercent.set(newPercent);
      window.dispatchEvent(new Event('resize'));
    };

    const onEnd = () => {
      this.isDragging = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.dispatchEvent(new Event('resize'));
    };

    window.addEventListener('mousemove', onMove, { passive: false });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }
}
