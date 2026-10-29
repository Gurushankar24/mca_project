# SPEC: Technical Specification

Companion to `PRD.md`. This file is the single source of truth for architecture, data, formulas, API and UI. If something here conflicts with your assumptions, follow this file, and ask before changing it.

---

## 1. Stack

| Layer | Choice |
|---|---|
| Frontend | Angular (latest stable via `ng new`), standalone components, Signals, functional guards and interceptors, Angular Material, Chart.js via `ng2-charts` |
| Backend | Node.js 20+, Express, TypeScript, run with `tsx` |
| Database | SQLite via `better-sqlite3` (one file, zero setup, relational, portable to PostgreSQL later) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs`, roles: `hr`, `manager`, `employee` |
| ML service | Python 3.10+, Flask, scikit-learn, pandas, numpy |
| Ports | Frontend 4200, Backend 3000, ML service 5001 |

## 2. Repository Structure

```
mca-employee-dashboard/
  docs/                    PRD.md, SPEC.md, TASKS.md, AGENT_RULES.md, evaluation_results.md
  frontend/                Angular app
    src/app/
      core/                auth.service.ts, guards/, interceptors/, models/, api services
      features/
        auth/login/
        dashboard/
        employees/         employee-list, employee-form, employee-detail
        team/              team-assignment
        wellbeing/         wellbeing-table
        anomalies/         anomaly-alerts
      shared/              band-chip, department-filter, empty-state, loading
  backend/
    src/
      index.ts             app bootstrap
      config.ts            env + constants (thresholds, weights, window)
      db/                  schema.sql, connection.ts
      middleware/          auth.ts (verifyToken), roles.ts (requireRole)
      routes/              auth, employees, wellbeing, anomalies, dashboard
      services/            features.ts, wellbeing.ts, anomaly.ts, access.ts
      scripts/             seed.ts, evaluate.ts
    .env.example
  ml-service/
    app.py                 Flask + Isolation Forest
    requirements.txt
    sample_request.json
  README.md
```

## 3. Environment (`backend/.env.example`)

```
PORT=3000
JWT_SECRET=change-me
JWT_EXPIRES_IN=8h
DB_PATH=./data/app.db
ML_SERVICE_URL=http://localhost:5001
DEFAULT_WINDOW_DAYS=30
DEFAULT_CONTAMINATION=0.1
```

## 4. Database Schema (SQLite)

```sql
CREATE TABLE employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,          -- Engineering | Sales | Support | Operations | HR
  job_title TEXT NOT NULL,
  manager_id INTEGER REFERENCES employees(id),   -- NULL for HR person and managers
  join_date TEXT NOT NULL,           -- YYYY-MM-DD
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('hr','manager','employee')),
  employee_id INTEGER NOT NULL REFERENCES employees(id)
);

CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  date TEXT NOT NULL,                -- YYYY-MM-DD (weekdays only)
  check_in TEXT,                     -- HH:MM, NULL if absent or leave
  check_out TEXT,
  status TEXT NOT NULL CHECK (status IN ('present','late','absent','leave')),
  overtime_hours REAL NOT NULL DEFAULT 0,
  UNIQUE (employee_id, date)
);
CREATE INDEX idx_attendance_emp_date ON attendance(employee_id, date);

CREATE TABLE leaves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sick','casual','unpaid')),
  approved INTEGER NOT NULL DEFAULT 1,
  UNIQUE (employee_id, date)
);

CREATE TABLE ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  quarter TEXT NOT NULL,             -- e.g. Q2-2026
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  UNIQUE (employee_id, quarter)
);

-- Used ONLY by seed.ts and evaluate.ts. Never exposed through the API or UI.
CREATE TABLE ground_truth (
  employee_id INTEGER PRIMARY KEY REFERENCES employees(id),
  anomaly_type TEXT NOT NULL
);
```

Note: overtime is stored per day in `attendance.overtime_hours` (simpler windowing than a monthly table). A day with an approved leave has an `attendance` row with `status='leave'` AND a row in `leaves`.

## 5. Business Rules

- Work starts at **09:00**. `delay_minutes = check_in - 09:00` (negative if early).
- `status = 'late'` if `delay_minutes > 15`, else `'present'`.
- Window: the last N days (default 30) ending at `asOfDate = MAX(attendance.date)`, inclusive. Use this instead of "today" so demos still work later.
- Only active employees (`is_active = 1`) are scored. The HR user's own record is excluded from analytics.

## 6. Feature Computation (shared by wellbeing and anomaly code)

Implement once in `backend/src/services/features.ts` and reuse everywhere.

For each employee over the window:

| Feature | Definition |
|---|---|
| `working_days` | attendance rows with status != 'leave' |
| `avg_checkin_delay` | mean `delay_minutes` over rows with a check_in (can be negative) |
| `late_count` | rows with status = 'late' |
| `leaves_taken` | approved rows in `leaves` within window |
| `weekend_adjacent_leaves` | leaves falling on Monday or Friday |
| `overtime_hrs` | sum of `overtime_hours` in window |
| `absent_days` | rows with status = 'absent' |

Return `{ employee_id, ...features }`. Round to 2 decimals.

## 7. Wellbeing Score

Computed on demand in `backend/src/services/wellbeing.ts`. All components are in [0, 1], higher is better.

```
attendance  = (present_days + 0.5 * late_days) / working_days        (0 if working_days = 0)
              where present_days = status 'present', late_days = status 'late'
