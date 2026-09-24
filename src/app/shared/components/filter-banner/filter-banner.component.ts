import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToiletStateService } from '../../../core/services/toilet-state.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-filter-banner',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-2xs">
      <!-- Top Toggle Header -->
      <div class="px-4 py-2.5 flex items-center justify-between cursor-pointer select-none hover:bg-gray-50/70 dark:hover:bg-gray-800/70 transition-colors" (click)="toggleExpanded()">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          <span class="text-sm font-semibold text-gray-800 dark:text-gray-200">{{ 'filter.title' | translate }}</span>

          @if (activeFiltersCount() > 0) {
            <span class="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-full">
              {{ activeFiltersCount() }}
            </span>
          }
        </div>

        <div class="flex items-center gap-2">
          @if (isNonDefault()) {
            <button
              type="button"
              (click)="$event.stopPropagation(); resetFilters()"
              class="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium underline"
            >
              {{ 'filter.reset' | translate }}
            </button>
          }

          <svg
            class="w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200"
            [class.rotate-180]="isExpanded()"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      <!-- Expandable Controls -->
      @if (isExpanded()) {
        <div class="px-4 pb-4 pt-1 space-y-3 text-sm text-gray-700 dark:text-gray-300 bg-gray-50/50 dark:bg-gray-850 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 animate-fadeIn">
          <!-- Switch 1: Closed Toilets -->
          <label class="flex items-center justify-between cursor-pointer py-1">
            <span>{{ 'filter.showClosed' | translate }}</span>
            <input
              type="checkbox"
              [ngModel]="filters().showClosed"
              (ngModelChange)="updateFilter('showClosed', $event)"
              class="w-4 h-4 text-purple-600 rounded-sm focus:ring-purple-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800"
            />
          </label>

          <!-- Switch 2: Non-public Toilets -->
          <div class="py-1">
            <label class="flex items-center justify-between cursor-pointer">
              <span class="flex items-center gap-1.5">
                {{ 'filter.showNonPublic' | translate }}
                <button
                  type="button"
                  (click)="$event.preventDefault(); showNonPublicInfo.set(!showNonPublicInfo())"
                  class="text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                  [title]="'filter.nonPublicNotice' | translate"
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                </button>
              </span>
              <input
                type="checkbox"
                [ngModel]="filters().showNonPublic"
                (ngModelChange)="updateFilter('showNonPublic', $event)"
                class="w-4 h-4 text-purple-600 rounded-sm focus:ring-purple-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800"
              />
            </label>
            @if (showNonPublicInfo()) {
              <p class="mt-1 text-xs text-gray-500 dark:text-purple-200 bg-purple-50/80 dark:bg-purple-950/60 p-2 rounded-md border border-purple-100 dark:border-purple-800">
                {{ 'filter.nonPublicNotice' | translate }}
              </p>
            }
          </div>

          <!-- Switch 3: Non-wheelchair -->
          <label class="flex items-center justify-between cursor-pointer py-1">
            <span>{{ 'filter.showNonWheelchair' | translate }}</span>
            <input
              type="checkbox"
              [ngModel]="filters().showNonWheelchairAccessible"
              (ngModelChange)="updateFilter('showNonWheelchairAccessible', $event)"
              class="w-4 h-4 text-purple-600 rounded-sm focus:ring-purple-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800"
            />
          </label>

          <!-- Switch 4: Without Changing Table -->
          <label class="flex items-center justify-between cursor-pointer py-1">
            <span>{{ 'filter.showWithoutChangingTable' | translate }}</span>
            <input
              type="checkbox"
              [ngModel]="filters().showWithoutChangingTable"
              (ngModelChange)="updateFilter('showWithoutChangingTable', $event)"
              class="w-4 h-4 text-purple-600 rounded-sm focus:ring-purple-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800"
            />
          </label>

          <!-- Switch 5: Without Gender Separation -->
          <label class="flex items-center justify-between cursor-pointer py-1">
            <span>{{ 'filter.showWithoutGenderSeparation' | translate }}</span>
            <input
              type="checkbox"
              [ngModel]="filters().showWithoutGenderSeparation"
              (ngModelChange)="updateFilter('showWithoutGenderSeparation', $event)"
              class="w-4 h-4 text-purple-600 rounded-sm focus:ring-purple-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800"
            />
          </label>

          <!-- Switch 6: Without Euro-key -->
          <div class="py-1">
            <label class="flex items-center justify-between cursor-pointer">
              <span class="flex items-center gap-1.5">
                {{ 'filter.showWithoutEuroKey' | translate }}
                <button
                  type="button"
                  (click)="$event.preventDefault(); showEuroKeyInfo.set(!showEuroKeyInfo())"
                  class="text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                  [title]="'filter.euroKeyNotice' | translate"
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                </button>
              </span>
              <input
                type="checkbox"
                [ngModel]="filters().showWithoutEuroKey"
                (ngModelChange)="updateFilter('showWithoutEuroKey', $event)"
                class="w-4 h-4 text-purple-600 rounded-sm focus:ring-purple-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800"
              />
            </label>
            @if (showEuroKeyInfo()) {
              <p class="mt-1 text-xs text-gray-500 dark:text-amber-200 bg-amber-50/80 dark:bg-amber-950/60 p-2 rounded-md border border-amber-100 dark:border-amber-800">
                {{ 'filter.euroKeyNotice' | translate }}
              </p>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class FilterBannerComponent {
  private readonly toiletState = inject(ToiletStateService);

  readonly isExpanded = signal<boolean>(false);
  readonly showNonPublicInfo = signal<boolean>(false);
  readonly showEuroKeyInfo = signal<boolean>(false);

  readonly filters = this.toiletState.filterSettings;
  readonly activeFiltersCount = this.toiletState.activeFilterCount;

  toggleExpanded(): void {
    this.isExpanded.update((v) => !v);
  }

  updateFilter(key: string, value: boolean): void {
    const current = { ...this.filters(), [key]: value };
    this.toiletState.setFilterSettings(current);
  }

  resetFilters(): void {
    this.toiletState.resetFilterSettings();
  }

  isNonDefault(): boolean {
    const f = this.filters();
    return (
      f.showClosed ||
      !f.showNonPublic ||
      !f.showNonWheelchairAccessible ||
      !f.showWithoutChangingTable ||
      !f.showWithoutGenderSeparation ||
      !f.showWithoutEuroKey
    );
  }
}
