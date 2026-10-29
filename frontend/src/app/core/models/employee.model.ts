export const EMPLOYEE_DEPARTMENTS = ['Engineering', 'Sales', 'Support', 'Operations', 'HR'] as const;

export interface Employee {
  id: number;
  name: string;
  email: string;
  department: string;
  job_title: string;
  manager_id: number | null;
  manager_name: string | null;
  join_date: string;
  is_active: number;
}

export interface EmployeeInput {
  name: string;
  email: string;
  department: string;
  job_title: string;
  join_date: string;
  manager_id: number | null;
}

export interface ManagerOption {
  id: number;
  name: string;
  email: string;
  department: string;
  job_title: string;
}

export interface AssignmentResult {
  manager_id: number;
  employee_ids: number[];
}
