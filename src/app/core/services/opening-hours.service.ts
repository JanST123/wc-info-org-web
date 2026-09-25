import { Injectable, inject } from '@angular/core';
import { Toilet, GooglePlacesPeriod } from '../models/toilet.model';
import { TranslationService } from './translation.service';

export interface ToiletStatusInfo {
  isOpen: boolean;
  is247: boolean;
  statusText: string;
  badgeClass: string; // Tailwind color class
  urgency: 'urgent' | 'warning' | 'open' | 'closed';
}

export interface DetailedStatus {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  isTemporaryClosed: boolean;
  colorClass: string;
  subtitleColorClass?: string;
}

export interface DaySchedule {
  dayIndex: number; // 0=Sunday, 1=Monday...
  dayName: string;
  isToday: boolean;
  hoursText: string;
}

@Injectable({
  providedIn: 'root'
})
export class OpeningHoursService {
  private readonly translationService = inject(TranslationService);

  is24HoursOpen(toilet: Toilet): boolean {
    if (!toilet.placeOpeningHours || toilet.placeOpeningHours.length === 0) {
      return false;
    }

    const periods = toilet.placeOpeningHours;
    if (periods.length === 1) {
      const p = periods[0];
      if (p.open?.day === 0 && p.open?.hour === 0 && p.open?.minute === 0 && (!p.close || (p.close.hour === 0 && p.close.minute === 0 && p.close.day === 0))) {
        return true;
      }
    }

    if (periods.length >= 7) {
      const allDayOpen = periods.every((p) => {
        return p.open?.hour === 0 && p.open?.minute === 0 && (!p.close || p.close.hour === 24 || (p.close.hour === 0 && p.close.minute === 0));
      });
      if (allDayOpen) return true;
    }

    return false;
  }

  getStatusInfo(toilet: Toilet): ToiletStatusInfo {
    if (toilet.status === 'temporary_closed' || toilet.temporaryClosed) {
      return {
        isOpen: false,
        is247: false,
        statusText: this.translationService.t('status.tempClosed'),
        badgeClass: 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        urgency: 'warning'
      };
    }

    const is247 = this.is24HoursOpen(toilet);
    if (is247) {
      return {
        isOpen: true,
        is247: true,
        statusText: this.translationService.t('status.open247'),
        badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        urgency: 'open'
      };
    }

    const now = new Date();
    const isOpen = toilet.isOpen ?? false;

    // Check close countdown if open and closeTimestamp exists
    if (isOpen && toilet.closeTimestamp) {
      const closeDate = new Date(toilet.closeTimestamp);
      const diffMs = closeDate.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);

      if (diffMinutes > 0 && diffMinutes <= 30) {
        return {
          isOpen: true,
          is247: false,
          statusText: this.translationService.t('status.closesIn', { time: `${diffMinutes} Min.` }),
          badgeClass: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-semibold',
          urgency: 'urgent'
        };
      } else if (diffMinutes > 30 && diffMinutes <= 180) {
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        const timeStr = hours > 0 ? `${hours} Std. ${mins} Min.` : `${mins} Min.`;
        return {
          isOpen: true,
          is247: false,
          statusText: this.translationService.t('status.closesIn', { time: timeStr }),
          badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          urgency: 'open'
        };
      }
    }

    // If closed and openTimestamp is available
    if (!isOpen && toilet.openTimestamp) {
      const openDate = new Date(toilet.openTimestamp);
      const diffMs = openDate.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);

