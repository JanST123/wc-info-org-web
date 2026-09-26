import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toilet, ToiletPhoto } from '../../core/models/toilet.model';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { OpeningTimeBadgeComponent } from '../../shared/components/opening-time-badge/opening-time-badge.component';
import { ToiletSymbolComponent } from '../../shared/components/toilet-symbol/toilet-symbol.component';
import { OpeningHoursService } from '../../core/services/opening-hours.service';
import { LocationService } from '../../core/services/location.service';
import { TranslationService } from '../../core/services/translation.service';

import { EuroKeyModalComponent } from '../../shared/components/euro-key-modal/euro-key-modal.component';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule, TranslatePipe, OpeningTimeBadgeComponent, EuroKeyModalComponent],
  templateUrl: './detail.component.html',
})
export class DetailComponent {
  private readonly openingHoursService = inject(OpeningHoursService);
  private readonly locationService = inject(LocationService);
  private readonly translationService = inject(TranslationService);

  @Input({ required: true }) toilet!: Toilet;

  @Output() onClose = new EventEmitter<void>();
  @Output() onStartNavigation = new EventEmitter<Toilet>();
  @Output() onSuggestEdit = new EventEmitter<Toilet>();
  @Output() onReportProblem = new EventEmitter<Toilet>();
  @Output() onAddPhoto = new EventEmitter<Toilet>();

  readonly activeLightboxPhoto = signal<ToiletPhoto | null>(null);
  readonly showEuroKeyModal = signal<boolean>(false);

  get formattedDistance(): string | null {
    if (this.toilet.distanceMeters !== undefined && this.toilet.distanceMeters !== null) {
      return this.locationService.formatDistance(this.toilet.distanceMeters);
    }
    if (this.toilet.distance !== undefined && this.toilet.distance !== null) {
      return this.locationService.formatDistance(this.toilet.distance * 1000);
    }
    return null;
  }

  get isEuroKeyRequired(): boolean {
    const k = this.toilet.euroKey;
    return k === 'yes' || k === 'true' || k === '1';
  }

  get weeklySchedule() {
    this.translationService.currentLang();
    return this.openingHoursService.getWeeklySchedule(this.toilet);
  }

  shareToilet(): void {
    const shareUrl = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: this.toilet.name || 'WC-Info',
        text: this.toilet.address || 'WC-Info Restroom',
        url: shareUrl
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert(this.translationService.t('common.copied'));
      });
    }
  }
}
