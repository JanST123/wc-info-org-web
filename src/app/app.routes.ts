import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { ResultsComponent } from './features/results/results.component';
import { UrgentNavigateComponent } from './features/urgent-navigate/urgent-navigate.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'Toilets/:placeSlug/:toiletSlug', component: ResultsComponent },
  { path: 'Toilets/:placeSlug', component: ResultsComponent },
  { path: 'Toilets', component: ResultsComponent },
  { path: 'Toilet/:placeSlug/:toiletSlug', component: ResultsComponent },
  { path: 'Toilet/:placeSlug', component: ResultsComponent },
  { path: 'Toilet', component: ResultsComponent },
  { path: 'results', component: ResultsComponent },
  { path: 'urgent', component: UrgentNavigateComponent },
  { path: '**', redirectTo: '' }
];
