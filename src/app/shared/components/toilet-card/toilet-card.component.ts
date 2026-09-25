import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toilet } from '../../../core/models/toilet.model';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ToiletSymbolComponent } from '../toilet-symbol/toilet-symbol.component';
import { LocationService } from '../../../core/services/location.service';
import { OpeningHoursService, DetailedStatus } from '../../../core/services/opening-hours.service';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-toilet-card',
  standalone: true,
  imports: [CommonModule, TranslatePipe, ToiletSymbolComponent],
  template: `
    <div
      (click)="selectCard()"
      class="group p-3.5 bg-white dark:bg-gray-800 rounded-2xl border transition-all duration-200 cursor-pointer text-left hover:shadow-md relative overflow-hidden"
      [ngClass]="isSelected ? 'border-purple-500 dark:border-purple-500 ring-2 ring-purple-200 dark:ring-purple-900/50 bg-purple-50/40 dark:bg-purple-950/30' : 'border-gray-200 dark:border-gray-700/80'"
    >
      <!-- Top Row: Headline & Subtitle on left, Open status & Non-public on right -->
      <div class="flex items-start justify-between gap-3">
        <!-- Left: Name & Owner / Subtitle -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <h3 class="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors leading-snug">
              {{ toilet.name || ('app.title' | translate) }}
            </h3>
            @if (toilet.isQualified) {
              <span class="inline-flex items-center text-purple-600 dark:text-purple-400 shrink-0" [title]="'attr.verified' | translate">
                <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </span>
            }
          </div>

          @if (toilet.owner && toilet.owner !== toilet.name) {
            <p class="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5 leading-tight line-clamp-2">
              {{ toilet.owner }}
            </p>
          }
        </div>

        <!-- Right: Open status (same line as headline) & Non-public warning -->
        <div class="flex flex-col items-end shrink-0 text-right">
          <span class="text-xs sm:text-sm font-bold" [ngClass]="status.colorClass">
            {{ status.title }}
          </span>
          @if (status.subtitle) {
            <span class="text-[11px] sm:text-xs" [ngClass]="status.subtitleColorClass || 'text-gray-500 dark:text-gray-400'">
              {{ status.subtitle }}
            </span>
          }

          <!-- Non-public Warning below Opening Hours -->
          @if (isNonPublic) {
            <div
              class="mt-1 inline-flex items-center gap-1 text-[11px] sm:text-xs text-amber-600 dark:text-amber-400 font-medium cursor-pointer select-none"
              (click)="$event.stopPropagation(); toggleNonPublicInfo()"
            >
              <svg class="w-3.5 h-3.5 text-amber-500 shrink-0 fill-current" viewBox="0 0 24 24">
                <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
              </svg>
              <span>{{ 'status.nonPublic' | translate }}</span>
              <button
                type="button"
                class="text-purple-600 dark:text-purple-400 hover:opacity-80 p-0.5"
                [title]="'filter.nonPublicNotice' | translate"
              >
                <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                </svg>
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Non-public explanation notice if expanded -->
      @if (showNonPublicInfo()) {
        <div class="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 leading-relaxed animate-fadeIn" (click)="$event.stopPropagation()">
          {{ 'filter.nonPublicNotice' | translate }}
        </div>
      }

      <!-- Middle: Symbol Icons -->
      <div class="mt-2.5 mb-1.5 flex items-center gap-2">
        <app-toilet-symbol [toilet]="toilet" />
      </div>

      <!-- Comment if present -->
      @if (toilet.comment) {
        <p class="text-xs text-gray-500 dark:text-gray-400 italic line-clamp-1 mb-1.5">
          "{{ toilet.comment }}"
        </p>
      }

      <!-- Photo thumbnails if available -->
      @if (toilet.photos && toilet.photos.length > 0) {
        <div class="flex items-center gap-1.5 overflow-x-auto py-1 mb-2 no-scrollbar" (click)="$event.stopPropagation()">
          @for (photo of toilet.photos.slice(0, 3); track photo.id || $index) {
            <img
              [src]="photo.urlThumb || photo.url"
              [alt]="toilet.name"
              class="w-14 h-14 object-cover rounded-lg border border-gray-100 dark:border-gray-700 shrink-0"
              loading="lazy"
            />
          }
          @if (toilet.photos.length > 3) {
            <div class="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-500 dark:text-gray-300 shrink-0">
              +{{ toilet.photos.length - 3 }}
            </div>
          }
        </div>
      }

      <!-- Bottom Row: Address on bottom left, Distance on bottom right -->
      <div class="flex items-end justify-between gap-3 mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800/80">
        <!-- Bottom Left: Address -->
        <div class="flex-1 min-w-0">
          @if (toilet.address) {
            <p class="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
              {{ toilet.address }}
            </p>
          }
        </div>

        <!-- Bottom Right: Distance -->
        @if (formattedDistance) {
          <div class="shrink-0 text-right">
            <span class="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              {{ formattedDistance }}
            </span>
          </div>
        }
      </div>

      <!-- Active Action Buttons: ONLY visible if row is active (clicked once) -->
      @if (isSelected) {
        <div class="mt-3 pt-2.5 border-t border-purple-200 dark:border-purple-800/60 flex items-center justify-between gap-3 animate-fadeIn" (click)="$event.stopPropagation()">
          <button
            type="button"
            (click)="onNavigate.emit(toilet)"
            class="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-98 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
            <span>{{ 'detail.navigate' | translate }}</span>
          </button>

          <button
            type="button"
            (click)="onOpenDetails.emit(toilet)"
            class="flex-1 inline-flex items-center justify-center gap-1 py-2 px-4 rounded-xl bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 dark:hover:bg-purple-900/60 active:scale-98 text-purple-700 dark:text-purple-300 text-xs font-bold transition-all cursor-pointer"
          >
            <span>{{ 'detail.viewDetails' | translate }}</span>
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `
})
export class ToiletCardComponent {
  private readonly locationService = inject(LocationService);
  private readonly openingHoursService = inject(OpeningHoursService);
  private readonly translationService = inject(TranslationService);

  @Input({ required: true }) toilet!: Toilet;
  @Input() isSelected = false;

  @Output() onSelect = new EventEmitter<Toilet>();
  @Output() onOpenDetails = new EventEmitter<Toilet>();
  @Output() onNavigate = new EventEmitter<Toilet>();

  readonly showNonPublicInfo = signal<boolean>(false);

  get status(): DetailedStatus {
    this.translationService.currentLang();
    return this.openingHoursService.getDetailedStatus(this.toilet);
  }

  get isNonPublic(): boolean {
    return this.toilet.publicAccessible === false;
  }

  get formattedDistance(): string | null {
    if (this.toilet.distanceMeters !== undefined && this.toilet.distanceMeters !== null) {
      return this.locationService.formatDistance(this.toilet.distanceMeters);
    }
    if (this.toilet.distance !== undefined && this.toilet.distance !== null) {
      return this.locationService.formatDistance(this.toilet.distance * 1000);
    }
    return null;
  }

  selectCard(): void {
    this.onSelect.emit(this.toilet);
  }

  toggleNonPublicInfo(): void {
    this.showNonPublicInfo.update((v) => !v);
  }
}

