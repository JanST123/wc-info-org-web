import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { Coordinates } from '../../core/services/location.service';
import { PlacesService } from '../../core/services/places.service';
import { Toilet } from '../../core/models/toilet.model';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [
    CommonModule,
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
  private readonly placesService = inject(PlacesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly toilets = this.toiletState.enrichedToilets;
  readonly selectedToilet = this.toiletState.selectedToilet;
  readonly mapCenter = this.toiletState.mapCenter;
  readonly userLocation = this.toiletState.userLocation;
  readonly isLoading = this.toiletState.isLoading;

  readonly listHeightPercent = signal<number>(60);

  private isDragging = false;
  private startY = 0;
  private startHeightPercent = 60;
  private containerHeight = 0;

  // Modal Signals
  readonly activeDetailToilet = signal<Toilet | null>(null);
  readonly activeUpdateToilet = signal<Toilet | null>(null);
  readonly activeFeedbackToilet = signal<Toilet | null>(null);
  readonly activePhotoToilet = signal<Toilet | null>(null);

  ngOnInit(): void {
    // Handle query params
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
          this.placesService.searchPlaces(query).subscribe((suggestions) => {
            if (suggestions.length > 0) {
              const first = suggestions[0];
              if (first.lat !== undefined && first.lon !== undefined) {
                this.toiletState.setSearchLocation({ lat: first.lat, lon: first.lon, name: first.primaryText });
                this.toiletState.loadToiletsNearby(first.lat, first.lon, 10, first.primaryText);
              } else {
                this.placesService.getPlaceDetails(first).then((coords) => {
                  this.toiletState.setSearchLocation({ lat: coords.lat, lon: coords.lon, name: first.primaryText });
                  this.toiletState.loadToiletsNearby(coords.lat, coords.lon, 10, first.primaryText);
                }).catch(() => {
                  this.toiletState.reloadCurrentView();
                });
              }
            }
          });
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

  openAddModal(): void {
    this.toiletState.openCreateWizard();
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
