"use client";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { fetchStatus, fetchResults } from "@/lib/api";
import { useStore } from "@/lib/store";

type Metrics = {
  accuracy: number;
  f1:       number;
  roc_auc:  number;
};

type Feature = {
  name:  string;
  agent: "transformation" | "interaction";
};

type JobResult = {
  baseline_metrics:  Metrics;
  augmented_metrics: Metrics;
  features:          Feature[];
  features_added:    number;
};

type JobStatus = {
  status: "running" | "done" | "error";
  error?: string;
};

type ChartEntry = {
  name:  string;
  value: number;
  agent: Feature["agent"];
};

const pct  = (v: number) => `${(v * 100).toFixed(2)}%`;
const gain = (a: number, b: number) => {
  const d = ((a - b) / b) * 100;
  return { label: (d >= 0 ? "+" : "") + d.toFixed(1) + "%", positive: d >= 0 };
};

export default function ResultsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const setResult = useStore((s) => s.setResult);
  const cached    = useStore((s) => s.results[jobId]);

  const { data: status } = useQuery<JobStatus>({
    queryKey: ["status", jobId],
    queryFn:  () => fetchStatus(jobId),
    refetchInterval: (q) =>
      q.state.data?.status === "running" ? 2000 : false,
    enabled: !cached,
  });

  const { data: fresh } = useQuery<JobResult>({
    queryKey: ["results", jobId],
    queryFn:  () => fetchResults(jobId),
    enabled:  status?.status === "done",
  });

  useEffect(() => {
    if (fresh) setResult(jobId, fresh);
  }, [fresh]);

  const data    = fresh || cached;
  const running = !data && status?.status === "running";
  const failed  = status?.status === "error";

  const metrics = data
    ? [
        { label: "Accuracy", base: data.baseline_metrics.accuracy, aug: data.augmented_metrics.accuracy },
        { label: "F1 Score", base: data.baseline_metrics.f1,       aug: data.augmented_metrics.f1       },
        { label: "ROC-AUC",  base: data.baseline_metrics.roc_auc,  aug: data.augmented_metrics.roc_auc  },
      ]
    : [];

  const chartData: ChartEntry[] =
    data?.features?.slice(0, 15).map((f, i) => ({
      name:  f.name.length > 18 ? f.name.slice(0, 18) + "…" : f.name,
      value: data.features.length - i,
      agent: f.agent,
    })) ?? [];

  return (
    <div className="space-y-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Results</h1>
          <p className="text-zinc-500 text-xs mt-1 font-mono">
            job · {jobId}
          </p>
        </div>
        {data && (
          <button
            onClick={() => {
              const blob = new Blob(
                [JSON.stringify(data, null, 2)],
                { type: "application/json" }
              );
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `mafe-${jobId.slice(0, 8)}.json`;
              a.click();
            }}
            className="text-sm border border-zinc-700 hover:border-zinc-500 px-4 py-2 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            Export JSON
          </button>
        )}
      </div>

      {running && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse block" />
            <span className="font-medium text-zinc-200">Pipeline running…</span>
          </div>
          <div className="space-y-4">
            {[
              ["Transformation agent",  "Applying non-linear transforms"],
              ["Interaction agent",      "Generating feature pairs"],
              ["Leakage detection",      "Checking for target leakage"],
              ["Coordinator agent",      "Enforcing feature budget"],
              ["Pruner agent",           "Removing redundant features"],
              ["Model evaluation",       "Baseline vs augmented comparison"],
            ].map(([title, desc], i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="w-6 h-6 shrink-0 rounded-full bg-zinc-800 border border-zinc-700 text-xs flex items-center justify-center text-zinc-500">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-300">{title}</p>
                  <p className="text-xs text-zinc-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-6">Page auto-updates every 2 seconds.</p>
        </div>
      )}

      {failed && (
        <div className="bg-red-950/40 border border-red-800 rounded-xl p-6 text-red-300 text-sm">
          Pipeline failed: {status?.error || "Unknown error"}
        </div>
      )}

      {data && (
        <>
          <div>
            <h2 className="text-lg font-semibold mb-4">Model performance</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {metrics.map(({ label, base, aug }) => {
                const g = gain(aug, base);
                return (
                  <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">{label}</p>
                    <p className="text-2xl font-bold">{pct(aug)}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-zinc-500">base {pct(base)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        g.positive ? "bg-green-950 text-green-400" : "bg-red-950 text-red-400"
                      }`}>
                        {g.label}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div className="bg-violet-950/30 border border-violet-800 rounded-xl p-4">
                <p className="text-xs text-violet-400 uppercase tracking-widest mb-3">Features added</p>
                <p className="text-2xl font-bold">{data.features_added}</p>
                <p className="text-xs text-zinc-500 mt-2">by MAFE agents</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Engineered features</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex gap-5 mb-5 text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-violet-500 inline-block" />
                  Transformation agent
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-teal-500 inline-block" />
                  Interaction agent
                </span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis
                    type="number"
                    tick={{ fill: "#52525b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((e, i) => (
                      <Cell
                        key={i}
                        fill={e.agent === "transformation" ? "#8b5cf6" : "#14b8a6"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Feature list</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left">
                    <th className="px-5 py-3 text-zinc-500 font-medium text-xs w-12">#</th>
                    <th className="px-5 py-3 text-zinc-500 font-medium text-xs">Feature name</th>
                    <th className="px-5 py-3 text-zinc-500 font-medium text-xs">Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {data.features.map((f, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-5 py-3 text-zinc-600 font-mono text-xs">{i + 1}</td>
                      <td className="px-5 py-3 text-zinc-200 font-mono text-xs">{f.name}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs border px-2.5 py-1 rounded-full font-medium ${
                          f.agent === "transformation"
                            ? "bg-violet-950 text-violet-300 border-violet-800"
                            : "bg-teal-950 text-teal-300 border-teal-800"
                        }`}>
                          {f.agent}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}