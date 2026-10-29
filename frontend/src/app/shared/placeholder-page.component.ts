import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-placeholder-page',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <section class="page" aria-labelledby="page-title">
      <mat-card>
        <mat-card-content>
          <p class="eyebrow">Project section</p>
          <h1 id="page-title">{{ title() }}</h1>
          <p>{{ description() }}</p>
          <p class="placeholder-note">This page will be completed in its assigned project slice.</p>
        </mat-card-content>
      </mat-card>
    </section>
  `,
  styles: `
    .page { max-width: 52rem; margin: 0 auto; }
    .eyebrow { color: #455a64; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
    h1 { margin: 0.25rem 0 0.75rem; }
    .placeholder-note { margin-top: 1.5rem; }
  `,
})
export class PlaceholderPageComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
