import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { FilterBannerComponent } from '../../shared/components/filter-banner/filter-banner.component';
import { ToiletCardComponent } from '../../shared/components/toilet-card/toilet-card.component';
import { MapComponent } from '../map/map.component';
import { DetailComponent } from '../detail/detail.component';
import { CreateWizardComponent } from '../create-wizard/create-wizard.component';
import { FeedbackModalComponent } from '../feedback/feedback-modal.component';
import { UpdateModalComponent } from '../update/update-modal.component';
import { PhotoLegalModalComponent } from '../photo-upload/photo-legal-modal.component';
import { ToiletStateService } from '../../core/services/toilet-state.service';
import { LocationService, Coordinates } from '../../core/services/location.service';
import { PlacesService, PlaceSuggestion } from '../../core/services/places.service';
import { Toilet } from '../../core/models/toilet.model';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HeaderComponent,
    FilterBannerComponent,
    ToiletCardComponent,
    MapComponent,
    DetailComponent,
    CreateWizardComponent,
    FeedbackModalComponent,
    UpdateModalComponent,
    PhotoLegalModalComponent,
    TranslatePipe
  ],
  templateUrl: './results.component.html',
})
export class ResultsComponent implements OnInit {
  readonly toiletState = inject(ToiletStateService);
  private readonly locationService = inject(LocationService);
  private readonly placesService = inject(PlacesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly toilets = this.toiletState.enrichedToilets;
  readonly selectedToilet = this.toiletState.selectedToilet;
  readonly mapCenter = this.toiletState.mapCenter;
  readonly userLocation = this.toiletState.userLocation;
  readonly isLoading = this.toiletState.isLoading;

  searchQuery = '';
  readonly isSearchFocused = signal<boolean>(false);
  readonly suggestions = signal<PlaceSuggestion[]>([]);
  readonly drawerState = signal<'peek' | 'half' | 'full'>('peek');

  // Modal Signals
  readonly activeDetailToilet = signal<Toilet | null>(null);
  readonly activeUpdateToilet = signal<Toilet | null>(null);
  readonly activeFeedbackToilet = signal<Toilet | null>(null);
  readonly activePhotoToilet = signal<Toilet | null>(null);

  private readonly searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe((query) => {
      if (query.trim().length >= 2) {
        this.placesService.searchPlaces(query).subscribe((res) => {
          this.suggestions.set(res);
        });
      } else {
        this.suggestions.set([]);
      }
    });

    // Handle query params
    this.route.queryParams.subscribe((params) => {
      if (params['lat'] && params['lon']) {
        const lat = parseFloat(params['lat']);
        const lon = parseFloat(params['lon']);
        if (!isNaN(lat) && !isNaN(lon)) {
          this.toiletState.loadToiletsNearby(lat, lon);
        }
      }
      if (params['toilet']) {
        const id = parseInt(params['toilet'], 10);
        const match = this.toilets().find((t) => t.id === id);
        if (match) {
          this.activeDetailToilet.set(match);
        }
      }
    });
  }

  onSearchInput(query: string): void {
    this.searchSubject.next(query);
  }

  selectPlace(place: PlaceSuggestion): void {
    this.isSearchFocused.set(false);
    this.searchQuery = place.primaryText;
    this.suggestions.set([]);

    if (place.lat !== undefined && place.lon !== undefined) {
      this.toiletState.loadToiletsNearby(place.lat, place.lon);
    } else {
      this.placesService.getPlaceDetails(place).then((coords) => {
        this.toiletState.loadToiletsNearby(coords.lat, coords.lon);
      });
    }
  }

  onBoundsChange(bounds: { south: number; west: number; north: number; east: number }): void {
    this.toiletState.loadToiletsInBounds(bounds.south, bounds.west, bounds.north, bounds.east);
  }

  onSelectToilet(toilet: Toilet): void {
    this.toiletState.setSelectedToilet(toilet);
  }

  onOpenDetails(toilet: Toilet): void {
    this.activeDetailToilet.set(toilet);
  }

  onStartNavigation(toilet: Toilet): void {
    this.router.navigate(['/urgent']);
  }

  onOpenSuggestEdit(toilet: Toilet): void {
    this.activeUpdateToilet.set(toilet);
  }

  onOpenReportProblem(toilet: Toilet): void {
    this.activeFeedbackToilet.set(toilet);
  }

  onOpenAddPhoto(toilet: Toilet): void {
    this.activePhotoToilet.set(toilet);
  }

  onMapCreate(coords: Coordinates): void {
    this.toiletState.openCreateWizard(coords);
  }

  onToiletCreated(toilet: Toilet): void {
    this.toiletState.closeCreateWizard();
    this.toiletState.addToiletToState(toilet);
  }

  onToiletUpdated(toilet: Toilet): void {
    this.activeUpdateToilet.set(null);
    this.toiletState.updateToiletInState(toilet);
    if (this.activeDetailToilet()?.id === toilet.id) {
      this.activeDetailToilet.set(toilet);
    }
  }

  onPhotoUploaded(data: { url: string; thumbUrl?: string; filename: string }): void {
    this.activePhotoToilet.set(null);
  }

  toggleMobileDrawer(): void {
    this.drawerState.update((current) => (current === 'peek' ? 'half' : 'peek'));
  }

  mobileDrawerClasses(): string {
    switch (this.drawerState()) {
      case 'peek':
        return 'h-36 max-h-36';
      case 'half':
        return 'h-[50vh] max-h-[50vh]';
      case 'full':
        return 'h-[85vh] max-h-[85vh]';
    }
  }
}