performance = latest_rating / 5
              + 0.05 if latest_rating > previous_rating
              - 0.05 if latest_rating < previous_rating
              clamped to [0, 1]   (if only one rating, no adjustment)
workload    = 1 - min(overtime_hrs / 40, 1)
leave       = 1 - min(abs(leaves_taken - dept_avg_leaves) / 5, 1)
              where dept_avg_leaves = mean leaves_taken of active employees in the same department (same window)

score = round(100 * (0.30*attendance + 0.30*performance + 0.25*workload + 0.15*leave))
band  = 'green' if score >= 75, 'amber' if score >= 50, else 'red'
weakest_factor = the component with the lowest value
```

Weights live in `config.ts` as `WELLBEING_WEIGHTS = { attendance: 0.30, performance: 0.30, workload: 0.25, leave: 0.15 }`. The optional FR-13 passes custom weights via query string `?w_attendance=..&w_performance=..&w_workload=..&w_leave=..` and the server rejects them unless they sum to 1 (tolerance 0.001).

Worked example: attendance 0.9, performance 0.8, workload 0.5, leave 0.7 gives 100 x (0.27 + 0.24 + 0.125 + 0.105) = 74 (amber).

Response shape:

```json
{
  "employee_id": 12, "name": "Asha K", "department": "Sales",
  "score": 74, "band": "amber", "weakest_factor": "workload",
  "as_of_date": "2026-10-27", "window_days": 30,
  "breakdown": {
    "attendance":  { "value": 0.90, "weight": 0.30, "contribution": 27.0 },
    "performance": { "value": 0.80, "weight": 0.30, "contribution": 24.0 },
    "workload":    { "value": 0.50, "weight": 0.25, "contribution": 12.5 },
    "leave":       { "value": 0.70, "weight": 0.15, "contribution": 10.5 }
  }
}
```

## 8. Anomaly Detection

### 8.1 Flow
`GET /api/anomalies`: Express computes features for **all active analysed employees** (the model needs the whole organization to know what "normal" looks like, even when the caller is a manager), sends them to Flask, receives the results, and only then filters the output down to the employees the caller is allowed to see.

### 8.2 Flask contract

`POST http://localhost:5001/detect-anomalies`

Request:
```json
{
  "contamination": 0.1,
  "employees": [
    { "employee_id": 1, "avg_checkin_delay": 3.2, "late_count": 1, "leaves_taken": 2,
      "weekend_adjacent_leaves": 0, "overtime_hrs": 6.5, "absent_days": 0 }
  ]
}
```

Response:
```json
{
  "results": [
    { "employee_id": 1, "is_anomaly": false, "severity": -0.08, "reasons": [] },
    { "employee_id": 9, "is_anomaly": true, "severity": 0.21,
      "reasons": [
        { "feature": "avg_checkin_delay", "value": 52.4, "group_mean": 3.1, "z_score": 4.7 },
        { "feature": "late_count", "value": 17, "group_mean": 1.8, "z_score": 4.1 }
      ] }
  ]
}
```

`GET /health` returns `{ "status": "ok" }`.

### 8.3 Model details (ml-service/app.py)
- Features (in this order): `avg_checkin_delay, late_count, leaves_taken, weekend_adjacent_leaves, overtime_hrs, absent_days`.
- `IsolationForest(n_estimators=200, contamination=<request value>, random_state=42)`; call `fit_predict`.
- `severity = -decision_function(X)` (higher means more anomalous).
- `is_anomaly = (label == -1)`.
- `reasons`: for anomalies only, compute each feature's z-score against the group (population mean and std; skip features with std 0), keep the top 2 with z > 1.5.
- Validation: at least 10 employees; `0.01 <= contamination <= 0.3`; else HTTP 400 with `{ "error": "..." }`.
- Comment the file heavily in plain English: the student does not know Python and must explain it.

