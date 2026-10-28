# TASKS: Build Order (vertical slices)

Companion to `PRD.md`, `SPEC.md`, `AGENT_RULES.md`. Build in this order. Finish and verify one slice before starting the next. Commit after every slice.

**Calendar:** Day 1 = Wed 28 Oct (S0 to S3), Day 2 = Thu 29 Oct (S4 to S6), Day 3 = Fri 30 Oct (S7 to S9), Sat 31 Oct = report and submission buffer.

## Phase Overview

| Phase | Name | Slices | Day | Result |
|---|---|---|---|---|
| 1 | Foundation | S0, S1, S2 | Day 1 (Wed 28 Oct) | Three services running, seeded database, login with roles |
| 2 | Core Employee Management | S3 | Day 1 (Wed 28 Oct) | Add/edit employees, assign many employees to a manager |
| 3 | Wellbeing Score (rule-based) | S4 | Day 2 (Thu 29 Oct) | Scores, bands and breakdown charts |
| 4 | Anomaly Detection (ML) | S5, S6 | Day 2 to 3 (Thu 29 to Fri 30 Oct) | Flask Isolation Forest service and Alerts page |
| 5 | Dashboard and Evaluation | S7, S8 | Day 3 (Fri 30 Oct) | Home dashboard, precision/recall results |
| 6 | Polish and Submission | S9 | Day 3 to Sat 31 Oct | README, screenshots, demo rehearsal, report |

**If time runs short, cut in this order:** FR-13 weight sliders, FR-8 deactivate, FR-16 badge, FR-17 trend chart, FR-20 dashboard polish. Never cut: seed, wellbeing, anomaly detection, evaluation.

---

## START PROMPT (paste this first in a new AI session)

```
You are helping me build an MCA project. Read these files fully before doing anything:
docs/AGENT_RULES.md, docs/PRD.md, docs/SPEC.md, docs/TASKS.md.
Follow AGENT_RULES.md strictly. Do not add features outside the PRD. Work on ONE slice at a time.
Confirm you understood by summarizing the project in 5 lines and listing the slices.
Then wait for me to say which slice to start.
```

For each later session or after a long break, paste: "Re-read docs/AGENT_RULES.md and docs/SPEC.md sections relevant to slice <ID>, then do slice <ID> only."

---

## S0: Scaffold the three services (about 45 min)

**Goal:** three empty-but-running services in one repo.
**Do:**
- Create repo `mca-employee-dashboard` with folders per SPEC section 2. Put the four docs in `/docs`.
- `frontend/`: `ng new` (standalone, SCSS, routing), add Angular Material and `ng2-charts` + `chart.js`.
- `backend/`: TypeScript Express app with `tsx`, `cors`, `dotenv`, `better-sqlite3`, `jsonwebtoken`, `bcryptjs`; `GET /api/health` returns `{status:"ok"}`; `.env.example` as in SPEC.
- `ml-service/`: Flask app with `GET /health`; `requirements.txt` (flask, flask-cors, scikit-learn, pandas, numpy); README lines to create a venv and run.
- Root `README.md` with the 3 run commands.

**Done when:** `ng serve`, `npm run dev` (backend) and `python app.py` (ml-service) all start; the three health URLs respond.

**Prompt:**
```
Do slice S0 from docs/TASKS.md. Create the repo structure from docs/SPEC.md section 2 and the three running services. Show me the exact commands to run each one and how to verify the health endpoints.
```

---

## S1: Database and seeder (about 1.5 h)

**Goal:** schema + repeatable synthetic data with 5 injected anomalies.
**Do:** `db/schema.sql`, `db/connection.ts`, `scripts/seed.ts`, npm script `seed`. Follow SPEC sections 4, 5 and 11 exactly (seeded random, 45 employees, 120 days, 5 anomaly types in `ground_truth`, bcrypt users, printed demo logins).

**Done when:** `npm run seed` runs twice with identical output; it prints counts per table; `ground_truth` has exactly 5 rows in 5 different anomaly types; SQL query shows an injected employee with an obviously different pattern.