      if (diffMinutes > 0 && diffMinutes <= 60) {
        return {
          isOpen: false,
          is247: false,
          statusText: this.translationService.t('status.opensIn', { time: `${diffMinutes} Min.` }),
          badgeClass: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          urgency: 'closed'
        };
      } else if (diffMinutes > 0 && diffMinutes <= 720) {
        const timeStr = openDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          isOpen: false,
          is247: false,
          statusText: this.translationService.t('status.opensAt', { time: timeStr }),
          badgeClass: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          urgency: 'closed'
        };
      }
    }

    if (isOpen) {
      return {
        isOpen: true,
        is247: false,
        statusText: this.translationService.t('status.open'),
        badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        urgency: 'open'
      };
    }

    return {
      isOpen: false,
      is247: false,
      statusText: this.translationService.t('status.closed'),
      badgeClass: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700',
      urgency: 'closed'
    };
  }

  getDetailedStatus(toilet: Toilet): DetailedStatus {
    if (toilet.status === 'temporary_closed' || toilet.temporaryClosed) {
      return {
        title: this.translationService.t('status.tempClosed'),
        isOpen: false,
        isTemporaryClosed: true,
        colorClass: 'text-amber-600 dark:text-amber-400'
      };
    }

    const is247 = this.is24HoursOpen(toilet);
    if (is247) {
      return {
        title: this.translationService.t('status.open'),
        subtitle: this.translationService.t('status.open247'),
        isOpen: true,
        isTemporaryClosed: false,
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        subtitleColorClass: 'text-gray-500 dark:text-gray-400'
      };
    }

    const now = new Date();
    const isOpen = toilet.isOpen ?? false;

    if (isOpen) {
      let subtitle: string | undefined;
      let subtitleColorClass = 'text-gray-500 dark:text-gray-400';

      if (toilet.closeTimestamp) {
        const closeDate = new Date(toilet.closeTimestamp);
        const diffMs = closeDate.getTime() - now.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);

        if (diffMinutes > 0 && diffMinutes <= 30) {
          subtitle = this.translationService.t('status.closesIn', { time: `${diffMinutes} Min.` });
          subtitleColorClass = 'text-rose-600 dark:text-rose-400 font-semibold';
        } else if (diffMinutes > 30 && diffMinutes <= 180) {
          const hours = Math.floor(diffMinutes / 60);
          const mins = diffMinutes % 60;
          const timeStr = hours > 0 ? `${hours} Std. ${mins} Min.` : `${mins} Min.`;
          subtitle = this.translationService.t('status.closesIn', { time: timeStr });
        }
      }

      return {
        title: this.translationService.t('status.open'),
        subtitle,
        isOpen: true,
        isTemporaryClosed: false,
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        subtitleColorClass
      };
    } else {
      let subtitle: string | undefined;
      if (toilet.openTimestamp) {
        const openDate = new Date(toilet.openTimestamp);
        const diffMs = openDate.getTime() - now.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);

        if (diffMinutes > 0 && diffMinutes <= 60) {
          subtitle = this.translationService.t('status.opensIn', { time: `${diffMinutes} Min.` });
        } else if (diffMinutes > 0 && diffMinutes <= 720) {
          const timeStr = openDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          subtitle = this.translationService.t('status.opensAt', { time: timeStr });
        }
      }

      return {
        title: this.translationService.t('status.closed'),
        subtitle,
        isOpen: false,
        isTemporaryClosed: false,
        colorClass: 'text-gray-500 dark:text-gray-400',
        subtitleColorClass: 'text-purple-600 dark:text-purple-400'
      };
    }
  }

  getWeeklySchedule(toilet: Toilet): DaySchedule[] {
    const todayIndex = new Date().getDay(); // 0=Sun, 1=Mon...
    // We order Monday (1) through Sunday (0)
    const dayIndices = [1, 2, 3, 4, 5, 6, 0];

    if (this.is24HoursOpen(toilet)) {
      return dayIndices.map((idx) => ({
        dayIndex: idx,
        dayName: this.translationService.t(`days.${idx}`),
        isToday: idx === todayIndex,
        hoursText: this.translationService.t('status.open247')
      }));
    }

    const periods = toilet.placeOpeningHours || [];

    return dayIndices.map((idx) => {
      const dayPeriods = periods.filter((p) => p.open?.day === idx);
      let hoursText = this.translationService.t('status.closed');

      if (dayPeriods.length > 0) {
        hoursText = dayPeriods
          .map((p) => {
            const openStr = `${String(p.open.hour).padStart(2, '0')}:${String(p.open.minute).padStart(2, '0')}`;
            if (!p.close) return `${openStr} - 24:00`;
            const closeStr = `${String(p.close.hour).padStart(2, '0')}:${String(p.close.minute).padStart(2, '0')}`;
            return `${openStr} - ${closeStr}`;
          })
          .join(', ');
      }

      return {
        dayIndex: idx,
        dayName: this.translationService.t(`days.${idx}`),
        isToday: idx === todayIndex,
        hoursText
      };
    });
  }
}
