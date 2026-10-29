import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { AuthService } from '../../../core/auth.service';
import { EmployeeService } from '../../../core/employee.service';
import { Employee } from '../../../core/models/employee.model';
import { WellbeingResult } from '../../../core/models/wellbeing.model';
import { WellbeingService } from '../../../core/wellbeing.service';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [BaseChartDirective, CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, RouterLink],
  templateUrl: './employee-detail.component.html',
  styleUrl: './employee-detail.component.scss',
})
export class EmployeeDetailComponent implements OnInit {
  readonly factorRows = [
    { key: 'attendance', label: 'Attendance' },
    { key: 'performance', label: 'Performance' },
    { key: 'workload', label: 'Workload' },
    { key: 'leave', label: 'Leave' },
  ] as const;
  private readonly employeesApi = inject(EmployeeService);
  private readonly wellbeingApi = inject(WellbeingService);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);
  readonly employee = signal<Employee | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly wellbeing = signal<WellbeingResult | null>(null);
  readonly wellbeingLoading = signal(true);
  readonly wellbeingError = signal('');
  readonly chartData = signal<ChartConfiguration<'bar'>['data']>({ labels: [], datasets: [] });
  readonly chartOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const factor = this.factorRows[context.dataIndex];
            const details = this.wellbeing()?.breakdown[factor.key];
            return details
              ? `${factor.label}: value ${details.value.toFixed(2)}, weight ${(details.weight * 100).toFixed(0)}%, contribution ${details.contribution.toFixed(1)}`
              : '';
          },
        },
      },
    },
    scales: { x: { min: 0, max: 1, title: { display: true, text: 'Factor value (0 to 1)' } } },
  };

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
    this.wellbeing.set(null);
    this.wellbeingError.set('');
    this.employeesApi.get(id).subscribe({
      next: (employee) => { this.employee.set(employee); this.loading.set(false); },
      error: (response: { status?: number }) => {
        this.error.set(response.status === 403 ? 'You do not have access to this employee profile.' : 'The employee profile could not be loaded. Please try again.');
        this.loading.set(false);
      },
    });
    this.wellbeingLoading.set(true);
    this.wellbeingApi.get(id).subscribe({
      next: (result) => {
        this.wellbeing.set(result);
        this.chartData.set({
          labels: this.factorRows.map((factor) => factor.label),
          datasets: [{ label: 'Factor value', data: this.factorRows.map((factor) => result.breakdown[factor.key].value), backgroundColor: ['#3d75c5', '#6c65b6', '#bf842b', '#3b8a65'], borderRadius: 5 }],
        });
        this.wellbeingLoading.set(false);
      },
      error: () => { this.wellbeingError.set('The wellbeing score could not be loaded. Please try again.'); this.wellbeingLoading.set(false); },
    });
  }
}
