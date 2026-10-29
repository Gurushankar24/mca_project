import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './core/auth.service';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { ShellComponent } from './core/layout/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((module) => module.LoginComponent),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => {
      const user = inject(AuthService).currentUser();
      if (!user) {
        return '/login';
      }
      return user.role === 'employee' ? `/employees/${user.employee_id}` : '/dashboard';
    },
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        canActivate: [roleGuard(['hr', 'manager'])],
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (module) => module.DashboardComponent,
          ),
      },
      {
        path: 'employees',
        canActivate: [roleGuard(['hr', 'manager'])],
        loadComponent: () =>
          import('./features/employees/employee-list/employee-list.component').then(
            (module) => module.EmployeeListComponent,
          ),
      },
      {
        path: 'employees/new',
        canActivate: [roleGuard(['hr'])],
        loadComponent: () =>
          import('./features/employees/employee-form/employee-form.component').then(
            (module) => module.EmployeeFormComponent,
          ),
      },
      {
        path: 'employees/:id/edit',
        canActivate: [roleGuard(['hr'])],
        loadComponent: () =>
          import('./features/employees/employee-form/employee-form.component').then(
            (module) => module.EmployeeFormComponent,
          ),
      },
      {
        path: 'employees/:id',
        loadComponent: () =>
          import('./features/employees/employee-detail/employee-detail.component').then(
            (module) => module.EmployeeDetailComponent,
          ),
      },
      {
        path: 'team',
        canActivate: [roleGuard(['hr'])],
        loadComponent: () =>
          import('./features/team/team-assignment/team-assignment.component').then(
            (module) => module.TeamAssignmentComponent,
          ),
      },
      {
        path: 'wellbeing',
        canActivate: [roleGuard(['hr', 'manager'])],
        loadComponent: () =>
          import('./features/wellbeing/wellbeing-table/wellbeing-table.component').then(
            (module) => module.WellbeingTableComponent,
          ),
      },
      {
        path: 'anomalies',
        canActivate: [roleGuard(['hr', 'manager'])],
        loadComponent: () =>
          import('./features/anomalies/anomaly-alerts/anomaly-alerts.component').then(
            (module) => module.AnomalyAlertsComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '/login' },
];
