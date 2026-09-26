import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToiletStateService } from '../../../core/services/toilet-state.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ToiletFilterSettings } from '../../../core/models/filter-settings.model';

import { EuroKeyModalComponent } from '../euro-key-modal/euro-key-modal.component';

@Component({
  selector: 'app-filter-banner',
  standalone: true,
  imports: [CommonModule, TranslatePipe, EuroKeyModalComponent],
  templateUrl: './filter-banner.component.html',
})
export class FilterBannerComponent {
  private readonly toiletState = inject(ToiletStateService);
  private readonly translationService = inject(TranslationService);

  readonly isExpanded = signal<boolean>(false);
  readonly showNonPublicInfo = signal<boolean>(false);
  readonly showEuroKeyInfo = signal<boolean>(false);

  readonly filters = this.toiletState.filterSettings;

  readonly ariaLabel = computed(() =>
    this.isExpanded()
      ? this.translationService.t('filter.collapse')
      : this.translationService.t('filter.expand')
  );

  readonly summary = computed(() => {
    const f = this.filters();
    const lang = this.translationService.currentLang();
    const restrictions: string[] = [];

    if (!f.showClosed) {
      restrictions.push(this.translationService.t('filter.restrictionOpen'));
    }
    if (!f.showNonPublic) {
      restrictions.push(this.translationService.t('filter.restrictionPublic'));
    }
    if (!f.showNonWheelchairAccessible) {
      restrictions.push(this.translationService.t('filter.restrictionWheelchair'));
    }
    if (!f.showWithoutChangingTable) {
      restrictions.push(this.translationService.t('filter.restrictionChangingTable'));
    }
    if (!f.showWithoutGenderSeparation) {
      restrictions.push(this.translationService.t('filter.restrictionGenderSeparated'));
    }
    if (!f.showWithoutEuroKey) {
      restrictions.push(this.translationService.t('filter.restrictionEuroKey'));
    }

    if (restrictions.length === 0) {
      return {
        prefix: lang === 'de' ? 'Zeige ' : 'Show ',
        bold: lang === 'de' ? 'alle' : 'all',
        suffix: lang === 'de' ? ' Toiletten an.' : ' toilets.'
      };
    }

    return {
      prefix: lang === 'de' ? 'Zeige nur ' : 'Show only ',
      bold: restrictions.join(', '),
      suffix: lang === 'de' ? ' Toiletten an.' : ' toilets.'
    };
  });

  toggleExpanded(): void {
    this.isExpanded.update((v) => !v);
  }

  toggleFilter(key: keyof ToiletFilterSettings): void {
    const current = { ...this.filters(), [key]: !this.filters()[key] };
    this.toiletState.setFilterSettings(current);
  }

  resetFilters(): void {
    this.toiletState.resetFilterSettings();
  }
}
