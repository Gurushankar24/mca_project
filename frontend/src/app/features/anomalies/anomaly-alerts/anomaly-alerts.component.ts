import { HttpErrorResponse } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AnomalyService } from '../../../core/anomaly.service';
import { AnomalyAlert } from '../../../core/models/anomaly.model';

@Component({
  selector: 'app-anomaly-alerts',
  standalone: true,
  imports: [DecimalPipe, MatButtonModule, MatFormFieldModule, MatProgressSpinnerModule, MatSelectModule],
  template: `
    <header class="heading">
      <p class="eyebrow">ATTENDANCE PATTERNS</p>
      <h1>Anomaly alerts</h1>
      <p class="subtitle">Unusual patterns ranked by how far they differ from the organization.</p>
    </header>

    <section class="disclaimer" role="note">
      <strong>For human review:</strong> A flag is a prompt for a conversation, not evidence of wrongdoing.
    </section>

    <section class="controls" aria-label="Anomaly detection settings">
      <mat-form-field appearance="outline">
        <mat-label>Analysis window</mat-label>
        <mat-select [value]="windowDays()" (selectionChange)="windowDays.set($event.value); load()">
          @for (days of windows; track days) { <mat-option [value]="days">{{ days }} days</mat-option> }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Expected anomaly fraction</mat-label>
        <mat-select [value]="contamination()" (selectionChange)="contamination.set($event.value); load()">
          @for (fraction of contaminations; track fraction) { <mat-option [value]="fraction">{{ fraction * 100 }}%</mat-option> }
        </mat-select>
      </mat-form-field>
    </section>

    @if (loading()) {
      <div class="state" role="status"><mat-spinner diameter="36" /><p>Analysing attendance patterns…</p></div>
    } @else if (unavailable()) {
      <div class="state error" role="alert">
        <h2>Anomaly detection is temporarily unavailable</h2>
        <p>{{ errorMessage() }}</p>
        <button mat-stroked-button type="button" (click)="load()">Try again</button>
      </div>
    } @else if (errorMessage()) {
      <div class="state error" role="alert"><h2>Alerts could not be loaded</h2><p>{{ errorMessage() }}</p><button mat-stroked-button type="button" (click)="load()">Try again</button></div>
    } @else if (alerts().length === 0) {
      <div class="state"><h2>No anomalies flagged</h2><p>No unusual patterns were found for the selected window.</p></div>
    } @else {
      <p class="summary">{{ alerts().length }} flagged of {{ totalAnalysed() }} analysed · Data through {{ asOfDate() }}</p>
      <section class="alerts" aria-label="Ranked anomaly alerts">
        @for (alert of alerts(); track alert.employee_id; let rank = $index) {
          <article class="alert-card">
            <div class="person">
              <span class="rank">{{ rank + 1 }}</span>
              <div><h2>{{ alert.name }}</h2><p>{{ alert.department }} · Employee #{{ alert.employee_id }}</p></div>
            </div>
            <div class="severity-label"><span>Severity</span><strong>{{ alert.severity | number:'1.2-2' }}</strong></div>
            <div class="severity-track" role="img" [attr.aria-label]="'Relative severity ' + severityPercent(alert) + ' percent'">
              <span class="severity-fill" [style.width.%]="severityPercent(alert)"></span>
            </div>
            @if (alert.reasons.length) {
              <ul class="reasons">@for (reason of alert.reasons; track reason.feature) { <li>{{ reason.text }}</li> }</ul>
            } @else { <p class="no-reasons">No individual feature exceeded the explanation threshold.</p> }
          </article>
        }
      </section>
    }
  `,
  styles: [`
    :host { display:block; color:#283a52; }
    .heading { margin-bottom:1.1rem; } h1 { margin:0; color:#172b4d; font-size:clamp(1.8rem,4vw,2.4rem); letter-spacing:-.04em; }
    .eyebrow { margin:0 0 .3rem; color:#52657f; font-size:.72rem; font-weight:700; letter-spacing:.12em; }
    .subtitle { margin:.45rem 0 0; color:#617087; }
    .disclaimer { margin:1.2rem 0; padding:.9rem 1rem; border-left:4px solid #b7791f; border-radius:8px; background:#fff8e7; color:#513d12; }
    .controls { display:flex; gap:1rem; align-items:center; flex-wrap:wrap; } .controls mat-form-field { width:220px; }
    .summary { color:#52657f; font-size:.9rem; } .alerts { display:grid; gap:1rem; }
    .alert-card { padding:1.1rem 1.25rem; border:1px solid #e1e7ef; border-radius:14px; background:#fff; box-shadow:0 8px 24px #1831530a; }
    .person { display:flex; align-items:center; gap:.8rem; } .person h2 { margin:0; font-size:1.1rem; } .person p { margin:.2rem 0 0; color:#617087; font-size:.88rem; }
    .rank { display:grid; place-items:center; width:2rem; height:2rem; border-radius:50%; background:#edf2f8; color:#304763; font-weight:700; }
    .severity-label { display:flex; justify-content:space-between; margin-top:1rem; font-size:.85rem; } .severity-track { height:9px; margin:.4rem 0 .85rem; overflow:hidden; border-radius:10px; background:#e8edf3; }
    .severity-fill { display:block; height:100%; border-radius:inherit; background:#b45309; } .reasons { margin:.4rem 0 0; padding-left:1.25rem; line-height:1.55; } .no-reasons { color:#617087; }
    .state { display:flex; min-height:220px; flex-direction:column; align-items:center; justify-content:center; gap:.6rem; padding:2rem; color:#53647d; text-align:center; }
    .state h2,.state p { margin:0; } .error h2 { color:#8a1f2a; }
    @media (max-width:600px) { .controls { display:grid; gap:0; } .controls mat-form-field { width:100%; } }
  `],
})
export class AnomalyAlertsComponent implements OnInit {
  private readonly api = inject(AnomalyService);
  readonly windows = [7, 14, 30, 60, 90];
  readonly contaminations = [0.05, 0.1, 0.15, 0.2, 0.3];
  readonly windowDays = signal(30);
  readonly contamination = signal(0.1);
  readonly alerts = signal<AnomalyAlert[]>([]);
  readonly totalAnalysed = signal(0);
  readonly asOfDate = signal('');
  readonly loading = signal(true);
  readonly unavailable = signal(false);
  readonly errorMessage = signal('');
  private readonly maxSeverity = computed(() => Math.max(0, ...this.alerts().map((item) => item.severity)));

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true); this.unavailable.set(false); this.errorMessage.set('');
    this.api.list(this.windowDays(), this.contamination()).subscribe({
      next: (result) => {
        this.alerts.set(result.anomalies); this.totalAnalysed.set(result.total_analysed);
        this.asOfDate.set(result.as_of_date); this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        const unavailable = error.status === 503 && error.error?.error?.code === 'ML_UNAVAILABLE';
        this.unavailable.set(unavailable);
        this.errorMessage.set(unavailable
          ? (error.error?.error?.message ?? 'Start the ML service and try again.')
          : 'The alerts could not be loaded. Check the connection and try again.');
        this.loading.set(false);
      },
    });
  }

  severityPercent(alert: AnomalyAlert): number {
    const maximum = this.maxSeverity();
    return maximum > 0 ? Math.max(6, Math.min(100, (alert.severity / maximum) * 100)) : 6;
  }
}