### 8.4 Express response (`GET /api/anomalies?window=30&contamination=0.1`)

Only flagged employees the caller may see, sorted by severity descending:

```json
{
  "as_of_date": "2026-10-27", "window_days": 30, "contamination": 0.1,
  "total_analysed": 45,
  "anomalies": [
    { "employee_id": 9, "name": "Ravi S", "department": "Support", "severity": 0.21,
      "reasons": [ { "feature": "avg_checkin_delay", "text": "Average check-in delay is 4.7 standard deviations above the group (52 min vs 3 min average)" } ] }
  ]
}
```

Reason text mapping (feature -> label): avg_checkin_delay "Average check-in delay", late_count "Late arrivals", leaves_taken "Leaves taken", weekend_adjacent_leaves "Monday/Friday leaves", overtime_hrs "Overtime hours", absent_days "Absent days".

If Flask is unreachable, return HTTP 503 `{ "error": { "code": "ML_UNAVAILABLE", "message": "..." } }` and have the UI show a friendly message.

## 9. REST API (all JSON, prefix `/api`, JWT in `Authorization: Bearer <token>`)

Errors: `{ "error": { "code": "STRING", "message": "Human readable" } }` with proper status codes (400, 401, 403, 404, 503).

| Method and path | Roles | Purpose |
|---|---|---|
| POST `/auth/login` | public | body `{email,password}` returns `{token,user:{id,email,role,employee_id,name}}` |
| GET `/auth/me` | any | current user |
| GET `/employees?department=&search=` | hr, manager | visible employees (manager: own team) |
| GET `/employees/:id` | hr, manager (own team), employee (self) | profile + manager name |
| POST `/employees` | hr | create employee (also creates a user, default password `Pass@123`, role from body `role`) |
| PUT `/employees/:id` | hr | update fields incl. `manager_id` |
| DELETE `/employees/:id` | hr | soft delete (`is_active = 0`) |
| GET `/managers` | hr | employees who have role manager (for dropdowns) |
| POST `/managers/:id/assign` | hr | body `{employee_ids:[...]}` sets `manager_id` for all in one transaction |
| GET `/employees/:id/timeline?days=60` | same as profile | daily `{date, delay_minutes, status, overtime_hours}` for trend chart |
| GET `/wellbeing?window=30` | hr, manager | wellbeing list for visible employees (no breakdown) |
| GET `/wellbeing/:employeeId?window=30` | same as profile | full response with breakdown |
| GET `/anomalies?window=30&contamination=0.1` | hr, manager | see 8.4 |
| GET `/dashboard/summary` | hr, manager | `{total_employees, avg_score, band_counts:{green,amber,red}, anomaly_count, top_anomalies:[...5]}` |

## 10. Access Control Matrix

Implement a single helper `getVisibleEmployeeIds(user)` in `services/access.ts`:
- `hr`: all active employees.
- `manager`: employees whose `manager_id` = the manager's own employee id (plus the manager himself for own profile).
- `employee`: only own employee id.

Every route that returns employee-scoped data must go through this helper. Return 403 when the requested id is not visible.

## 11. Seed Data Specification (`backend/src/scripts/seed.ts`, command `npm run seed`)

Use a **seeded pseudo-random generator** (for example a small mulberry32 function with a fixed seed 2026) so results are repeatable. The script drops and recreates all data.

**People (45 employees):**
- 1 HR person (department HR, manager_id NULL).
- 4 managers, one per department: Engineering, Sales, Support, Operations (manager_id NULL).
- 40 employees, 10 per department, `manager_id` = their department's manager.
- Use realistic Indian names, emails like `firstname.lastname@company.test`, varied join dates.

**Users:** every employee gets a user, password `Pass@123` (bcrypt). Roles: HR person `hr`, the 4 managers `manager`, the rest `employee`. Print a table of demo logins at the end (at least `hr@company.test`, one manager, one employee; make those three emails explicit and predictable).

**Time range:** the last 120 calendar days, weekdays only, ending today.

**Normal behaviour (most employees):**
- check-in delay in minutes: normal distribution mean -5, sd 10, clamped to [-25, 40]; about 8% of days are late-ish by chance. Status 'late' when delay > 15.
- check-out about 8.5 hours after check-in plus overtime plus small noise.
- overtime: about 20% of days have 0.5 to 2.5 hours.
- leaves: 0 to 2 per 30 days (types mixed); Sales department averages 2 to 4 per 30 days (so department differences exist).
- absent (unplanned): 1% of days.
- ratings for the last two quarters (e.g. Q2-2026 and Q3-2026): mostly 3 to 5.

