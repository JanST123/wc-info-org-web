import { Routes, CanMatchFn, CanActivateFn, Router, RedirectFunction } from '@angular/router';
import { inject } from '@angular/core';
import { HomeComponent } from './features/home/home.component';
import { ResultsComponent } from './features/results/results.component';
import { UrgentNavigateComponent } from './features/urgent-navigate/urgent-navigate.component';
import { LawComponent } from './features/law/law.component';
import { HelpComponent } from './features/help/help.component';
import { SupportedLanguage, TranslationService } from './core/services/translation.service';

const isSupportedLang = (lang: string | null | undefined): lang is SupportedLanguage => {
  return lang === 'de' || lang === 'en' || lang === 'nl';
};

const languageCanMatch: CanMatchFn = (route, segments) => {
  const first = segments[0]?.path?.toLowerCase();
  return isSupportedLang(first);
};

const languageCanActivate: CanActivateFn = (route) => {
  const lang = route.paramMap.get('lang')?.toLowerCase();
  if (isSupportedLang(lang)) {
    const translationService = inject(TranslationService);
    if (translationService.currentLang() !== lang) {
      translationService.setLanguage(lang);
    }
    return true;
  }
  return false;
};

const languageRedirect: RedirectFunction = (redirectData) => {
  const translationService = inject(TranslationService);
  const router = inject(Router);
  const detectedLang = translationService.currentLang();

  const urlSegments = redirectData.url.map(s => s.path);
  return router.createUrlTree(['/', detectedLang, ...urlSegments], {
    queryParams: redirectData.queryParams,
    fragment: redirectData.fragment || undefined
  });
};

const appRoutes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'Toilets/:placeSlug/:toiletSlug', component: ResultsComponent },
  { path: 'Toilets/:placeSlug', component: ResultsComponent },
  { path: 'Toilets', component: ResultsComponent },
  { path: 'toiletten/:placeSlug/:toiletSlug', component: ResultsComponent },
  { path: 'toiletten/:placeSlug', component: ResultsComponent },
  { path: 'toiletten', component: ResultsComponent },
  { path: 'Toilet/:placeSlug/:toiletSlug', component: ResultsComponent },
  { path: 'Toilet/:placeSlug', component: ResultsComponent },
  { path: 'Toilet', component: ResultsComponent },
  { path: 'toilet/:placeSlug/:toiletSlug', component: ResultsComponent },
  { path: 'toilet/:placeSlug', component: ResultsComponent },
  { path: 'toilet', component: ResultsComponent },
  { path: 'results', component: ResultsComponent },
  { path: 'Urgent', component: UrgentNavigateComponent },
  { path: 'Help', component: HelpComponent },
  {
    path: 'Law',
    component: LawComponent,
    children: [
      { path: 'Privacy', loadComponent: () => import('./features/law/privacy/privacy.component').then(m => m.PrivacyComponent) },
      { path: 'Disclaimer', loadComponent: () => import('./features/law/disclaimer/disclaimer.component').then(m => m.DisclaimerComponent) },
      { path: 'Imprint', loadComponent: () => import('./features/law/imprint/imprint.component').then(m => m.ImprintComponent) },
    ]
  },
  { path: '**', redirectTo: '' }
];

export const routes: Routes = [
  {
    path: ':lang',
    canMatch: [languageCanMatch],
    canActivate: [languageCanActivate],
    children: appRoutes
  },
  {
    path: '**',
    redirectTo: languageRedirect
  }
];
