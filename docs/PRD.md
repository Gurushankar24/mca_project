# PRD: Employee Management Dashboard with Wellbeing Scoring and ML Anomaly Detection

**Owner:** Gurushankar V (MCA Sem 3, SRM Online) | **Deadline:** 31 Oct 2026 | **Status:** Build phase

> Read this file first. Then read `SPEC.md` (how to build it), `TASKS.md` (what order) and `AGENT_RULES.md` (how to behave).

---

## 1. Overview

A web application for a company's HR team and managers to manage employees and to spot, early, which employees need attention. Beyond normal employee management (login, add/edit employees, assign employees to managers), the app adds two analytics features:

1. **Composite Wellbeing Score** (rule-based formula, NOT machine learning): one explainable score out of 100 per employee, with a breakdown showing which factors drag it down.
2. **Attendance Anomaly Detection** (machine learning): the Isolation Forest algorithm flags employees whose attendance, leave and overtime patterns are unusual compared with the rest of the organization, without any hand-picked threshold.

The system is a hybrid of transparent rule-based analytics and one lightweight unsupervised ML component. It must never be described as "AI-powered" as a whole.

## 2. Problem

- ERP/HR systems store attendance, leave, performance and overtime data but mostly use it for record keeping.
- HR and managers notice problems (burnout, disengagement, irregular attendance) late, often at resignation or review time.
- Fixed rules such as "more than 5 leaves = flag" are unfair, because normal behaviour differs between teams.

## 3. Goals and Non-Goals

### Goals
- G1: Let HR manage employees and assign multiple employees to a manager.
- G2: Give every employee an explainable wellbeing score (0 to 100) with a factor breakdown.
- G3: Detect unusual attendance/leave/overtime patterns with Isolation Forest and explain each flag.
- G4: Show results in a role-based dashboard (HR sees all, Manager sees own team, Employee sees self).
- G5: Evaluate anomaly detection against known injected anomalies and compare it with a z-score baseline.

### Non-Goals (do NOT build)
- Task allocation, skill matching, sentiment analysis, chatbot, attrition prediction.
- Payroll, recruitment, leave-approval workflows, notifications by email, file uploads.
- Real company data integration, multi-tenancy, deployment to cloud, mobile app.
- Learning the wellbeing weights with ML (listed as future scope only).

## 4. Users (Personas)

| Persona | Needs | Access |
|---|---|---|
| **HR** (Priya) | See everyone at a glance, find who needs attention, manage employees and teams | All employees, all scores, all anomalies, can add/edit/delete employees, assign teams |
| **Manager** (Arun) | Check the health of his own team and see who is behaving unusually | Only employees reporting to him: scores, anomalies, profiles (read only) |
| **Employee** (Kavya) | See her own profile and own wellbeing score | Only herself (profile + own score) |

## 5. User Stories and Functional Requirements

Priority: **P0** must have, **P1** should have, **P2** nice to have (cut first).

### Authentication and roles
- FR-1 (P0): A user can log in with email and password and receives a session token. Invalid credentials show a clear error.
- FR-2 (P0): The UI navigation and every API endpoint enforce the user's role (HR, Manager, Employee).
- FR-3 (P0): A user can log out; protected pages redirect to login when not authenticated.

### Employee management
- FR-4 (P0): HR can view a list of employees with search by name and filter by department.
- FR-5 (P0): HR can add and edit an employee (name, email, department, job title, join date, manager).
- FR-6 (P0): HR can assign **multiple employees to one manager at once** from a team assignment page.
- FR-7 (P0): Managers see only their direct reports in every list; employees see only themselves.
- FR-8 (P1): HR can deactivate (soft delete) an employee. Inactive employees are excluded from scores and anomalies.
- FR-9 (P0): Employee detail page shows profile, wellbeing score with breakdown, and recent attendance summary.

### Wellbeing score
- FR-10 (P0): The system computes a wellbeing score (0 to 100) per employee from attendance regularity, performance rating, workload (overtime) and leave pattern, using the formula in `SPEC.md`.
- FR-11 (P0): A wellbeing table lists employees with score, colour band (green 75+, amber 50 to 74, red below 50), department, and the weakest factor. Sortable and filterable by department and band.
- FR-12 (P0): The employee detail view shows a chart of the factor breakdown (value, weight, contribution) so HR sees WHY the score is what it is.
- FR-13 (P2): HR can adjust the four weights with sliders and see scores re-rank live (weights must sum to 1).

