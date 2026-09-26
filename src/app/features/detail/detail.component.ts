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
import { PhotoLightboxModalComponent } from '../../shared/components/photo-lightbox-modal/photo-lightbox-modal.component';
import { ToiletStateService } from '../../core/services/toilet-state.service';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule, TranslatePipe, OpeningTimeBadgeComponent, EuroKeyModalComponent, PhotoLightboxModalComponent],
  templateUrl: './detail.component.html',
})
export class DetailComponent {
  private readonly openingHoursService = inject(OpeningHoursService);
  private readonly locationService = inject(LocationService);
  private readonly translationService = inject(TranslationService);
  private readonly toiletState = inject(ToiletStateService);

  @Input({ required: true }) toilet!: Toilet;

  @Output() onClose = new EventEmitter<void>();
  @Output() onStartNavigation = new EventEmitter<Toilet>();
  @Output() onSuggestEdit = new EventEmitter<Toilet>();
  @Output() onReportProblem = new EventEmitter<Toilet>();
  @Output() onAddPhoto = new EventEmitter<Toilet>();
  @Output() onPhotoDeleted = new EventEmitter<{ toiletId?: number; photo: ToiletPhoto }>();

  readonly activeLightboxPhoto = signal<ToiletPhoto | null>(null);
  readonly showEuroKeyModal = signal<boolean>(false);

  handlePhotoDeleted(event: { toiletId?: number; photo: ToiletPhoto }): void {
    if (this.toilet.photos) {
      this.toilet.photos = this.toilet.photos.filter(
        (p) => p !== event.photo && p.id !== event.photo.id && p.url !== event.photo.url
      );
    }
    this.toiletState.reloadCurrentView();
    this.activeLightboxPhoto.set(null);
    this.onPhotoDeleted.emit(event);
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
