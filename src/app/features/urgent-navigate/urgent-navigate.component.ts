import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { LocationService, Coordinates } from '../../core/services/location.service';
import { CompassService } from '../../core/services/compass.service';
import { WcInfoApiService } from '../../core/services/wc-info-api.service';
import { Toilet } from '../../core/models/toilet.model';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TranslationService } from '../../core/services/translation.service';
import { OpeningTimeBadgeComponent } from '../../shared/components/opening-time-badge/opening-time-badge.component';

@Component({
  selector: 'app-urgent-navigate',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe, OpeningTimeBadgeComponent],
  template: `
    <div class="relative min-h-screen bg-gradient-to-b from-gray-950 via-purple-950 to-gray-900 text-white flex flex-col justify-between overflow-hidden">
      <!-- Top Bar -->
      <div class="p-4 z-20 flex items-center justify-between bg-black/30 backdrop-blur-md border-b border-white/10">
        <button
          type="button"
          (click)="goBack()"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold backdrop-blur-md transition-colors"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span>{{ 'common.back' | translate }}</span>
        </button>

        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
          <span class="text-sm font-black tracking-wider uppercase text-rose-400">
            {{ 'urgent.title' | translate }}
          </span>
        </div>

        <div class="w-16"></div>
      </div>

      <!-- Main Compass Area -->
      <div class="flex-1 flex flex-col items-center justify-center p-4 text-center z-10">
        @if (isLoading()) {
          <!-- Loading State -->
          <div class="space-y-4 max-w-xs">
            <div class="w-16 h-16 rounded-full border-4 border-purple-500 border-t-transparent animate-spin mx-auto"></div>
            <p class="text-sm text-purple-200 font-medium">{{ statusMessage() }}</p>
          </div>
        } @else if (targetToilet()) {
          <!-- Target Restroom Info Card -->
          <div class="w-full max-w-sm bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl mb-6 text-left">
            @if (isFallback()) {
              <div class="mb-2 p-2 rounded-lg bg-orange-500/30 border border-orange-400/40 text-[11px] text-orange-200 flex items-center gap-1.5">
                <svg class="w-4 h-4 text-orange-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                </svg>
                <span>{{ 'urgent.fallbackWarning' | translate }}</span>
              </div>
            }

            <div class="flex items-start justify-between gap-2">
              <div>
                <h3 class="text-lg font-extrabold text-white line-clamp-1">
                  {{ targetToilet()!.name || ('app.title' | translate) }}
                </h3>
                @if (targetToilet()!.address) {
                  <p class="text-xs text-purple-200 truncate">{{ targetToilet()!.address }}</p>
                }
              </div>
              <app-opening-time-badge [toilet]="targetToilet()!" />
            </div>
          </div>

          <!-- Compass Dial Graphic -->
          <div class="relative w-64 h-64 sm:w-72 sm:h-72 my-2 flex items-center justify-center">
            <!-- Compass Ring -->
            <div
              class="absolute inset-0 rounded-full border-4 border-white/20 shadow-2xl bg-gray-900/60 backdrop-blur-md transition-transform duration-300"
              [style.transform]="'rotate(' + -(deviceHeading() || 0) + 'deg)'"
            >
              <!-- Cardinal Marks -->
              <span class="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-black text-rose-400">N</span>
              <span class="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-400">S</span>
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">O</span>
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">W</span>
            </div>

            <!-- Target Arrow Needle -->
            <div
              class="absolute inset-0 flex items-center justify-center transition-transform duration-300 pointer-events-none"
              [style.transform]="'rotate(' + relativeNeedleAngle() + 'deg)'"
            >
              <div
                class="w-8 h-28 -translate-y-12 flex flex-col items-center justify-start drop-shadow-xl"
                [class.animate-pulse]="isTargetLocked()"
              >
                <!-- Needle Triangle Head -->
                <div
                  class="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-b-[28px]"
                  [ngClass]="isTargetLocked() ? 'border-b-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]' : 'border-b-purple-500'"
                ></div>
                <!-- Needle Stem -->
                <div
                  class="w-2.5 h-16 rounded-b-full"
                  [ngClass]="isTargetLocked() ? 'bg-gradient-to-b from-emerald-400 to-emerald-600' : 'bg-gradient-to-b from-purple-500 to-indigo-600'"
                ></div>
              </div>
            </div>

            <!-- Center Distance HUD -->
            <div class="relative z-10 w-28 h-28 rounded-full bg-gray-950/90 border-2 border-white/30 flex flex-col items-center justify-center shadow-inner">
              @if (isArrived()) {
                <span class="text-xs font-black text-emerald-400">{{ 'urgent.arrived' | translate }}</span>
              } @else {
                <span class="text-2xl font-black text-white tracking-tight">{{ formattedDistance() }}</span>
                <span class="text-[10px] text-purple-300 font-bold uppercase tracking-wider">
                  {{ directionText() | translate }}
                </span>
              }
            </div>
          </div>

          <!-- Compass Calibration & Permission Button if needed -->
          @if (!hasCompassPermission()) {
            <div class="mt-4">
              <button
                type="button"
                (click)="enableCompass()"
                class="px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-xs font-semibold shadow-md transition-all active:scale-95"
              >
                🧭 Kompass aktivieren
              </button>
            </div>
          }
        } @else {
          <!-- Error / No Toilets Found -->
          <div class="space-y-4 max-w-xs">
            <div class="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <p class="text-sm text-gray-300">{{ 'common.noResults' | translate }}</p>
            <button
              type="button"
              (click)="startEmergencySearch()"
              class="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-md"
            >
              {{ 'common.retry' | translate }}
            </button>
          </div>
        }
      </div>

      <!-- Bottom External Navigation Bar -->
      @if (targetToilet()) {
        <div class="p-4 bg-black/40 backdrop-blur-md border-t border-white/10 z-20 flex items-center justify-center gap-3">
          <button
            type="button"
            (click)="openInGoogleMaps()"
            class="flex-1 max-w-xs py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs md:text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
            <span>Google Maps</span>
          </button>

          <button
            type="button"
            (click)="openInAppleMaps()"
            class="flex-1 max-w-xs py-3 px-4 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs md:text-sm border border-white/20 backdrop-blur-md transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
            </svg>
            <span>Apple Maps</span>
          </button>
        </div>
      }
    </div>
  `
})
export class UrgentNavigateComponent implements OnInit, OnDestroy {
  private readonly locationService = inject(LocationService);
  private readonly compassService = inject(CompassService);
  private readonly api = inject(WcInfoApiService);
  private readonly translationService = inject(TranslationService);
  private readonly router = inject(Router);