### Anomaly detection
- FR-14 (P0): The system computes six behavioural features per employee over a configurable window (default last 30 days) and sends them to a Python ML service running Isolation Forest.
- FR-15 (P0): An Alerts page lists flagged employees ranked by severity, each with a plain-language reason (for example "Average check-in delay is 4.2 standard deviations above the group").
- FR-16 (P1): The navigation shows a badge with the current count of flagged employees.
- FR-17 (P1): The employee detail page shows a trend chart of daily check-in delay and leave days over the last 60 days.
- FR-18 (P0): Managers see only anomalies in their own team; HR sees all; Employees cannot access anomalies.
- FR-19 (P0): The UI states clearly that a flag is a prompt for a conversation, not evidence of wrongdoing.

### Dashboard
- FR-20 (P1): A home dashboard shows: total employees, average wellbeing score, count per band (donut chart), number of anomalies, and the top 5 most anomalous employees.

### Data and evaluation
- FR-21 (P0): A seed command generates a repeatable synthetic dataset (about 45 employees, 120 days) with 5 deliberately injected anomalous employees whose labels are stored for evaluation only.
- FR-22 (P0): An evaluation command computes precision, recall and F1 for Isolation Forest and for a z-score baseline, and sweeps the `contamination` parameter (0.05, 0.10, 0.15). Results are printed and saved to `docs/evaluation_results.md`.

## 6. Non-Functional Requirements

- NFR-1: Runs locally with three commands (frontend, backend, ML service). No paid services, no cloud.
- NFR-2: Passwords hashed (bcrypt); JWT secret from environment variable; all SQL parameterized.
- NFR-3: Pages load in under 2 seconds on the seeded dataset; anomaly endpoint responds in under 3 seconds.
- NFR-4: Every list/page has loading, empty and error states.
- NFR-5: Explainability: every score and every flag must be traceable to inputs shown on screen.
- NFR-6: Code is readable enough that the student can explain every file in a viva (comment the Python and the formula code).
- NFR-7: Privacy: only synthetic data; no real personal data anywhere.

## 7. Success Metrics

- All P0 requirements work end to end in a live demo for all three roles.
- Isolation Forest recall on injected anomalies is at least 4 of 5 (80%) at default settings, with the evaluation table showing how it compares with the z-score baseline. (Report honestly whatever the numbers are; do not tune data to inflate results.)
- Demo script (5 minutes) runs without errors: login as HR, show dashboard, open an anomaly, show a wellbeing breakdown, assign a team, login as Manager and show the restricted view.

## 8. Assumptions

- A1: Working hours start at 09:00; a check-in more than 15 minutes after 09:00 counts as late.
- A2: Weekends are not working days; no public holidays modelled.
- A3: All employees (including managers) can be scored; the HR user's own record is excluded from analytics.
- A4: The synthetic data is a reasonable stand-in for real HR data; this limitation is stated in the report.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Only 3 days of build time | Strict scope; P2 items cut first; vertical slices in `TASKS.md` |
| AI agent adds features or drifts | `AGENT_RULES.md` scope guard; commit after each slice |
| Flask/Express integration trouble | Test Flask alone with sample JSON first; fallback in `TASKS.md` |
| Anomalies not detected cleanly | Inject clearly separated anomalies; report results honestly |
| Student does not know Python | Keep the ML service about 60 lines, heavily commented; AI must explain each line |

## 10. Demo and Viva Positioning (one-liner)

"The wellbeing score is a transparent formula; the anomaly detection is genuine unsupervised machine learning. I used ML for anomalies because a fixed threshold cannot adapt to different teams, while Isolation Forest learns what normal looks like from the data itself."

## 11. Glossary

- **Anomaly:** an employee whose behaviour is unusual compared with the rest of the organization.
- **Isolation Forest:** an unsupervised ML algorithm that builds many random trees; points isolated in fewer splits on average are anomalies.
- **Contamination:** the expected fraction of anomalies; controls how many employees get flagged.
- **Severity:** the anomaly score (higher = more unusual) used to rank flagged employees.
- **Window:** the number of recent days (default 30) used to compute features and scores.
- **Synthetic data:** artificially generated data modelled on realistic HR patterns.
