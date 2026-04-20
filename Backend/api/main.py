from fastapi import FastAPI, UploadFile, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import uuid, io, sys, os, pandas as pd
from pathlib import Path

RESULTS_DIR = Path(__file__).resolve().parents[1] / "results"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

jobs: dict = {}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/run-pipeline")
async def run(file: UploadFile, bg: BackgroundTasks):
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))
    jid = str(uuid.uuid4())
    jobs[jid] = {
        "status": "running",
        "filename": file.filename,
        "rows": len(df),
        "result": None,
        "error": None,
    }
    bg.add_task(_run, jid, df)
    return {"job_id": jid}

def _run(jid: str, df: pd.DataFrame):
    try:
        from experiments.run_mafe import run_pipeline
        jobs[jid]["result"] = run_pipeline(df, jid=jid)
        jobs[jid]["status"] = "done"
    except Exception as e:
        jobs[jid]["status"] = "error"
        jobs[jid]["error"] = str(e)

@app.get("/status/{jid}")
def status(jid: str):
    j = jobs.get(jid)
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "job_id": jid,
        "status": j["status"],
        "filename": j["filename"],
        "rows": j["rows"],
        "error": j["error"],
    }

@app.get("/results/{jid}")
def results(jid: str):
    j = jobs.get(jid)
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
    if j["status"] != "done":
        raise HTTPException(status_code=202, detail="Still running")
    return j["result"]

@app.get("/jobs")
def list_jobs():
    return [
        {
            "job_id": k,
            "status": v["status"],
            "filename": v["filename"],
            "rows": v["rows"],
        }
        for k, v in jobs.items()
    ]

@app.delete("/jobs/{jid}")
def delete_job(jid: str):
    if jid in jobs:
        del jobs[jid]
        # Also clean up the CSV file if it exists
        csv_path = RESULTS_DIR / f"{jid}.csv"
        if csv_path.exists():
            csv_path.unlink()
        return {"status": "ok"}
    raise HTTPException(status_code=404, detail="Job not found")

@app.get("/download/{jid}")
def download_csv(jid: str):
    file_path = RESULTS_DIR / f"{jid}.csv"
    if file_path.exists():
        return FileResponse(
            path=file_path, 
            filename=f"mafe_dataset_{jid[:8]}.csv", 
            media_type='text/csv'
        )
    raise HTTPException(status_code=404, detail="CSV file not found or already deleted.")