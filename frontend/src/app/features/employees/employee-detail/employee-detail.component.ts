import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth.service';
import { EmployeeService } from '../../../core/employee.service';
import { Employee } from '../../../core/models/employee.model';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, RouterLink],
  templateUrl: './employee-detail.component.html',
  styleUrl: './employee-detail.component.scss',
})
export class EmployeeDetailComponent implements OnInit {
  private readonly employeesApi = inject(EmployeeService);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);
  readonly employee = signal<Employee | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void { this.loadEmployee(); }

  loadEmployee(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id < 1) {
      this.error.set('This employee profile could not be found.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.employeesApi.get(id).subscribe({
      next: (employee) => { this.employee.set(employee); this.loading.set(false); },
      error: (response: { status?: number }) => {
        this.error.set(response.status === 403 ? 'You do not have access to this employee profile.' : 'The employee profile could not be loaded. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
