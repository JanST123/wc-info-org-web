import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { ThemeService } from '../../core/services/theme.service';
import { PlacesService, PlaceSuggestion } from '../../core/services/places.service';
import { ToiletStateService } from '../../core/services/toilet-state.service';
import { SeoService } from '../../core/services/seo.service';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

import { createPlaceSlug } from '../../core/utils/slug.utils';
import { MatomoService } from '../../core/services/matomo.service';

export interface RecentSearchItem {
  name: string;
  placeId?: string;
  slug: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  styleUrl: './home.component.css',
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  private readonly seoService = inject(SeoService);
  readonly themeService = inject(ThemeService);
  private readonly placesService = inject(PlacesService);
  private readonly toiletState = inject(ToiletStateService);
  readonly router = inject(Router);
  private readonly matomoService = inject(MatomoService);

  searchQuery = '';
  readonly isFocused = signal<boolean>(false);
  readonly suggestions = signal<PlaceSuggestion[]>([]);
  readonly recentSearches = signal<RecentSearchItem[]>([]);

  trackAppClick(platform: 'ios' | 'android'): void {
    const targetUrl = platform === 'ios'
      ? 'https://apps.apple.com/de/app/wc-info/id6471011164'
      : 'https://play.google.com/store/apps/details?id=de.wcinfo.app&hl=de';
    this.matomoService.trackEvent('App Download', `Click ${platform === 'ios' ? 'iOS' : 'Android'} Badge`, targetUrl);
  }

 

  private readonly searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.seoService.setHomeSeo();
    this.loadRecentSearches();



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
    this.saveRecentSearch(place.primaryText, place.placeId);
    this.isFocused.set(false);

    if (place.lat !== undefined && place.lon !== undefined) {
      this.toiletState.setSearchLocation({ lat: place.lat, lon: place.lon, name: place.primaryText });
      this.toiletState.loadToiletsNearby(place.lat, place.lon, 10, place.primaryText);
    }
    const slug = createPlaceSlug(place.primaryText, place.placeId);
    this.router.navigate(['/Toilets', slug]);
  }

  onSearchSubmit(): void {
    if (this.searchQuery.trim()) {
      const term = this.searchQuery.trim();
      this.saveRecentSearch(term);
      const slug = createPlaceSlug(term);
      this.router.navigate(['/Toilets', slug]);
    } else {
      this.router.navigate(['/Toilets']);
    }
  }

  onNearbyClick(): void {
    this.router.navigate(['/Toilets', 'Aktueller-Standort---NEARBY']);
  }

  openUrgent(): void {
    this.matomoService.trackUrgentUsed();
    this.toiletState.setNavigationTarget(null);
    this.router.navigate(['/Urgent'], { queryParams: {} });
  }

  onSelectRecent(item: RecentSearchItem): void {
    this.searchQuery = item.name;
    this.router.navigate(['/Toilets', item.slug]);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-container')) {
      this.isFocused.set(false);
    }
  }

  private loadRecentSearches(): void {
    try {
      const data = localStorage.getItem('wc_recent_searches');
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const items: RecentSearchItem[] = parsed.map((item) => {
            if (typeof item === 'string') {
              return { name: item, slug: createPlaceSlug(item) };
            }
            return {
              name: item.name || 'Standort',
              placeId: item.placeId,
              slug: item.slug || createPlaceSlug(item.name, item.placeId)
            };
          });
          this.recentSearches.set(items.slice(0, 5));
        }
      }
    } catch {
      // Ignore
    }
  }

  private saveRecentSearch(name: string, placeId?: string): void {
    try {
      const slug = createPlaceSlug(name, placeId);
      const newItem: RecentSearchItem = { name, placeId, slug };
      const current = this.recentSearches().filter(
        (s) => s.slug.toLowerCase() !== slug.toLowerCase() && s.name.toLowerCase() !== name.toLowerCase()
      );
      const updated = [newItem, ...current].slice(0, 5);
      this.recentSearches.set(updated);
      localStorage.setItem('wc_recent_searches', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }
}
