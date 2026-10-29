import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { EmployeeService } from '../../../core/employee.service';
import { Employee, ManagerOption } from '../../../core/models/employee.model';

@Component({
  selector: 'app-team-assignment',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule, MatSnackBarModule],
  templateUrl: './team-assignment.component.html',
  styleUrl: './team-assignment.component.scss',
})
export class TeamAssignmentComponent implements OnInit {
  private readonly employeesApi = inject(EmployeeService);
  private readonly snackBar = inject(MatSnackBar);
  readonly managers = signal<ManagerOption[]>([]);
  readonly employees = signal<Employee[]>([]);
  readonly selectedManagerId = signal<number | null>(null);
  readonly selectedIds = signal<number[]>([]);
  readonly search = signal('');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');

  readonly visibleEmployees = () => {
    const query = this.search().trim().toLocaleLowerCase();
    const managerIds = new Set(this.managers().map((manager) => manager.id));
    return this.employees().filter((employee) =>
      !managerIds.has(employee.id) && employee.department !== 'HR' &&
      (!query || employee.name.toLocaleLowerCase().includes(query) || employee.email.toLocaleLowerCase().includes(query)),
    );
  };

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({ managers: this.employeesApi.managers(), employees: this.employeesApi.list() }).subscribe({
      next: ({ managers, employees }) => {
        this.managers.set(managers);
        this.employees.set(employees);
        this.selectedManagerId.set(managers[0]?.id ?? null);
        this.loading.set(false);
      },
      error: () => { this.error.set('Team assignment data could not be loaded. Please try again.'); this.loading.set(false); },
    });
  }

  toggleEmployee(id: number, selected: boolean): void {
    this.selectedIds.update((ids) => selected ? [...new Set([...ids, id])] : ids.filter((item) => item !== id));
  }

  isSelected(id: number): boolean { return this.selectedIds().includes(id); }

  assign(): void {
    const managerId = this.selectedManagerId();
    const employeeIds = this.selectedIds();
    if (managerId === null || employeeIds.length === 0) return;
    this.saving.set(true);
    this.error.set('');
    this.employeesApi.assign(managerId, employeeIds).subscribe({
      next: () => {
        const managerName = this.managers().find((manager) => manager.id === managerId)?.name ?? null;
        this.employees.update((rows) => rows.map((employee) => employeeIds.includes(employee.id)
          ? { ...employee, manager_id: managerId, manager_name: managerName }
          : employee));
        this.selectedIds.set([]);
        this.saving.set(false);
        this.snackBar.open(`${employeeIds.length} employee${employeeIds.length === 1 ? '' : 's'} assigned successfully.`, 'Dismiss', { duration: 4000 });
      },
      error: (response: { error?: { error?: { message?: string } } }) => {
        this.error.set(response.error?.error?.message ?? 'Employees could not be assigned. Please try again.');
        this.saving.set(false);
      },
    });
  }
}
