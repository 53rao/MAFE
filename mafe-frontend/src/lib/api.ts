export async function uploadCSV(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/mafe/run-pipeline", {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ job_id: string }>;
}

export async function fetchStatus(jobId: string) {
  const res = await fetch(`/api/mafe/status/${jobId}`);
  return res.json();
}

export async function fetchResults(jobId: string) {
  const res = await fetch(`/api/mafe/results/${jobId}`);
  if (!res.ok) throw new Error("Not ready");
  return res.json();
}

export async function fetchJobs() {
  const res = await fetch("/api/mafe/jobs");
  if (!res.ok) return [];
  return res.json();
}