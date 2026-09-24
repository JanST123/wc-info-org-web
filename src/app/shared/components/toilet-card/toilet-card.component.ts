import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toilet } from '../../../core/models/toilet.model';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { OpeningTimeBadgeComponent } from '../opening-time-badge/opening-time-badge.component';
import { ToiletSymbolComponent } from '../toilet-symbol/toilet-symbol.component';
import { LocationService } from '../../../core/services/location.service';

@Component({
  selector: 'app-toilet-card',
  standalone: true,
  imports: [CommonModule, TranslatePipe, OpeningTimeBadgeComponent, ToiletSymbolComponent],
  template: `
    <div
      (click)="selectCard()"
      class="group p-4 bg-white dark:bg-gray-800 rounded-xl border transition-all duration-200 cursor-pointer text-left hover:shadow-md relative overflow-hidden"
      [ngClass]="isSelected ? 'border-purple-500 dark:border-purple-500 ring-2 ring-purple-200 dark:ring-purple-900/50 bg-purple-50 dark:bg-purple-950/40' : 'border-gray-200 dark:border-gray-700'"
    >
      <!-- Top Row: Operator / Owner & Distance -->
      <div class="flex items-center justify-between gap-2 mb-1.5">
        <div class="flex items-center gap-1.5 min-w-0">
          @if (toilet.owner) {
            <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
              {{ toilet.owner }}
            </span>
          }
          @if (toilet.isQualified) {
            <span class="inline-flex items-center text-purple-600 dark:text-purple-400" [title]="'attr.verified' | translate">
              <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path>
              </svg>
            </span>
          }
        </div>

        @if (formattedDistance) {
          <span class="text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full shrink-0">
            {{ formattedDistance }}
          </span>
        }
      </div>

      <!-- Restroom Name -->
      <h3 class="text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors line-clamp-1 mb-1">
        {{ toilet.name || ('app.title' | translate) }}
      </h3>

      <!-- Address / Subtitle -->
      @if (toilet.address) {
        <p class="text-xs text-gray-500 dark:text-gray-400 truncate mb-2.5">
          {{ toilet.address }}
        </p>
      }

      <!-- Status & Symbols Row -->
      <div class="space-y-2 mb-3">
        <div class="flex items-center gap-2">
          <app-opening-time-badge [toilet]="toilet"></app-opening-time-badge>
        </div>
        <app-toilet-symbol [toilet]="toilet"></app-toilet-symbol>
      </div>

      <!-- Photo thumbnails if available -->
      @if (toilet.photos && toilet.photos.length > 0) {
        <div class="flex items-center gap-1.5 overflow-x-auto py-1 mb-3 no-scrollbar">
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

      <!-- Bottom Action Buttons -->
      <div class="pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2" (click)="$event.stopPropagation()">
        <button
          type="button"
          (click)="onNavigate.emit(toilet)"
          class="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-semibold transition-colors"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
          </svg>
          {{ 'detail.navigate' | translate }}
        </button>

        <button
          type="button"
          (click)="onOpenDetails.emit(toilet)"
          class="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold transition-colors"
        >
          {{ 'detail.title' | translate }}
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </div>
  `
})
export class ToiletCardComponent {
  private readonly locationService = inject(LocationService);

  @Input({ required: true }) toilet!: Toilet;
  @Input() isSelected = false;

  @Output() onSelect = new EventEmitter<Toilet>();
  @Output() onOpenDetails = new EventEmitter<Toilet>();
  @Output() onNavigate = new EventEmitter<Toilet>();

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
}
