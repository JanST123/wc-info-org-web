import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { ResultsComponent } from './features/results/results.component';
import { UrgentNavigateComponent } from './features/urgent-navigate/urgent-navigate.component';
import { LawComponent } from './features/law/law.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'Toilets/:placeSlug/:toiletSlug', component: ResultsComponent },
  { path: 'Toilets/:placeSlug', component: ResultsComponent },
  { path: 'Toilets', component: ResultsComponent },
  { path: 'Toilet/:placeSlug/:toiletSlug', component: ResultsComponent },
  { path: 'Toilet/:placeSlug', component: ResultsComponent },
  { path: 'Toilet', component: ResultsComponent },
  { path: 'results', component: ResultsComponent },
  { path: 'Urgent', component: UrgentNavigateComponent },
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
