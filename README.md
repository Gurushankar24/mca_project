# Employee Management Dashboard

An MCA project for role based employee management, a transparent rule based Wellbeing Score, and unsupervised Isolation Forest anomaly detection. The anomaly flags are prompts for human review, not evidence of wrongdoing. The app uses synthetic data only.

## Architecture

```text
Browser (Angular :4200)
  ├── REST/JSON + JWT ──> Express + TypeScript (:3000)
  │                        ├── SQLite (backend/data/app.db)
  │                        └── REST/JSON ──> Flask + scikit-learn (:5001)
  └── Angular Material + Chart.js
```

Express owns authentication, role checks, employee access, wellbeing calculations, and dashboard aggregation. It sends organization level attendance features to Flask for anomaly detection, then scopes the response to the signed in user's role. SQLite stores the synthetic employee, attendance, leave, rating, and login data.

## Requirements

- Node.js 20 or newer and npm
- Python 3.10 or newer
- Windows PowerShell commands are shown below; run each service in its own terminal.

## Setup

### 1. Frontend

```powershell
cd frontend
npm install
```

### 2. Backend

In a second terminal:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

For local development, the example values work. Replace `JWT_SECRET` with a private value before using the app beyond a local demo. `DB_PATH=./data/app.db` stores the SQLite file under `backend/data`.

### 3. Python ML service

In a third terminal:

```powershell
cd ml-service
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

If PowerShell blocks virtual environment activation, allow it for the current terminal with `Set-ExecutionPolicy -Scope Process Bypass`, then activate the environment again.

## Seed synthetic data

In a fourth terminal, from the repository root:

```powershell
cd backend
npm run seed
```

The seed command recreates the database contents and prints the demo logins. Run it when you want a clean demo dataset.

## Run the application

Start the Flask service in its activated virtual environment:

```powershell
cd ml-service
python app.py
```

Start the backend in another terminal:

```powershell
cd backend
npm run dev
```

Start the Angular app in another terminal:

```powershell
cd frontend
npm start
```

Open [http://localhost:4200](http://localhost:4200). Check service health at `http://localhost:3000/api/health` and `http://localhost:5001/health`.

## Demo logins

The seed script creates these accounts. All use password `Pass@123`.

| Role | Email |
|---|---|
| HR | `hr@company.test` |
| Manager | `arjun.menon@company.test` |
| Employee | `asha.krishnan@company.test` |

HR can view and manage all employees and assign teams. A manager sees their direct reports. An employee sees their own profile and score.

## Evaluate anomaly detection

Keep the backend, seeded database, and Flask service running. From the backend folder, run:

```powershell
npm run eval
```

This compares Isolation Forest at contamination values 0.05, 0.10, and 0.15 with a z-score baseline, prints precision/recall/F1 and the missed and falsely flagged names, and writes the measured report to `docs/evaluation_results.md`. The report describes the current synthetic seed; run the evaluation again after reseeding to refresh it.
