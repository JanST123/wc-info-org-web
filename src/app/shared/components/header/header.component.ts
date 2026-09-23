import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ToiletStateService } from '../../../core/services/toilet-state.service';
import { LocationService } from '../../../core/services/location.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  template: `
    <header class="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 py-2.5 flex items-center justify-between shadow-xs transition-all">
      <!-- Left: Logo & Brand -->
      <a routerLink="/" class="flex items-center gap-2.5 group">
        <img src="/assets/logo.svg" alt="WC-Info Logo" class="w-8 h-8 object-contain transition-transform group-hover:scale-105" />
        <div class="flex flex-col">
          <span class="text-lg font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent">
            {{ 'app.title' | translate }}
          </span>
        </div>
      </a>

      <!-- Center / Right Actions -->
      <div class="flex items-center gap-2 md:gap-3">
        <!-- Emergency WC CTA -->
        <button
          (click)="openUrgent()"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs md:text-sm font-semibold shadow-xs transition-all active:scale-95"
          [title]="'urgent.title' | translate"
        >
          <svg class="w-4 h-4 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <span class="hidden sm:inline">{{ 'nav.urgent' | translate }}</span>
        </button>

        <!-- Nearby GPS Trigger -->
        <button
          (click)="triggerNearby()"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs md:text-sm font-medium transition-all active:scale-95"
          [title]="'nav.nearby' | translate"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
          </svg>
          <span class="hidden sm:inline">{{ 'nav.nearby' | translate }}</span>
        </button>

        <!-- Add Restroom CTA -->
        <button
          (click)="openAddModal()"
          class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs md:text-sm font-medium shadow-xs transition-all active:scale-95"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span class="hidden md:inline">{{ 'nav.addToilet' | translate }}</span>
        </button>

        <!-- Language Selector Button -->
        <div class="flex items-center border border-gray-200 rounded-full p-0.5 bg-gray-50 text-xs font-semibold">
          <button
            (click)="setLang('de')"
            [class.bg-white]="translationService.currentLang() === 'de'"
            [class.text-purple-700]="translationService.currentLang() === 'de'"
            [class.shadow-xs]="translationService.currentLang() === 'de'"
            class="px-2 py-1 rounded-full text-gray-600 transition-colors"
          >
            DE
          </button>
          <button
            (click)="setLang('en')"
            [class.bg-white]="translationService.currentLang() === 'en'"
            [class.text-purple-700]="translationService.currentLang() === 'en'"
            [class.shadow-xs]="translationService.currentLang() === 'en'"
            class="px-2 py-1 rounded-full text-gray-600 transition-colors"
          >
            EN
          </button>
        </div>
      </div>
    </header>
  `
})
export class HeaderComponent {
  readonly translationService = inject(TranslationService);
  private readonly toiletState = inject(ToiletStateService);
  private readonly locationService = inject(LocationService);
  private readonly router = inject(Router);

  setLang(lang: 'de' | 'en'): void {
    this.translationService.setLanguage(lang);
  }

  openUrgent(): void {
    this.router.navigate(['/urgent']);
  }

  triggerNearby(): void {
    this.locationService.getCurrentPosition()
      .then((coords) => {
        this.toiletState.loadToiletsNearby(coords.lat, coords.lon);
        this.router.navigate(['/results'], {
          queryParams: { lat: coords.lat, lon: coords.lon }
        });
      })
      .catch((err) => {
        alert(this.translationService.t('common.error') + ': ' + err.message);
      });
  }

  openAddModal(): void {
    this.toiletState.openCreateWizard();
  }
}
