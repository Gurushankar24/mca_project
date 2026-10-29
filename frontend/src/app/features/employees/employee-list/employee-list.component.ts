import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../../shared/placeholder-page.component';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [PlaceholderPageComponent],
  template: '<app-placeholder-page title="Employees" description="The employee directory will appear here." />',
})
export class EmployeeListComponent {}
