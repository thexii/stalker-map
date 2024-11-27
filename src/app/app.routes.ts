import { Routes } from '@angular/router';
import { MainComponent } from './components/main/main.component';
import { MapComponent } from './components/map/map.component';
import { MapExportComponent } from './components/map-export/map-export.component';
import { MapContentComponent } from './components/map-content/map-content.component';
import { MapHocComponent } from './components/map-hoc/map-hoc.component';

export const routes: Routes = [
  { path: '', component: MainComponent  },
  { path: 'main', component: MainComponent },
  { path: 'map/hoc', component: MapHocComponent },
  { path: 'map/:game', component: MapComponent },
  { path: 'map/content/:game', component: MapContentComponent },
  { path: 'export/map/:game/:lang', component: MapExportComponent },
  { path: '**', redirectTo: 'main' },
];
