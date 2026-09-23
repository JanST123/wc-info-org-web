import { Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toilet } from '../../../core/models/toilet.model';
import { OpeningHoursService, ToiletStatusInfo } from '../../../core/services/opening-hours.service';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-opening-time-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border" [ngClass]="statusInfo.badgeClass">
      <span class="w-2 h-2 rounded-full" [ngClass]="dotClass"></span>
      <span>{{ statusInfo.statusText }}</span>
    </div>
  `
})
export class OpeningTimeBadgeComponent {
  private readonly openingHoursService = inject(OpeningHoursService);
  private readonly translationService = inject(TranslationService);

  @Input({ required: true }) toilet!: Toilet;

  get statusInfo(): ToiletStatusInfo {
    // Re-evaluates when language changes
    this.translationService.currentLang();
    return this.openingHoursService.getStatusInfo(this.toilet);
  }

  get dotClass(): string {
    switch (this.statusInfo.urgency) {
      case 'open':
        return 'bg-emerald-500 animate-pulse';
      case 'urgent':
        return 'bg-rose-500 animate-ping';
      case 'warning':
        return 'bg-orange-500';
      case 'closed':
      default:
        return 'bg-gray-400';
    }
  }
}
