# Employee Management Dashboard

This repository contains three local services for the MCA project: an Angular frontend, a TypeScript Express backend, and a Flask ML service. This scaffold only provides the frontend shell and service health endpoints; project features are added one task slice at a time.

## Install and run

Run each service in a separate PowerShell terminal from the repository root.

### Frontend (Angular, port 4200)

```powershell
cd frontend
npm install
npm start
```

Open `http://localhost:4200`.

### Backend (Express, port 3000)

```powershell
cd backend
npm install
npm run dev
```

Verify the backend health endpoint:

```powershell
curl.exe http://localhost:3000/api/health
```

Expected response: `{"status":"ok"}`.

### ML service (Flask, port 5001)

```powershell
cd ml-service
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

In another terminal, verify its health endpoint:

```powershell
curl.exe http://localhost:5001/health
```

Expected response: `{"status":"ok"}`.
