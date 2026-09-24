import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TranslationService } from '../../core/services/translation.service';
import { PlacesService, PlaceSuggestion } from '../../core/services/places.service';
import { LocationService } from '../../core/services/location.service';
import { ToiletStateService } from '../../core/services/toilet-state.service';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent, TranslatePipe],
  template: `
    <div class="relative min-h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      <!-- Background Image with Overlay -->
      <div class="absolute inset-0 z-0">
        <img
          src="/assets/lavendel.webp"
          alt="Lavender background"
          class="w-full h-full object-cover object-center scale-105 transform animate-pulse-slow"
        />
        <!--<div class="absolute inset-0 bg-gradient-to-b from-purple-950/40 via-gray-900/45 to-gray-950/60"></div>-->
      </div>

      <!-- App Header -->
      <app-header class="relative z-20" />

      <!-- Main Hero Content -->
      <main class="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-4xl mx-auto w-full text-center">
        <!-- Logo & Headline -->
        <div class="mb-8 flex flex-col items-center">
          <img
            src="/assets/logo.png"
            alt="WC-Info Logo"
            class="w-40 h-40 md:w-24 md:h-24 object-contain mb-4 drop-shadow-2xl animate-bounce-subtle"
          />
         
        </div>

        <!-- Search Card -->
        <div class="w-full max-w-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-4 md:p-6 rounded-2xl shadow-2xl relative text-left">
          <div class="mb-8 flex flex-col items-center">
            
            <p class="mt-3 text-sm md:text-lg text-purple-200/90 max-w-xl font-medium">
              {{ 'app.subtitle' | translate }}
            </p>
          </div>

          <!-- Autocomplete Input Box -->
          <div class="relative">
            <div class="relative flex items-center">


              <input
                type="text"
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchInput($event)"
                (focus)="isFocused.set(true)"
                [placeholder]="'common.searchPlaceholder' | translate"
                class="w-full pl-8 pr-4 py-3.5 bg-white text-gray-900 placeholder-gray-400 rounded-xl text-sm md:text-base font-medium shadow-inner focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />

              @if (searchQuery) {
                <button
                  type="button"
                  (click)="clearSearch()"
                  class="absolute right-3 text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              }
            </div>

            <!-- Autocomplete Suggestions Dropdown -->
            @if (isFocused() && suggestions().length > 0) {
              <div class="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-30 text-gray-800">
                @for (place of suggestions(); track place.placeId) {
                  <div
                    (click)="selectPlace(place)"
                    class="px-4 py-3 hover:bg-purple-50 cursor-pointer flex items-center gap-3 border-b border-gray-50 last:border-0 transition-colors"
                  >
                    <svg class="w-4 h-4 text-purple-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <div class="flex flex-col min-w-0">
                      <span class="text-sm font-semibold text-gray-900 truncate">{{ place.primaryText }}</span>
                      <span class="text-xs text-gray-500 truncate">{{ place.secondaryText }}</span>
                    </div>
                  </div>
                }
              </div>
            }

            <!-- Recent Searches Dropdown if input is empty and focused -->
            @if (isFocused() && !searchQuery && recentSearches().length > 0) {
              <div class="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 p-3 z-30 text-gray-800">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                  {{ 'common.recentSearches' | translate }}
                </div>
                <div class="flex flex-wrap gap-1.5">
                  @for (item of recentSearches(); track item) {
                    <button
                      type="button"
                      (click)="onSelectRecent(item)"
                      class="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-purple-100 text-xs font-medium text-gray-700 hover:text-purple-800 transition-colors"
                    >
                      {{ item }}
                    </button>
                  }
                </div>
              </div>
            }
          </div>

          <!-- CTAs Grid -->
          <div class="mt-4 grid grid-cols-2 gap-3">
            <!-- Search / Open Map -->
            <button
              type="button"
              (click)="onSearchSubmit()"
              class="w-full py-3 px-4 rounded-xl bg-gray-200/80 hover:bg-white/30 text-purple-500 font-semibold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <span>{{ 'nav.search' | translate }}</span>
            </button>

            <!-- In der Nähe (Nearby GPS) -->
            <button
              type="button"
              (click)="onNearbyClick()"
              class="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white border border-white/30 font-semibold text-sm transition-all active:scale-98 flex items-center justify-center gap-2 backdrop-blur-md"
            >
              <span>{{ 'nav.nearby' | translate }}</span>
            </button>
          </div>
        </div>

        <!-- Emergency Urgent Navigation Banner -->
        <div class="mt-8">
          <button
            type="button"
            (click)="router.navigate(['/urgent'])"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-sm shadow-xl transition-all hover:scale-105 active:scale-95 border border-rose-400/40 backdrop-blur-md"
          >
            <svg class="w-5 h-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            <span>{{ 'urgent.title' | translate }}</span>
          </button>
        </div>
      </main>

      <!-- Footer -->
      <footer class="relative z-10 py-4 text-center text-xs text-purple-300/70 border-t border-white/10">
        <p>{{ funnyFooter() }}</p>
      </footer>
    </div>
  `
})
export class HomeComponent implements OnInit {
  private readonly placesService = inject(PlacesService);
  private readonly locationService = inject(LocationService);
  private readonly toiletState = inject(ToiletStateService);
  readonly router = inject(Router);

