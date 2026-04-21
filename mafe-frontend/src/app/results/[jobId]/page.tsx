"use client";
import { useEffect, useRef, useState } from "react";
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

const PIPELINE_STEPS = [
  { title: "Transformation agent",  desc: "Applying non-linear transforms"      },
  { title: "Interaction agent",     desc: "Generating feature pairs"             },
  { title: "Leakage detection",     desc: "Checking for target leakage"          },
  { title: "Coordinator agent",     desc: "Enforcing feature budget"             },
  { title: "Pruner agent",          desc: "Removing redundant features"          },
  { title: "Model evaluation",      desc: "Baseline vs augmented comparison"     },
];

export default function ResultsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const setResult = useStore((s) => s.setResult);
  const cached    = useStore((s) => s.results[jobId]);

  // Elapsed timer
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animated active step (cycles top-to-bottom while running)
  const [activeStep, setActiveStep] = useState(0);
  const stepRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Delayed reveal of results so loading→results transition feels smooth
  const [showResults, setShowResults] = useState(false);
  const [allDone, setAllDone]         = useState(false);

  useEffect(() => {
    if (fresh) {
      setResult(jobId, fresh);
      // 1) Mark all steps as done immediately
      setAllDone(true);
      // 2) Then show results after a short pause so the completed state is visible
      const t = setTimeout(() => setShowResults(true), 800);
      return () => clearTimeout(t);
    }
  }, [fresh]);

  // Start/stop timers based on running state
  const running = !(fresh || cached) && status?.status === "running";

  useEffect(() => {
    if (running) {
      setActiveStep(0);
      elapsedRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      // Reveal steps quickly one-by-one (~350 ms each → all 6 in ~2 s)
      stepRef.current = setInterval(() =>
        setActiveStep(s => {
          const next = s + 1;
          if (next >= PIPELINE_STEPS.length - 1) {
            if (stepRef.current) clearInterval(stepRef.current);
          }
          return Math.min(next, PIPELINE_STEPS.length - 1);
        }), 350
      );
    } else {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
      if (stepRef.current)    clearInterval(stepRef.current);
    }
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
      if (stepRef.current)    clearInterval(stepRef.current);
    };
  }, [running]);

  const data   = (showResults || !fresh) ? (fresh || cached) : null;
  const failed = status?.status === "error";

  const fmtElapsed = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

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
          <div className="flex gap-3">
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
            <a
              href={`/api/mafe/download/${jobId}`}
              download
              className="text-sm bg-violet-600 hover:bg-violet-500 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              Download Dataset (CSV)
            </a>
          </div>
        )}
      </div>

      {running && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <span className="font-semibold text-zinc-100 text-base">Pipeline running…</span>
            <span className="text-xs font-mono text-zinc-600 tabular-nums">
              {fmtElapsed(elapsed)}
            </span>
          </div>

          {/* Step list — reveals top-to-bottom */}
          <div className="relative pl-9">
            {/* Static track */}
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-zinc-800" />
            {/* Growing fill — reaches 100% only when backend confirms done */}
            <div
              className="absolute left-[11px] top-2 w-px bg-violet-900"
              style={{
                height: allDone
                  ? "100%"
                  : `${(activeStep / Math.max(PIPELINE_STEPS.length - 1, 1)) * 90}%`,
                transition: "height 0.5s ease",
              }}
            />

            <div className="space-y-6">
              {PIPELINE_STEPS.map((step, i) => {
                const revealed = i <= activeStep;
                const isDone   = allDone ? true : i < activeStep;
                const isActive = !allDone && i === activeStep;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-4"
                    style={{
                      opacity:    revealed ? 1 : 0,
                      transform:  revealed ? "translateY(0)" : "translateY(10px)",
                      transition: "opacity 0.4s ease, transform 0.4s ease",
                    }}
                  >
                    {/* Dot */}
                    <div
                      className="flex-shrink-0 -ml-9 w-[22px] h-[22px] rounded-full"
                      style={{
                        background: isDone
                          ? "#3b1f6e"
                          : isActive
                          ? "#5b21b6"
                          : "#1c1c22",
                        border: `2px solid ${isDone ? "#5b21b6" : isActive ? "#7c3aed" : "#3f3f46"}`,
                        transition: "background 0.4s ease, border-color 0.4s ease",
                      }}
                    />

                    {/* Text */}
                    <div>
                      <p
                        className="text-sm font-medium"
                        style={{
                          color: revealed ? "#d4d4d8" : "#52525b",
                          transition: "color 0.4s ease",
                        }}
                      >
                        {step.title}
                      </p>
                      {isActive && (
                        <p className="text-xs text-zinc-600 mt-0.5">{step.desc}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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