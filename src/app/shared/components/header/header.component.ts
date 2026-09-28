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
    this.toiletState.setNavigationTarget(null);
    this.router.navigate(['/Urgent'], { queryParams: {} });
  }

  triggerNearby(): void {
    this.router.navigate(['/Toilets', 'Aktueller-Standort---NEARBY']);
  }

  openAddModal(): void {
    this.toiletState.openCreateWizard();
  }
}

