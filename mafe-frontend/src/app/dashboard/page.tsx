"use client";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJobs, deleteJob } from "@/lib/api";
import { useStore } from "@/lib/store";

type Job = {
  job_id: string;
  filename: string;
  status: "done" | "error" | "pending";
  rows: number;
};

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const deleteResult = useStore((s) => s.deleteResult);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
    refetchInterval: 5000,
  });

  const handleDelete = async (jobId: string) => {
    try {
      await deleteJob(jobId);
      deleteResult(jobId);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    } catch (err) {
      console.error("Failed to delete job", err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-1">All pipeline runs</p>
        </div>
        <Link
          href="/"
          className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New run
        </Link>
      </div>

      {isLoading && (
        <div className="text-zinc-500 text-sm">Loading…</div>
      )}

      {!isLoading && jobs.length === 0 && (
        <div className="border border-zinc-800 rounded-2xl p-16 text-center">
          <p className="text-zinc-500 text-sm">No runs yet.</p>
          <Link
            href="/"
            className="text-violet-400 text-sm underline mt-2 inline-block"
          >
            Upload a dataset to get started
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {jobs.map((job: Job) => (
          <div key={job.job_id} className="flex items-center gap-3">
            <Link
              href={`/results/${job.job_id}`}
              className="flex-1 flex items-center justify-between bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl px-5 py-4 transition-all group"
            >
              <div>
                <p className="font-medium text-zinc-100 group-hover:text-white">
                  {job.filename}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5 font-mono">
                  {job.job_id.slice(0, 8)}…
                </p>
              </div>
              <div className="flex items-center gap-3">
                {job.rows > 0 && (
                  <span className="text-xs text-zinc-500">
                    {job.rows.toLocaleString()} rows
                  </span>
                )}
                <span className={`text-xs border px-2.5 py-1 rounded-full font-medium ${
                  job.status === "done"
                    ? "bg-green-950 text-green-400 border-green-800"
                    : job.status === "error"
                    ? "bg-red-950 text-red-400 border-red-800"
                    : "bg-yellow-950 text-yellow-400 border-yellow-800"
                }`}>
                  {job.status}
                </span>
              </div>
            </Link>
            <button
              onClick={() => handleDelete(job.job_id)}
              className="p-4 text-zinc-500 hover:text-red-400 bg-zinc-900 border border-zinc-800 hover:border-red-900/50 hover:bg-red-950/20 rounded-xl transition-all"
              title="Delete run"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}