  searchQuery = '';
  readonly isFocused = signal<boolean>(false);
  readonly suggestions = signal<PlaceSuggestion[]>([]);
  readonly recentSearches = signal<string[]>([]);

  private funnyFooters = [
    "Made of stardust 💫",
    "Powered by coffee ☕",
    "Made in Germany 🥔",
    "Made with love ❤️",
    "Toilets are our passion 🚽",
  ];
  funnyFooter = signal<string>(this.funnyFooters[Math.floor(Math.random() * this.funnyFooters.length)]);

  private readonly searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.loadRecentSearches();

    window.setInterval(() => {
      this.funnyFooter.set(this.funnyFooters[Math.floor(Math.random() * this.funnyFooters.length)]);
    }, 60000);

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe((query) => {
      if (query.trim().length >= 2) {
        this.placesService.searchPlaces(query).subscribe((results) => {
          this.suggestions.set(results);
        });
      } else {
        this.suggestions.set([]);
      }
    });
  }

  onSearchInput(query: string): void {
    this.searchSubject.next(query);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.suggestions.set([]);
  }

  selectPlace(place: PlaceSuggestion): void {
    this.saveRecentSearch(place.primaryText);
    this.isFocused.set(false);

    if (place.lat !== undefined && place.lon !== undefined) {
      this.toiletState.loadToiletsNearby(place.lat, place.lon);
      this.router.navigate(['/results'], {
        queryParams: { lat: place.lat, lon: place.lon, name: place.primaryText }
      });
    } else {
      this.placesService.getPlaceDetails(place)
        .then((coords) => {
          this.toiletState.loadToiletsNearby(coords.lat, coords.lon);
          this.router.navigate(['/results'], {
            queryParams: { lat: coords.lat, lon: coords.lon, name: place.primaryText }
          });
        })
        .catch(() => {
          this.router.navigate(['/results'], { queryParams: { q: place.primaryText } });
        });
    }
  }

  onSearchSubmit(): void {
    if (this.searchQuery.trim()) {
      this.saveRecentSearch(this.searchQuery.trim());
      this.router.navigate(['/results'], { queryParams: { q: this.searchQuery.trim() } });
    } else {
      this.router.navigate(['/results']);
    }
  }

  onNearbyClick(): void {
    this.locationService.getCurrentPosition()
      .then((coords) => {
        this.toiletState.loadToiletsNearby(coords.lat, coords.lon);
        this.router.navigate(['/results'], {
          queryParams: { lat: coords.lat, lon: coords.lon }
        });
      })
      .catch((err) => {
        alert(err.message || 'Could not determine location');
      });
  }

  onSelectRecent(item: string): void {
    this.searchQuery = item;
    this.onSearchSubmit();
  }

  private loadRecentSearches(): void {
    try {
      const data = localStorage.getItem('wc_recent_searches');
      if (data) {
        this.recentSearches.set(JSON.parse(data).slice(0, 5));
      }
    } catch {
      // Ignore
    }
  }

  private saveRecentSearch(term: string): void {
    try {
      const current = this.recentSearches().filter((s) => s.toLowerCase() !== term.toLowerCase());
      const updated = [term, ...current].slice(0, 5);
      this.recentSearches.set(updated);
      localStorage.setItem('wc_recent_searches', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }
}