**Prompt:**
```
Do slice S1 from docs/TASKS.md. Implement schema.sql, connection.ts and scripts/seed.ts exactly per SPEC sections 4, 5 and 11. Use a seeded PRNG so output is repeatable. At the end print table counts, the 5 injected employees with their anomaly type, and the demo logins. Then give me 3 SQL queries to verify the data.
```

---

## S2: Authentication and role-based shell (about 2 h)

**Goal:** login works for all three roles; menu and routes respect roles.
**Do:**
- Backend: `POST /api/auth/login`, `GET /api/auth/me`, `middleware/auth.ts` (verify JWT), `middleware/roles.ts` (`requireRole`), `services/access.ts` (`getVisibleEmployeeIds`).
- Frontend: `AuthService` (signals), `authInterceptor`, `authGuard`, `roleGuard`, login page, shell layout with toolbar and role-filtered side nav, placeholder pages for each route.

**Done when:** you can log in as HR, a manager and an employee; the nav differs by role; opening a forbidden URL redirects; refreshing the page keeps you logged in; wrong password shows an error.

**Prompt:**
```
Do slice S2 from docs/TASKS.md per SPEC sections 9, 10 and 12. Implement backend auth (JWT, bcrypt, role middleware, getVisibleEmployeeIds) and the Angular login, AuthService with signals, functional interceptor and guards, and the role-filtered shell with placeholder pages. Tell me how to test each role.
```

---

## S3: Employee management and team assignment (about 3 h)

**Goal:** the "normal ERP" part, including assigning many employees to a manager.
**Do:**
- Backend: employees endpoints (list with search/department, get, create, update, soft delete), `GET /api/managers`, `POST /api/managers/:id/assign` (transaction), all scoped by `getVisibleEmployeeIds`.
- Frontend: employee list (search + department filter), employee form (reactive, validation, manager dropdown), basic employee detail (profile only for now), team assignment page (manager select, multi-select list, assign button).

**Done when:** HR can create, edit and list employees, assign 5 employees to a manager in one action; the manager login then shows exactly those employees; an employee login can only open their own page; API returns 403 for others' ids.

**Prompt:**
```
Do slice S3 from docs/TASKS.md per SPEC sections 9, 10 and 12. Build the employee endpoints, managers endpoint, bulk assign endpoint, and the Angular list, form, basic detail and team assignment pages with loading/empty/error states. Show me how to test the 403 cases with curl or Postman.
```

---

## S4: Features and Wellbeing Score (about 3 h)

**Goal:** the rule-based module, end to end.
**Do:**
- `services/features.ts` (SPEC section 6) and `services/wellbeing.ts` (SPEC section 7), `config.ts` constants.
- Endpoints `GET /api/wellbeing` and `GET /api/wellbeing/:employeeId`.
- Frontend: wellbeing table (sortable, department and band filters, band chip), and on the employee detail page the score, band, weakest-factor callout and a horizontal bar chart of the breakdown.

**Done when:** the worked example in SPEC section 7 reproduces exactly in a unit test; injected anomalous employees generally show lower scores; the breakdown contributions add up to the score (within rounding).

**Prompt:**
```
Do slice S4 from docs/TASKS.md. Implement features.ts and wellbeing.ts exactly per SPEC sections 6 and 7, the two endpoints, a small unit test that reproduces the worked example (attendance 0.9, performance 0.8, workload 0.5, leave 0.7 gives 74), and the Angular wellbeing table plus the breakdown chart on the detail page. Comment the formula code in plain English.
```

---

## S5: Flask ML service (about 1.5 h)

**Goal:** Isolation Forest service, tested alone before connecting anything.
**Do:** `ml-service/app.py` per SPEC section 8.2 and 8.3, plus `sample_request.json` with about 15 employees including 2 obvious outliers.

**Done when:** `curl -X POST http://localhost:5001/detect-anomalies -H "Content-Type: application/json" -d @sample_request.json` flags the 2 outliers and returns reasons; invalid input returns HTTP 400.

