import { Routes } from '@angular/router';
import { MainComponent } from './components/main/main.component';
import { MapComponent } from './components/map/map.component';
import { MapExportComponent } from './components/map-export/map-export.component';

export const routes: Routes = [
  { path: '', component: MainComponent  },
  { path: 'main', component: MainComponent },
  { path: 'map/:game', component: MapComponent },
  { path: 'export/map/:game/:lang', component: MapExportComponent },
  { path: '**', redirectTo: 'main' },
];
