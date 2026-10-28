# AGENT RULES

Save a copy of this file as `GEMINI.md` (Gemini CLI), `.cursorrules` (Cursor) or `CLAUDE.md` (Claude Code) in the repo root so the tool loads it automatically. Also keep it in `docs/`.

You are a coding agent helping a student build an MCA project. Follow these rules in every session.

## 1. Read first
Before writing code, read `docs/PRD.md`, `docs/SPEC.md` and `docs/TASKS.md`. `SPEC.md` is the single source of truth for architecture, schema, formulas, endpoint names and response shapes. Use those names exactly.

## 2. About the student
- Experienced Angular developer (standalone components, Signals, RxJS, Angular Material). Do not explain basic Angular.
- Knows SQL and Postman. Does NOT know Python. Comment all Python code in plain English and, after writing it, explain it line by line.
- Must be able to explain every file in a viva. Prefer simple, readable code over clever code.

## 3. Scope guard (most important)
- Build only what is in `PRD.md`. The two analytics modules are the Wellbeing Score and Anomaly Detection. Nothing else.
- Do NOT add: task allocation, chatbot, sentiment analysis, attrition prediction, notifications, payroll, file uploads, extra roles, or extra pages.
- Do NOT add new libraries without asking. Allowed stack is listed in `SPEC.md` section 1.
- If you think something is missing or wrong in the spec, stop and ask. Do not silently change the spec.

## 4. How to work
- Work on ONE slice from `TASKS.md` at a time. Finish it, tell me how to verify it, and stop.
- At the start of a slice, list the files you will create or change.
- After the slice, give exact commands to run and test it (including curl or Postman examples for APIs).
- Keep changes small. Do not rewrite unrelated files. Do not reformat the whole codebase.
- Suggest a one-line git commit message at the end of each slice.
- If a command or test fails, show the error and fix the root cause. Do not hide errors or delete tests to make them pass.

## 5. Coding standards

**Angular:** standalone components only (no NgModules), Signals for state, `inject()` for DI, functional guards and interceptors, `loadComponent` lazy routes, typed models, reactive forms, Angular Material, Chart.js through `ng2-charts`. Every page has loading, empty and error states. Do not rely on colour alone to convey meaning.

**Backend (Node, Express, TypeScript):** routes stay thin, logic lives in `services/`. Use parameterized SQL only (`better-sqlite3` prepared statements). Hash passwords with bcrypt. JWT secret from environment. Return errors in the shape `{ "error": { "code", "message" } }` with correct status codes. Every employee-scoped endpoint must use `getVisibleEmployeeIds`.

**ML service (Python, Flask):** keep it small (about 60 lines), validate input, and comment every step. Use `IsolationForest(n_estimators=200, contamination=..., random_state=42)`.

**Data:** only synthetic data. `ground_truth` is used only by `seed.ts` and `evaluate.ts`; never expose it through the API or UI. Never modify the seed data to improve evaluation numbers.

## 6. Honesty rules (important for the viva)
- The Wellbeing Score is a rule-based formula. It is NOT machine learning. Never call it AI or ML in code comments, UI text or docs.
- Anomaly detection with Isolation Forest IS unsupervised machine learning.
- Anomaly flags are prompts for human review, not evidence of wrongdoing. Keep the disclaimer text in the UI.
- Report evaluation results exactly as they are.

## 7. Definition of done for a slice
- It matches `SPEC.md` (names, shapes, formulas).
- It runs without console errors.
- Role restrictions are verified for HR, manager and employee.
- I have been given the commands to test it and a commit message.
