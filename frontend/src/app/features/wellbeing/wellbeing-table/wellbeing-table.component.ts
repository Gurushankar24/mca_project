import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../../shared/placeholder-page.component';

@Component({
  selector: 'app-wellbeing-table',
  standalone: true,
  imports: [PlaceholderPageComponent],
  template: '<app-placeholder-page title="Wellbeing" description="The wellbeing score table will appear here." />',
})
export class WellbeingTableComponent {}
