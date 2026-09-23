import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { ResultsComponent } from './features/results/results.component';
import { UrgentNavigateComponent } from './features/urgent-navigate/urgent-navigate.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'results', component: ResultsComponent },
  { path: 'urgent', component: UrgentNavigateComponent },
  { path: '**', redirectTo: '' }
];
