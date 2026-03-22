from fastapi import FastAPI, UploadFile, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uuid, io, sys, os, pandas as pd

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
        jobs[jid]["result"] = run_pipeline(df)
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