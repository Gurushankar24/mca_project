import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AssignmentResult, Employee, EmployeeInput, ManagerOption } from './models/employee.model';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);

  list(filters: { department?: string; search?: string } = {}): Observable<Employee[]> {
    let params = new HttpParams();
    if (filters.department) params = params.set('department', filters.department);
    if (filters.search) params = params.set('search', filters.search);
    return this.http.get<Employee[]>('/api/employees', { params });
  }

  get(id: number): Observable<Employee> {
    return this.http.get<Employee>(`/api/employees/${id}`);
  }

  create(input: EmployeeInput): Observable<Employee> {
    return this.http.post<Employee>('/api/employees', { ...input, role: 'employee' });
  }

  update(id: number, input: Partial<EmployeeInput>): Observable<Employee> {
    return this.http.put<Employee>(`/api/employees/${id}`, input);
  }

  managers(): Observable<ManagerOption[]> {
    return this.http.get<ManagerOption[]>('/api/managers');
  }

  assign(managerId: number, employeeIds: number[]): Observable<AssignmentResult> {
    return this.http.post<AssignmentResult>(`/api/managers/${managerId}/assign`, { employee_ids: employeeIds });
  }
}
