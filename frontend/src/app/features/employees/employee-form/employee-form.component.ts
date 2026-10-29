import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../../shared/placeholder-page.component';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [PlaceholderPageComponent],
  template: '<app-placeholder-page title="Employee form" description="Employee details can be managed here in the employee-management slice." />',
})
export class EmployeeFormComponent {}
