import { Routes } from '@angular/router';
import { MainComponent } from './components/main/main.component';
import { MapComponent } from './components/map/map.component';

export const routes: Routes = [
  { path: '', component: MainComponent  },
  { path: 'main', component: MainComponent },
  { path: 'map/:game', component: MapComponent },
  { path: '**', redirectTo: 'main' },
];
