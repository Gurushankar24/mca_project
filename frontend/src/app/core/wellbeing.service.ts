import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { WellbeingResult } from './models/wellbeing.model';

@Injectable({ providedIn: 'root' })
export class WellbeingService {
  private readonly http = inject(HttpClient);

  list(window = 30): Observable<Array<Omit<WellbeingResult, 'breakdown'>>> {
    return this.http.get<Array<Omit<WellbeingResult, 'breakdown'>>>('/api/wellbeing', { params: new HttpParams().set('window', window) });
  }

  get(employeeId: number, window = 30): Observable<WellbeingResult> {
    return this.http.get<WellbeingResult>(`/api/wellbeing/${employeeId}`, { params: new HttpParams().set('window', window) });
  }
}