  readonly isLoading = signal<boolean>(true);
  readonly statusMessage = signal<string>('');
  readonly targetToilet = signal<Toilet | null>(null);
  readonly isFallback = signal<boolean>(false);
  readonly userCoords = signal<Coordinates | null>(null);
  readonly deviceHeading = this.compassService.heading;
  readonly hasCompassPermission = this.compassService.permissionGranted;

  private locationWatchId: number | null = null;

  readonly distanceMeters = computed(() => {
    const user = this.userCoords();
    const target = this.targetToilet();
    if (!user || !target) return 0;
    return this.locationService.calculateDistance(user.lat, user.lon, target.lat, target.lon);
  });

  readonly formattedDistance = computed(() => {
    return this.locationService.formatDistance(this.distanceMeters());
  });

  readonly isArrived = computed(() => {
    return this.distanceMeters() <= 10;
  });

  readonly bearing = computed(() => {
    const user = this.userCoords();
    const target = this.targetToilet();
    if (!user || !target) return 0;
    return this.locationService.calculateBearing(user.lat, user.lon, target.lat, target.lon);
  });

  readonly relativeNeedleAngle = computed(() => {
    const b = this.bearing();
    const h = this.deviceHeading() || 0;
    return (b - h + 360) % 360;
  });

  readonly isTargetLocked = computed(() => {
    const angle = this.relativeNeedleAngle();
    return angle <= 15 || angle >= 345;
  });

