export type UserRole = 'hr' | 'manager' | 'employee';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  employee_id: number;
  name: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}
