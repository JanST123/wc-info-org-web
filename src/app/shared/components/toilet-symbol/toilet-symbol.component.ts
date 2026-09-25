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
    <div class="flex flex-wrap items-center gap-2 text-purple-600 dark:text-purple-400">
      <!-- Wheelchair Accessible -->
      @if (toilet.hasWheelchairAccess) {
        <span
          class="inline-flex items-center text-purple-600 dark:text-purple-400"
          [title]="'attr.wheelchair' | translate"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="4" r="2"/>
            <path d="M18 19a6 6 0 0 1-12 0 6 6 0 0 1 12 0Z"/>
            <path d="m14 13 3 3"/>
            <path d="M9 13v-2a2 2 0 0 1 2-2h3"/>
          </svg>
        </span>
      }

      <!-- Gender Separation / Unisex -->
      @if (toilet.isGenderSeparated) {
        <span
          class="inline-flex items-center text-purple-600 dark:text-purple-400"
          [title]="'attr.genderSeparated' | translate"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </span>
      } @else if (toilet.isUnisex) {
        <span
          class="inline-flex items-center text-purple-600 dark:text-purple-400"
          [title]="'attr.unisex' | translate"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 12V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13a4 4 0 0 1-4 4H6a2 2 0 0 1-2-2v-3"/>
            <circle cx="10" cy="8" r="2"/>
            <path d="M4 12h12"/>
          </svg>
        </span>
      }

      <!-- Changing Table -->
      @if (toilet.hasChangingTable) {
        <span
          class="inline-flex items-center text-purple-600 dark:text-purple-400"
          [title]="'attr.changingTable' | translate"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"/>
          </svg>
        </span>
      }

      <!-- Euro-key -->
      @if (toilet.euroKey === 'yes' || toilet.euroKey === 'true' || toilet.euroKey === '1') {
        <span
          class="inline-flex items-center text-purple-600 dark:text-purple-400"
          [title]="'attr.euroKey' | translate"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/>
            <path d="m21 2-9.6 9.6"/>
            <circle cx="7.5" cy="15.5" r="5.5"/>
          </svg>
        </span>
      }
    </div>
  `
})
export class ToiletSymbolComponent {
  @Input({ required: true }) toilet!: Toilet;
}
