import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../../shared/placeholder-page.component';

@Component({
  selector: 'app-anomaly-alerts',
  standalone: true,
  imports: [PlaceholderPageComponent],
  template: '<app-placeholder-page title="Anomaly alerts" description="Attendance anomaly alerts will appear here." />',
})
export class AnomalyAlertsComponent {}
