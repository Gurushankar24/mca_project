# ML service scaffold

Create a virtual environment, install the dependencies, and start the Flask development server:

```powershell
cd ml-service
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

Verify that it is running with `curl.exe http://localhost:5001/health`. The health endpoint returns `{"status":"ok"}`.
