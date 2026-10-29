import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../../shared/placeholder-page.component';

@Component({
  selector: 'app-team-assignment',
  standalone: true,
  imports: [PlaceholderPageComponent],
  template: '<app-placeholder-page title="Team assignment" description="HR team assignment tools will appear here." />',
})
export class TeamAssignmentComponent {}
