import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as exifr from 'exifr';
import { Toilet, ToiletPhoto } from '../../core/models/toilet.model';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { OpeningTimeBadgeComponent } from '../../shared/components/opening-time-badge/opening-time-badge.component';
import { ToiletSymbolComponent } from '../../shared/components/toilet-symbol/toilet-symbol.component';
import { OpeningHoursService } from '../../core/services/opening-hours.service';
import { LocationService } from '../../core/services/location.service';
import { TranslationService } from '../../core/services/translation.service';
import { WcInfoApiService } from '../../core/services/wc-info-api.service';

import { EuroKeyModalComponent } from '../../shared/components/euro-key-modal/euro-key-modal.component';
import { PhotoLightboxModalComponent } from '../../shared/components/photo-lightbox-modal/photo-lightbox-modal.component';
import { PhotoLegalModalComponent } from '../photo-upload/photo-legal-modal.component';
import { ToiletStateService } from '../../core/services/toilet-state.service';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    OpeningTimeBadgeComponent,
    EuroKeyModalComponent,
    PhotoLightboxModalComponent,
    PhotoLegalModalComponent
  ],
  templateUrl: './detail.component.html',
})
export class DetailComponent {
  private readonly openingHoursService = inject(OpeningHoursService);
  private readonly locationService = inject(LocationService);
  private readonly translationService = inject(TranslationService);
  private readonly toiletState = inject(ToiletStateService);
  private readonly api = inject(WcInfoApiService);

  @Input({ required: true }) toilet!: Toilet;

  @Output() onClose = new EventEmitter<void>();
  @Output() onStartNavigation = new EventEmitter<Toilet>();
  @Output() onSuggestEdit = new EventEmitter<Toilet>();
  @Output() onReportProblem = new EventEmitter<Toilet>();
  @Output() onAddPhoto = new EventEmitter<Toilet>();
  @Output() onPhotoDeleted = new EventEmitter<{ toiletId?: number; photo: ToiletPhoto }>();

  @ViewChild('detailPhotoInput') detailPhotoInputRef?: ElementRef<HTMLInputElement>;

  readonly activeLightboxPhoto = signal<ToiletPhoto | null>(null);
  readonly showEuroKeyModal = signal<boolean>(false);
  readonly isUploadingPhoto = signal<boolean>(false);
  readonly showPhotoModal = signal<boolean>(false);
  
  triggerAddPhoto(): void {
    const isConfirmed = typeof window !== 'undefined' && localStorage.getItem('wc_photo_legal_confirmed') === 'true';
    if (isConfirmed) {
      this.detailPhotoInputRef?.nativeElement?.click();
    } else {
      this.showPhotoModal.set(true);
    }
  }

  async onDirectPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.isUploadingPhoto.set(true);

    let exifDataString: string | undefined;
    let fixedGeo: { lat: number; lon: number } | undefined;

    try {
      const parsed = await exifr.parse(file, { gps: true });
      if (parsed) {
        exifDataString = JSON.stringify(parsed);
        if (parsed.latitude && parsed.longitude) {
          fixedGeo = { lat: parsed.latitude, lon: parsed.longitude };
        }
      }
    } catch {
      // Ignore exif parse error
    }

    this.api.uploadPhoto(file, this.toilet.id, exifDataString, fixedGeo).subscribe({
      next: (res) => {
        this.isUploadingPhoto.set(false);
        input.value = '';
        const newPhoto: ToiletPhoto = {
          id: res.id || Date.now(),
          toiletId: this.toilet.id,
          url: res.imageUrl || '',
          urlThumb: res.thumbUrl || res.imageUrl || '',
          filename: res.filename
        };
        this.toilet.photos = [...(this.toilet.photos || []), newPhoto];
        this.toiletState.reloadCurrentView();
      },
      error: () => {
        this.isUploadingPhoto.set(false);
        input.value = '';
      }
    });
  }

  onLegalPhotoUploaded(data: { url: string; thumbUrl?: string; filename: string }): void {
    this.showPhotoModal.set(false);
    this.isUploadingPhoto.set(false);
    const newPhoto: ToiletPhoto = {
      id: Date.now(),
      toiletId: this.toilet.id,
      url: data.url,
      urlThumb: data.thumbUrl || data.url,
      filename: data.filename
    };
    this.toilet.photos = [...(this.toilet.photos || []), newPhoto];
    this.toiletState.reloadCurrentView();
  }

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
