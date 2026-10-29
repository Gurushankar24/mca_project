import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../../core/auth.service';
import { EmployeeService } from '../../../core/employee.service';
import { EMPLOYEE_DEPARTMENTS, Employee } from '../../../core/models/employee.model';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule, MatTableModule, RouterLink],
  templateUrl: './employee-list.component.html',
  styleUrl: './employee-list.component.scss',
})
export class EmployeeListComponent implements OnInit {
  private readonly employeesApi = inject(EmployeeService);
  readonly auth = inject(AuthService);
  readonly departments = EMPLOYEE_DEPARTMENTS;
  readonly rows = signal<Employee[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly search = signal('');
  readonly department = signal('');
  readonly columns = ['name', 'department', 'job_title', 'manager_name', 'actions'];

  ngOnInit(): void { this.loadEmployees(); }

  loadEmployees(): void {
    this.loading.set(true);
    this.error.set('');
    this.employeesApi.list({ search: this.search(), department: this.department() }).subscribe({
      next: (rows) => { this.rows.set(rows); this.loading.set(false); },
      error: () => { this.error.set('Employees could not be loaded. Check the connection and try again.'); this.loading.set(false); },
    });
  }

  setSearch(value: string): void { this.search.set(value); this.loadEmployees(); }
  setDepartment(value: string): void { this.department.set(value); this.loadEmployees(); }
}