**Prompt:**
```
Do slice S5 from docs/TASKS.md. Write ml-service/app.py exactly per SPEC sections 8.2 and 8.3 and a sample_request.json with ~15 employees including 2 obvious outliers. Comment EVERY step in plain English because I do not know Python. After the code, explain line by line what fit_predict and decision_function do, and give me the curl test.
```

---

## S6: Anomaly API and Alerts page (about 3 h)

**Goal:** connect Express to Flask and show alerts.
**Do:**
- `services/anomaly.ts`: compute features for all analysed employees, POST to Flask, filter by visibility, build `reason text` (SPEC 8.4), sort by severity; handle Flask down with HTTP 503 `ML_UNAVAILABLE`.
- `GET /api/anomalies` and (P1) a count for the nav badge.
- Frontend: anomaly alerts page (ranked list, severity bar, reason texts, disclaimer, window/contamination controls, loading, empty and ML-unavailable states); nav badge (P1).

**Done when:** as HR you see about 4 to 6 flagged employees including most of the injected ones; as a manager you see only flagged members of your team; stopping Flask shows the friendly message instead of a crash.

**Fallback if Flask integration blocks you for more than 1 hour:** run the same Python file as a script that reads JSON from stdin and writes JSON to stdout, and call it from Express with `child_process.spawn`. Keep the same request and response shapes.

**Prompt:**
```
Do slice S6 from docs/TASKS.md per SPEC section 8. Implement services/anomaly.ts, GET /api/anomalies with role filtering and 503 handling, and the Angular alerts page with the disclaimer text, loading, empty and ML-unavailable states. Show me how to test the manager restriction.
```

---

## S7: Dashboard home (about 1.5 h, P1)

**Goal:** the demo landing page.
**Do:** `GET /api/dashboard/summary`; dashboard with number cards, donut chart of band counts, top 5 anomalies, quick links.

**Done when:** numbers match the wellbeing and anomaly pages; managers see only their team's numbers.

**Prompt:**
```
Do slice S7 from docs/TASKS.md per SPEC sections 9 and 12.3. Implement the summary endpoint (role-scoped) and the Angular dashboard with cards, a donut chart and the top 5 anomalies.
```

---

## S8: Evaluation script (about 1.5 h, P0)

**Goal:** the results section of the report.
**Do:** `scripts/evaluate.ts` per SPEC section 13; npm script `eval`; output saved to `docs/evaluation_results.md`.

**Done when:** running `npm run eval` prints precision, recall and F1 for Isolation Forest at contamination 0.05, 0.10, 0.15 and for the z-score baseline, and lists missed and falsely flagged employees.

**Prompt:**
```
Do slice S8 from docs/TASKS.md. Implement scripts/evaluate.ts per SPEC section 13 and write docs/evaluation_results.md with a results table and a short plain-language interpretation. Do not change the seed data to improve the numbers.
```

---

## S9: Polish, README and demo prep (about 2 h, P0)

**Do:**
- Consistent loading, empty and error states everywhere; fix console errors.
- README: what the project is, architecture diagram (text), setup, run commands, demo logins, how to run seed and eval.
- Take screenshots: login, dashboard, wellbeing table, employee breakdown, anomaly alerts, team assignment, evaluation table.
- Rehearse the 5-minute demo from PRD section 7.

**Prompt:**
```
Do slice S9 from docs/TASKS.md. Review the app for missing loading/empty/error states and console errors, fix them, then write README.md (overview, architecture, setup, run commands, demo logins, seed and eval commands). Do not add features.
```

---

## Optional (only if everything above is done)

- **FR-13 weight sliders:** `?w_attendance&w_performance&w_workload&w_leave` support on the wellbeing endpoint and a small slider panel.
- **FR-17 trend chart:** `GET /api/employees/:id/timeline` and a Chart.js line plus bar chart on the detail page.
- **FR-8 deactivate employee.**

## Slice review checklist (use after every slice)

- [ ] Does it match SPEC exactly (names, endpoints, shapes)?
- [ ] Did the AI add anything not in the PRD? If yes, remove it.
- [ ] Did I run it and test it myself (not just read the code)?
- [ ] Are role restrictions working (try HR, manager, employee)?
- [ ] Committed to git with a clear message?
