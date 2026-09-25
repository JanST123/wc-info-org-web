import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { ThemeService } from '../../../core/services/theme.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ToiletStateService } from '../../../core/services/toilet-state.service';
import { LocationService } from '../../../core/services/location.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  readonly translationService = inject(TranslationService);
  readonly themeService = inject(ThemeService);
  private readonly toiletState = inject(ToiletStateService);
  private readonly locationService = inject(LocationService);
  private readonly router = inject(Router);

  setLang(lang: 'de' | 'en'): void {
    this.translationService.setLanguage(lang);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  openUrgent(): void {
    this.router.navigate(['/urgent']);
  }

  triggerNearby(): void {
    this.locationService.getCurrentPosition()
      .then((coords) => {
        this.toiletState.setSearchLocation({ lat: coords.lat, lon: coords.lon });
        this.toiletState.loadToiletsNearby(coords.lat, coords.lon);
        this.router.navigate(['/results'], {
          queryParams: { lat: coords.lat, lon: coords.lon }
        });
      })
      .catch((err) => {
        alert(this.translationService.t('common.error') + ': ' + err.message);
      });
  }

  openAddModal(): void {
    this.toiletState.openCreateWizard();
  }
}

