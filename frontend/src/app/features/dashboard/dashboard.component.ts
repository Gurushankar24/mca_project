import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../shared/placeholder-page.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [PlaceholderPageComponent],
  template: '<app-placeholder-page title="Dashboard" description="Your role-based dashboard will appear here." />',
})
export class DashboardComponent {}
