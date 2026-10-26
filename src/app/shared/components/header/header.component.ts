import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SupportedLanguage, TranslationService } from '../../../core/services/translation.service';
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

  setLang(lang: SupportedLanguage): void {
    this.translationService.setLanguage(lang);

    const currentUrl = this.router.url;
    const urlTree = this.router.parseUrl(currentUrl);
    const rootGroup = urlTree.root.children['primary'];
    if (rootGroup && rootGroup.segments.length > 0) {
      const first = rootGroup.segments[0].path.toLowerCase();
      if (['de', 'en', 'nl'].includes(first)) {
        rootGroup.segments[0].path = lang;
        this.router.navigateByUrl(urlTree);
        return;
      }
    }
    this.router.navigate(['/', lang]);
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
    this.router.navigate(['/', this.translationService.currentLang(), 'Urgent'], { queryParams: {} });
  }

  triggerNearby(): void {
    this.router.navigate(['/', this.translationService.currentLang(), 'Toilets', 'Aktueller-Standort---NEARBY']);
  }

  openAddModal(): void {
    this.toiletState.openCreateWizard();
  }
}

