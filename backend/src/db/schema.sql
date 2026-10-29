PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  job_title TEXT NOT NULL,
  manager_id INTEGER REFERENCES employees(id),
  join_date TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('hr', 'manager', 'employee')),
  employee_id INTEGER NOT NULL REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  date TEXT NOT NULL,
  check_in TEXT,
  check_out TEXT,
  status TEXT NOT NULL CHECK (status IN ('present', 'late', 'absent', 'leave')),
  overtime_hours REAL NOT NULL DEFAULT 0,
  UNIQUE (employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance(employee_id, date);

CREATE TABLE IF NOT EXISTS leaves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sick', 'casual', 'unpaid')),
  approved INTEGER NOT NULL DEFAULT 1,
  UNIQUE (employee_id, date)
);

CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  quarter TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  UNIQUE (employee_id, quarter)
);

-- This table is for the seed and evaluation scripts only; APIs must never expose it.
CREATE TABLE IF NOT EXISTS ground_truth (
  employee_id INTEGER PRIMARY KEY REFERENCES employees(id),
  anomaly_type TEXT NOT NULL
);
