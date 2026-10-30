import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AnomalyResponse } from './models/anomaly.model';

@Injectable({ providedIn: 'root' })
export class AnomalyService {
  private readonly http = inject(HttpClient);

  list(window: number, contamination: number): Observable<AnomalyResponse> {
    const params = new HttpParams().set('window', window).set('contamination', contamination);
    return this.http.get<AnomalyResponse>('/api/anomalies', { params });
  }
}
