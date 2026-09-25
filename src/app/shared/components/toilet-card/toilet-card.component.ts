import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toilet, ToiletPhoto } from '../../../core/models/toilet.model';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ToiletSymbolComponent } from '../toilet-symbol/toilet-symbol.component';
import { LocationService } from '../../../core/services/location.service';
import { OpeningHoursService, DetailedStatus } from '../../../core/services/opening-hours.service';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-toilet-card',
  standalone: true,
  imports: [CommonModule, TranslatePipe, ToiletSymbolComponent],
  templateUrl: './toilet-card.component.html',
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
  @Output() onOpenPhoto = new EventEmitter<ToiletPhoto>();

  readonly showNonPublicInfo = signal(false);

  openPhoto(photo: ToiletPhoto, event: MouseEvent): void {
    event.stopPropagation();
    this.onOpenPhoto.emit(photo);
  }

  get displayTitle(): string {
    if (this.toilet.owner && this.toilet.owner.trim().length > 0 && this.toilet.name && this.toilet.owner !== this.toilet.name) {
      return this.toilet.owner;
    }
    return this.toilet.name || '';
  }

  get displaySubtitle(): string | null {
    if (this.toilet.owner && this.toilet.owner.trim().length > 0 && this.toilet.name && this.toilet.owner !== this.toilet.name) {
      return this.toilet.name;
    }
    return null;
  }

  get hasSymbols(): boolean {
    return !!(
      this.toilet.hasWheelchairAccess ||
      this.toilet.hasChangingTable ||
      this.toilet.isGenderSeparated ||
      this.toilet.isUnisex ||
      this.toilet.euroKey === 'yes' ||
      this.toilet.euroKey === 'true' ||
      this.toilet.euroKey === '1'
    );
  }

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