**Injected anomalies (exactly 5, all among the 40 non-manager employees, spread across the 4 departments, with exactly one department holding two; all patterns active within the LAST 45 days only), stored in `ground_truth`:**

| Type | Pattern |
|---|---|
| `chronic_late` | on about 70% of days check-in delay is 30 to 120 minutes (average delay roughly 45 to 55) |
| `leave_spike` | 8 to 10 leaves in the last 30 days |
| `extreme_overtime` | about 75% of days have 2 to 3.5 hours overtime (45+ hours in the last 30 days) |
| `weekend_leaves` | 5 to 6 leaves in the last 30 days, all on Mondays or Fridays |
| `mixed` | average delay 25 to 40 minutes, 3 to 4 absent days, 4 to 5 leaves |

Anomalous employees also get lower ratings (1 to 3). At the end the script prints counts per table and the 5 injected employees.

## 12. Frontend

### 12.1 Routes (lazy, `loadComponent`)

| Path | Component | Guard |
|---|---|---|
| `/login` | LoginComponent | public |
| `/dashboard` | DashboardComponent | auth, roles hr+manager |
| `/employees` | EmployeeListComponent | auth, roles hr+manager |
| `/employees/new` | EmployeeFormComponent | hr |
| `/employees/:id/edit` | EmployeeFormComponent | hr |
| `/employees/:id` | EmployeeDetailComponent | auth (visibility enforced by API) |
| `/team` | TeamAssignmentComponent | hr |
| `/wellbeing` | WellbeingTableComponent | hr+manager |
| `/anomalies` | AnomalyAlertsComponent | hr+manager |
| `/` | redirect to `/dashboard` (hr, manager) or `/employees/<self>` (employee) | |

### 12.2 Core
- `AuthService`: signals `currentUser`, `token`, `isLoggedIn`, `role`; stores token in `localStorage`; methods `login`, `logout`, `restoreSession`.
- `authInterceptor` (functional): adds the Bearer token; on 401 logs out and redirects to `/login`.
- `authGuard`, `roleGuard(['hr','manager'])` (functional).
- API services: `EmployeeService`, `WellbeingService`, `AnomalyService`, `DashboardService`; typed models in `core/models`.
- Shell layout: top toolbar with app name, user name, role chip, logout; side navigation filtered by role; the Anomalies link shows a badge with the flagged count (P1).

### 12.3 Screens
- **Login:** email, password, error message, demo-credentials hint.
- **Dashboard:** number cards (total employees, average score, anomalies), donut chart of band counts, top 5 anomalies list, link buttons.
- **Employee list:** table (name, department, title, manager, wellbeing band chip), search box, `department-filter`, "Add employee" button for HR.
- **Employee form:** reactive form with validation; manager dropdown from `/managers`.
- **Team assignment (HR):** choose a manager, multi-select employees (checkbox list with search), "Assign selected" button, success snackbar.
- **Employee detail:** profile card; wellbeing score ring/number with band; horizontal bar chart of the breakdown (value per factor with weight shown); weakest-factor callout; trend chart (line: daily check-in delay, bars: leave days) over 60 days (P1).
- **Wellbeing table:** sortable columns (name, department, score, band, weakest factor), band chip, department and band filters; row click opens detail.
- **Anomaly alerts:** cards or table ranked by severity; each shows name, department, severity bar, reason texts; disclaimer text: "A flag is a prompt for a conversation, not evidence of wrongdoing."; window and contamination selectors (small, advanced section); loading and ML-unavailable states.
- All screens: loading spinner, empty state, error state.

### 12.4 Visual style
Angular Material, clean and professional. Band colours: green `#2e7d32`, amber `#f9a825`, red `#c62828`. Do not use colour alone to convey meaning (always show the number or label).

## 13. Evaluation Specification (`backend/src/scripts/evaluate.ts`, command `npm run eval`)

1. Compute features for all analysed employees (same function as the API).
2. Load `ground_truth` (5 positives among 45 employees).
3. **Isolation Forest:** for contamination in 0.05, 0.10, 0.15, call the Flask service and record flagged ids.
4. **Z-score baseline:** compute population mean and std per feature across employees; flag an employee if ANY feature has `z > 2.0`.
5. For each method compute true positives, false positives, false negatives, precision, recall, F1.
6. Print a table to the console and write `docs/evaluation_results.md` with the table, a one-paragraph plain-language interpretation, and the list of missed and falsely flagged employee names.
7. Do not change the seed data to make results look better.

## 14. Demo Credentials (printed by seed)

`hr@company.test`, one manager and one employee account, all with password `Pass@123`.