  readonly directionText = computed(() => {
    return this.locationService.getDirectionKey(this.relativeNeedleAngle(), this.distanceMeters());
  });

  ngOnInit(): void {
    this.startEmergencySearch();
    this.compassService.startListening();
  }

  ngOnDestroy(): void {
    if (this.locationWatchId !== null) {
      this.locationService.clearWatch(this.locationWatchId);
    }
    this.compassService.stopListening();
  }

  goBack(): void {
    this.router.navigate(['/results']);
  }

  enableCompass(): void {
    this.compassService.requestPermissionAndStart();
  }

  startEmergencySearch(): void {
    this.isLoading.set(true);
    this.statusMessage.set(this.translationService.t('urgent.locating'));

    this.locationService.getCurrentPosition()
      .then((coords) => {
        this.userCoords.set(coords);
        this.startWatchingPosition();
        this.searchNearestToilet(coords);
      })
      .catch(() => {
        this.isLoading.set(false);
      });
  }

  private startWatchingPosition(): void {
    this.locationWatchId = this.locationService.watchPosition((coords) => {
      this.userCoords.set(coords);
    });
  }

  private searchNearestToilet(user: Coordinates): void {
    this.statusMessage.set(this.translationService.t('urgent.searching'));

    // Step 1: Query open & public toilets
    const publicFilter = 'is_open:true,public_accessible:true';

    this.api.fetchToiletsNearby(user.lat, user.lon, 10, publicFilter).subscribe({
      next: (toilets) => {
        const sorted = toilets
          .map((t) => ({
            ...t,
            distanceMeters: this.locationService.calculateDistance(user.lat, user.lon, t.lat, t.lon)
          }))
          .sort((a, b) => a.distanceMeters - b.distanceMeters);

        const closestPublic = sorted[0];

        // Step 2: Fallback algorithm (< 500m check)
        if (!closestPublic || closestPublic.distanceMeters > 500) {
          this.statusMessage.set(this.translationService.t('urgent.checkingFallback'));

          const fallbackFilter = 'is_open:true';
          this.api.fetchToiletsNearby(user.lat, user.lon, 10, fallbackFilter).subscribe({
            next: (fallbackToilets) => {
              const sortedFallback = fallbackToilets
                .map((t) => ({
                  ...t,
                  distanceMeters: this.locationService.calculateDistance(user.lat, user.lon, t.lat, t.lon)
                }))
                .sort((a, b) => a.distanceMeters - b.distanceMeters);

              const closestFallback = sortedFallback[0];

              if (closestFallback && (!closestPublic || closestFallback.distanceMeters < closestPublic.distanceMeters)) {
                this.targetToilet.set(closestFallback);
                this.isFallback.set(true);
              } else if (closestPublic) {
                this.targetToilet.set(closestPublic);
                this.isFallback.set(false);
              }

              this.isLoading.set(false);
            },
            error: () => {
              if (closestPublic) {
                this.targetToilet.set(closestPublic);
              }
              this.isLoading.set(false);
            }
          });
        } else {
          this.targetToilet.set(closestPublic);
          this.isFallback.set(false);
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  openInGoogleMaps(): void {
    const t = this.targetToilet();
    if (!t) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lon}&travelmode=walking`;
    window.open(url, '_blank');
  }

  openInAppleMaps(): void {
    const t = this.targetToilet();
    if (!t) return;
    const url = `https://maps.apple.com/?daddr=${t.lat},${t.lon}&dirflg=w`;
    window.open(url, '_blank');
  }
}
