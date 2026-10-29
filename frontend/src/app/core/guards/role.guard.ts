import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { UserRole } from '../models/user.model';

export function roleGuard(allowedRoles: readonly UserRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.currentUser();

    if (!user) {
      return router.parseUrl('/login');
    }

    if (allowedRoles.includes(user.role)) {
      return true;
    }

    return router.parseUrl(
      user.role === 'employee' ? `/employees/${user.employee_id}` : '/dashboard',
    );
  };
}
