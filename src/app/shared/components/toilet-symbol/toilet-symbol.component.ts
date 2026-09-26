import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toilet } from '../../../core/models/toilet.model';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-toilet-symbol',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="flex flex-wrap items-center gap-2 text-purple-600 dark:text-purple-400">
      <!-- Wheelchair Accessible -->
      @if (hasWheelchair) {
        <span
          class="inline-flex items-center text-purple-600 dark:text-purple-400"
          [title]="'attr.wheelchair' | translate"
        >
          <i aria-hidden="true" class="fa-solid fa-wheelchair text-sm sm:text-base"></i>
        </span>
      }

      <!-- Gender Separation: restroom -->
      @if (isGenderSeparated) {
        <span
          class="inline-flex items-center text-purple-600 dark:text-purple-400"
          [title]="'attr.genderSeparated' | translate"
        >
          <i aria-hidden="true" class="fa-solid fa-restroom text-sm sm:text-base"></i>
        </span>
      }

      <!-- Changing Table: baby -->
      @if (hasChangingTable) {
        <span
          class="inline-flex items-center text-purple-600 dark:text-purple-400"
          [title]="'attr.changingTable' | translate"
        >
          <i aria-hidden="true" class="fa-solid fa-baby text-sm sm:text-base"></i>
        </span>
      }

      <!-- Euro-key -->
      @if (hasEuroKey) {
        <span
          class="inline-flex items-center text-purple-600 dark:text-purple-400"
          [title]="'attr.euroKey' | translate"
        >
          <i aria-hidden="true" class="fa-solid fa-key text-xs sm:text-sm"></i>
        </span>
      }

      <!-- For all other toilets: toilet-paper -->
      @if (isOtherToilet) {
        <span
          class="inline-flex items-center text-purple-600 dark:text-purple-400"
          [title]="(toilet.isUnisex ? 'attr.unisex' : 'attr.public') | translate"
        >
          <i aria-hidden="true" class="fa-solid fa-toilet-paper text-sm sm:text-base"></i>
        </span>
      }
    </div>
  `
})
export class ToiletSymbolComponent {
  @Input({ required: true }) toilet!: Toilet;

  get hasWheelchair(): boolean {
    return Boolean(this.toilet.hasWheelchairAccess || (this.toilet as any).has_wheelchair_access);
  }

  get isGenderSeparated(): boolean {
    return Boolean(this.toilet.isGenderSeparated || (this.toilet as any).is_gender_separated);
  }

  get hasChangingTable(): boolean {
    return Boolean(this.toilet.hasChangingTable || (this.toilet as any).has_changing_table);
  }

  get hasEuroKey(): boolean {
    const k = this.toilet.euroKey ?? (this.toilet as any).euro_key;
    return k === 'yes' || k === 'true' || k === '1' || k === true || k === 1;
  }

  get isOtherToilet(): boolean {
    return !this.hasWheelchair && !this.isGenderSeparated && !this.hasChangingTable && !this.hasEuroKey;
  }
}
