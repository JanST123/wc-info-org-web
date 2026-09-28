import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { ThemeService } from '../../../core/services/theme.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ToiletStateService } from '../../../core/services/toilet-state.service';
import { LocationService } from '../../../core/services/location.service';
import { HelpModalComponent } from '../../../features/help/help-modal/help-modal.component';
import { MatomoService } from '../../../core/services/matomo.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, HelpModalComponent, RouterModule, TranslatePipe],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  readonly translationService = inject(TranslationService);
  readonly themeService = inject(ThemeService);
  readonly helpModal = signal(false);
  private readonly toiletState = inject(ToiletStateService);
  private readonly locationService = inject(LocationService);
  private readonly router = inject(Router);
  private readonly matomoService = inject(MatomoService);

  setLang(lang: 'de' | 'en'): void {
    this.translationService.setLanguage(lang);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleHelp() {
    const nextState = !this.helpModal();
    this.helpModal.set(nextState);
    if (nextState) {
      this.matomoService.trackHelpUsed();
    }
  }

  openUrgent(): void {
    this.matomoService.trackUrgentUsed();
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

