"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchJobs } from "@/lib/api";
type Job = {
  job_id: string;
  filename: string;
  status: "done" | "error" | "pending";
  rows: number;
};
export default function DashboardPage() {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
    refetchInterval: 5000,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-1">All pipeline runs</p>
        </div>
        <Link
          href="/upload"
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
            href="/upload"
            className="text-violet-400 text-sm underline mt-2 inline-block"
          >
            Upload a dataset to get started
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {jobs.map((job: Job) => (
          <Link
            key={job.job_id}
            href={`/results/${job.job_id}`}
            className="flex items-center justify-between bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl px-5 py-4 transition-all group"
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
        ))}
      </div>
    </div>
  );
}