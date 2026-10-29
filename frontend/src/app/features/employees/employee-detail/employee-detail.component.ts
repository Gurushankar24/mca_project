import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../../shared/placeholder-page.component';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [PlaceholderPageComponent],
  template: '<app-placeholder-page title="Employee profile" description="The selected employee profile will appear here." />',
})
export class EmployeeDetailComponent {}
