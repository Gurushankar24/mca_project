import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { EMPLOYEE_DEPARTMENTS } from '../../../core/models/employee.model';
import { WellbeingBand, WellbeingFactor, WellbeingResult } from '../../../core/models/wellbeing.model';
import { WellbeingService } from '../../../core/wellbeing.service';

@Component({
  selector: 'app-wellbeing-table',
  standalone: true,
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatProgressSpinnerModule, MatSelectModule, MatTableModule, RouterLink],
  templateUrl: './wellbeing-table.component.html',
  styleUrl: './wellbeing-table.component.scss',
})
export class WellbeingTableComponent implements OnInit {
  private readonly api = inject(WellbeingService);
  readonly departments = EMPLOYEE_DEPARTMENTS;
  readonly rows = signal<Array<Omit<WellbeingResult, 'breakdown'>>>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly department = signal('');
  readonly bandFilter = signal('');
  readonly sortKey = signal<'name' | 'department' | 'score' | 'band' | 'weakest_factor'>('name');
  readonly ascending = signal(true);
  readonly filteredRows = computed(() => {
    const filtered = this.rows().filter((row) => (!this.department() || row.department === this.department()) && (!this.bandFilter() || row.band === this.bandFilter()));
    const key = this.sortKey();
    return filtered.sort((a, b) => {
      const left = a[key]; const right = b[key];
      const order = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right));
      return this.ascending() ? order : -order;
    });
  });

  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading.set(true); this.error.set('');
    this.api.list().subscribe({
      next: (rows) => { this.rows.set(rows); this.loading.set(false); },
      error: () => { this.error.set('Wellbeing scores could not be loaded. Check the connection and try again.'); this.loading.set(false); },
    });
  }
  sortBy(key: 'name' | 'department' | 'score' | 'band' | 'weakest_factor'): void {
    if (this.sortKey() === key) this.ascending.update((value) => !value);
    else { this.sortKey.set(key); this.ascending.set(true); }
  }
  bandLabel(band: WellbeingBand): string { return `${band.charAt(0).toUpperCase()}${band.slice(1)} band`; }
  factorLabel(factor: WellbeingFactor): string { return factor.charAt(0).toUpperCase() + factor.slice(1); }
}
