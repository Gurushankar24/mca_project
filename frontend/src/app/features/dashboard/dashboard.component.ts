import { DecimalPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/dashboard.service';
import { DashboardSummary } from '../../core/models/dashboard.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [BaseChartDirective, DecimalPipe, MatButtonModule, MatIconModule, MatProgressSpinnerModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(DashboardService);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly doughnutType: ChartConfiguration<'doughnut'>['type'] = 'doughnut';
  readonly doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' }, tooltip: { enabled: true } },
  };
  readonly chartData = signal<ChartData<'doughnut'>>({
    labels: ['Green band', 'Amber band', 'Red band'],
    datasets: [{ data: [0, 0, 0], backgroundColor: ['#2e7d32', '#f9a825', '#c62828'], borderWidth: 0 }],
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getSummary().subscribe({
      next: (result) => {
        this.summary.set(result);
        this.chartData.set({
          labels: ['Green band', 'Amber band', 'Red band'],
          datasets: [{ data: [result.band_counts.green, result.band_counts.amber, result.band_counts.red], backgroundColor: ['#2e7d32', '#f9a825', '#c62828'], borderWidth: 0 }],
        });
        this.loading.set(false);
      },
      error: () => {
        this.error.set('The dashboard could not be loaded. Check the connection and try again.');
        this.loading.set(false);
      },
    });
  }
}
