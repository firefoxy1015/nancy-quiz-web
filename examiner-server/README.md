# bcprep examiner server

Stateless FastAPI service behind the "AI Examiner" on the exam-prep site.
Sheets live in `sheets/`, scoring in `engine.py`, model channel in `llm.py`.

Run locally (key never goes in a file):

    set CCVIBE_API_KEY=...        (PowerShell: $env:CCVIBE_API_KEY='...')
    uvicorn main:app --port 8787 --reload

Deploy: Render blueprint in `render.yaml` (set CCVIBE_API_KEY in the dashboard).
Gates for sheets: `python tools/verify_sheet.py <id>`.
