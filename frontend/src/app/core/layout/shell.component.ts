import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth.service';
import { UserRole } from '../models/user.model';

interface NavigationLink {
  label: string;
  path: string;
  roles: readonly UserRole[];
}

const navigationLinks: NavigationLink[] = [
  { label: 'Dashboard', path: '/dashboard', roles: ['hr', 'manager'] },
  { label: 'Employees', path: '/employees', roles: ['hr', 'manager'] },
  { label: 'Team assignment', path: '/team', roles: ['hr'] },
  { label: 'Wellbeing', path: '/wellbeing', roles: ['hr', 'manager'] },
  { label: 'Anomalies', path: '/anomalies', roles: ['hr', 'manager'] },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    MatButtonModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly navigation = computed(() => {
    const user = this.auth.currentUser();
    if (!user) {
      return [];
    }

    if (user.role === 'employee') {
      return [{ label: 'My profile', path: `/employees/${user.employee_id}` }];
    }

    return navigationLinks.filter((link) => link.roles.includes(user.role));
  });

  roleLabel(role: UserRole): string {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  userInitials(name: string): string {
    return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
