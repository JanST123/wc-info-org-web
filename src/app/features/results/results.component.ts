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
  template: `
    <div class="relative min-h-screen flex flex-col bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-100 overflow-hidden">
      <!-- Top Navigation Header -->
      <app-header class="shrink-0" />

      <!-- Main Responsive Shell -->
      <div class="flex-1 flex relative overflow-hidden">
        <!-- ============================================== -->
        <!-- Desktop / Tablet Landscape Left Pane (>= 768px) -->
        <!-- ============================================== -->
        <aside class="hidden md:flex flex-col w-[440px] lg:w-[480px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-10 shrink-0 h-[calc(100vh-57px)]">
          <!-- Search Header in Sidebar -->
          <div class="p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
            <div class="relative">
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchInput($event)"
                (focus)="isSearchFocused.set(true)"
                [placeholder]="'common.searchPlaceholder' | translate"
                class="w-full pl-9 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
              <svg class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>

              @if (searchQuery) {
                <button
                  type="button"
                  (click)="searchQuery = ''; suggestions.set([])"
                  class="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              }

              <!-- Suggestions Dropdown -->
              @if (isSearchFocused() && suggestions().length > 0) {
                <div class="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-30">
                  @for (place of suggestions(); track place.placeId) {
                    <div
                      (click)="selectPlace(place)"
                      class="px-3 py-2 hover:bg-purple-50 dark:hover:bg-gray-700 cursor-pointer text-xs flex flex-col border-b border-gray-50 dark:border-gray-700 last:border-0"
                    >
                      <span class="font-bold text-gray-900 dark:text-gray-100 truncate">{{ place.primaryText }}</span>
                      <span class="text-[11px] text-gray-500 dark:text-gray-400 truncate">{{ place.secondaryText }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Filter Banner Component -->
          <app-filter-banner />

          <!-- Results Summary Header -->
          <div class="px-4 py-2 bg-gray-50 dark:bg-gray-900/80 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
            <span>{{ toilets().length }} Toiletten in diesem Bereich</span>
            @if (isLoading()) {
              <span class="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold">
                <svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 2v4M12 18v4"/>
                </svg>
                {{ 'common.loading' | translate }}
              </span>
            }
          </div>

          <!-- Scrollable Restroom Cards List -->
          <div class="flex-1 overflow-y-auto p-3 space-y-2.5">
            @for (toilet of toilets(); track toilet.id) {
              <app-toilet-card
                [toilet]="toilet"
                [isSelected]="selectedToilet()?.id === toilet.id"
                (onSelect)="onSelectToilet($event)"
                (onOpenDetails)="onOpenDetails($event)"
                (onNavigate)="onStartNavigation($event)"
              />
            } @empty {
              @if (!isLoading()) {
                <div class="p-8 text-center text-gray-400 dark:text-gray-500 space-y-2">
                  <svg class="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                  <p class="text-xs">{{ 'common.noResults' | translate }}</p>
                </div>
              }
            }
          </div>
        </aside>

        <!-- ============================================== -->
        <!-- Right Interactive Map View (Full screen / Split) -->
        <!-- ============================================== -->
        <main class="flex-1 relative h-[calc(100vh-57px)]">
          <app-map
            [toilets]="toilets()"
            [selectedToilet]="selectedToilet()"
            [center]="mapCenter()"
            [userLocation]="userLocation()"
            (boundsChange)="onBoundsChange($event)"
            (toiletSelect)="onSelectToilet($event)"
            (openDetails)="onOpenDetails($event)"
            (mapCreate)="onMapCreate($event)"
          />

          <!-- Mobile Floating Search Bar on Top (< 768px) -->
          <div class="md:hidden absolute top-3 left-3 right-3 z-20">
            <div class="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div class="p-2 flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-400 ml-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  [(ngModel)]="searchQuery"
                  (ngModelChange)="onSearchInput($event)"
                  [placeholder]="'common.searchPlaceholder' | translate"
                  class="w-full py-1.5 text-xs bg-transparent focus:outline-hidden text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
              <app-filter-banner />
            </div>
          </div>

          <!-- ============================================== -->
          <!-- Mobile Bottom Sheet Drawer (< 768px) -->
          <!-- ============================================== -->
          <div
            class="md:hidden absolute bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-gray-800 transition-all duration-300 flex flex-col"
            [ngClass]="mobileDrawerClasses()"
          >
            <!-- Drag Handle & Drawer Header -->
            <div
              (click)="toggleMobileDrawer()"
              class="p-2.5 flex flex-col items-center justify-center cursor-pointer select-none bg-gray-50 dark:bg-gray-800 rounded-t-2xl border-b border-gray-100 dark:border-gray-750"
            >
              <div class="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mb-1.5"></div>
              <div class="flex items-center justify-between w-full px-3 text-xs font-bold text-gray-600 dark:text-gray-300">
                <span>{{ toilets().length }} Toiletten</span>
                <span class="text-[10px] text-purple-600 dark:text-purple-400 font-semibold uppercase">
                  {{ drawerState() === 'peek' ? 'Mehr anzeigen ↑' : 'Einklappen ↓' }}
                </span>
              </div>
            </div>

            <!-- Drawer Scrollable Content -->
            <div class="flex-1 overflow-y-auto p-3 space-y-2.5">
              @if (selectedToilet() && drawerState() === 'peek') {
                <app-toilet-card
                  [toilet]="selectedToilet()!"
                  [isSelected]="true"
                  (onSelect)="onSelectToilet($event)"
                  (onOpenDetails)="onOpenDetails($event)"
                  (onNavigate)="onStartNavigation($event)"
                />
              } @else {
                @for (toilet of toilets(); track toilet.id) {
                  <app-toilet-card
                    [toilet]="toilet"
                    [isSelected]="selectedToilet()?.id === toilet.id"
                    (onSelect)="onSelectToilet($event)"
                    (onOpenDetails)="onOpenDetails($event)"
                    (onNavigate)="onStartNavigation($event)"
                  />
                }
              }
            </div>
          </div>
        </main>
      </div>

      <!-- ============================================== -->
      <!-- Modals & Overlays -->
      <!-- ============================================== -->

      <!-- 1. Detail View Modal -->
      @if (activeDetailToilet()) {
        <app-detail
          [toilet]="activeDetailToilet()!"
          (onClose)="activeDetailToilet.set(null)"
          (onStartNavigation)="onStartNavigation($event)"
          (onSuggestEdit)="onOpenSuggestEdit($event)"
          (onReportProblem)="onOpenReportProblem($event)"
          (onAddPhoto)="onOpenAddPhoto($event)"
        />
      }

      <!-- 2. Create Restroom Wizard -->
      @if (toiletState.isCreateWizardOpen()) {
        <app-create-wizard
          [initialCoords]="toiletState.createInitialCoords()"
          (onCancel)="toiletState.closeCreateWizard()"
          (onCreated)="onToiletCreated($event)"
        />
      }

      <!-- 3. Suggest Edit Modal -->
      @if (activeUpdateToilet()) {
        <app-update-modal
          [toilet]="activeUpdateToilet()!"
          (onCancel)="activeUpdateToilet.set(null)"
          (onUpdated)="onToiletUpdated($event)"
        />
      }

      <!-- 4. Report Problem Modal -->
      @if (activeFeedbackToilet()) {
        <app-feedback-modal
          [toilet]="activeFeedbackToilet()!"
          (onCancel)="activeFeedbackToilet.set(null)"
        />
      }

      <!-- 5. Photo Upload Modal -->
      @if (activePhotoToilet()) {
        <app-photo-legal-modal
          [toiletId]="activePhotoToilet()!.id"
          (onCancel)="activePhotoToilet.set(null)"
          (onUploaded)="onPhotoUploaded($event)"
        />
      }
    </div>
  `
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
