import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { forkJoin } from 'rxjs';
import { EmployeeService } from '../../../core/employee.service';
import { EMPLOYEE_DEPARTMENTS, ManagerOption } from '../../../core/models/employee.model';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule, ReactiveFormsModule, RouterLink],
  templateUrl: './employee-form.component.html',
  styleUrl: './employee-form.component.scss',
})
export class EmployeeFormComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly employeesApi = inject(EmployeeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly departments = EMPLOYEE_DEPARTMENTS;
  readonly managers = signal<ManagerOption[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly isEdit = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    department: ['', Validators.required],
    job_title: ['', [Validators.required, Validators.maxLength(100)]],
    join_date: ['', Validators.required],
    manager_id: this.formBuilder.control<number | null>(null),
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit.set(Number.isInteger(id) && id > 0);
    if (this.isEdit()) {
      forkJoin({ managers: this.employeesApi.managers(), employee: this.employeesApi.get(id) }).subscribe({
        next: ({ managers, employee }) => {
          this.managers.set(managers);
          this.form.patchValue({
            name: employee.name,
            email: employee.email,
            department: employee.department,
            job_title: employee.job_title,
            join_date: employee.join_date,
            manager_id: employee.manager_id,
          });
          this.loading.set(false);
        },
        error: () => { this.error.set('Employee details could not be loaded. Check your access and try again.'); this.loading.set(false); },
      });
      return;
    }
    this.employeesApi.managers().subscribe({
      next: (managers) => { this.managers.set(managers); this.loading.set(false); },
      error: () => { this.error.set('Manager options could not be loaded. Please try again.'); this.loading.set(false); },
    });
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.saving.set(true);
    this.error.set('');
    const request = this.isEdit()
      ? this.employeesApi.update(id, value)
      : this.employeesApi.create({ ...value, manager_id: value.manager_id ?? null });
    request.subscribe({
      next: (employee) => void this.router.navigate(['/employees', employee.id]),
      error: (response: { error?: { error?: { message?: string } } }) => {
        this.error.set(response.error?.error?.message ?? 'The employee could not be saved. Please try again.');
        this.saving.set(false);
      },
    });
  }
}
