
import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';
import { FeaturesComponent } from './components/features/features.component';
import { PricingComponent } from './components/pricing/pricing.component';

export const APP_ROUTES: Routes = [
  { path: '', component: LandingComponent },
  { path: 'features', component: FeaturesComponent },
  { path: 'pricing', component: PricingComponent },
  // Redirect any other hash to the landing page when not logged in
  { path: '**', redirectTo: '', pathMatch: 'full' } 
];
