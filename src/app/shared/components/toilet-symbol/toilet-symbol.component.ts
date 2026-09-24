import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toilet } from '../../../core/models/toilet.model';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-toilet-symbol',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="flex flex-wrap items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
      <!-- Wheelchair Accessible -->
      @if (toilet.hasWheelchairAccess) {
        <span
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium"
          [title]="'attr.wheelchair' | translate"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="4" r="2"/>
            <path d="M18 19a6 6 0 0 1-12 0 6 6 0 0 1 12 0Z"/>
            <path d="m14 13 3 3"/>
            <path d="M9 13v-2a2 2 0 0 1 2-2h3"/>
          </svg>
          <span>{{ 'attr.wheelchair' | translate }}</span>
        </span>
      }

      <!-- Changing Table -->
      @if (toilet.hasChangingTable) {
        <span
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 font-medium"
          [title]="'attr.changingTable' | translate"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"/>
          </svg>
          <span>{{ 'attr.changingTable' | translate }}</span>
        </span>
      }

      <!-- Euro-key -->
      @if (toilet.euroKey === 'yes' || toilet.euroKey === 'true' || toilet.euroKey === '1') {
        <span
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium"
          [title]="'attr.euroKey' | translate"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/>
            <path d="m21 2-9.6 9.6"/>
            <circle cx="7.5" cy="15.5" r="5.5"/>
          </svg>
          <span>{{ 'attr.euroKey' | translate }}</span>
        </span>
      }

      <!-- Unisex or Gender Separation -->
      @if (toilet.isUnisex) {
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-medium">
          <span>{{ 'attr.unisex' | translate }}</span>
        </span>
      } @else if (toilet.isGenderSeparated) {
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-medium">
          <span>{{ 'attr.genderSeparated' | translate }}</span>
        </span>
      }

      <!-- Public / Non-Public -->
      @if (toilet.publicAccessible === false) {
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 font-medium">
          <span>{{ 'attr.nonPublic' | translate }}</span>
        </span>
      }
    </div>
  `
})
export class ToiletSymbolComponent {
  @Input({ required: true }) toilet!: Toilet;
}
