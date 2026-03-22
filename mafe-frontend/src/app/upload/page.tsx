"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { uploadCSV } from "@/lib/api";

export default function UploadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "text/csv": [".csv"] },
    multiple: false,
    disabled: loading,
    onDrop: async ([file]) => {
      if (!file) return;
      setLoading(true);
      setError("");
      try {
        const { job_id } = await uploadCSV(file);
        router.push(`/results/${job_id}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed. Is the backend running?";
        setError(msg);
        setLoading(false);
      }
    },
  });

  return (
    <div className="max-w-xl mx-auto pt-16">
      <h1 className="text-3xl font-bold mb-2 tracking-tight">
        Run MAFE pipeline
      </h1>
      <p className="text-zinc-400 text-sm mb-8">
        Upload a CSV dataset — agents will engineer features and compare
        model performance automatically.
      </p>

      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-2xl p-16 text-center
          cursor-pointer transition-all duration-200
          ${isDragActive
            ? "border-violet-500 bg-violet-950/20"
            : "border-zinc-700 hover:border-zinc-500 bg-zinc-900/40 hover:bg-zinc-900/70"}
          ${loading ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <input {...getInputProps()} />
        <div className="text-5xl mb-4 select-none">
          {loading ? "⏳" : isDragActive ? "📥" : "📂"}
        </div>
        <p className="text-zinc-200 font-medium text-lg">
          {loading
            ? "Uploading and starting pipeline…"
            : isDragActive
            ? "Drop it here"
            : "Drag & drop a CSV file"}
        </p>
        <p className="text-zinc-500 text-sm mt-2">
          {loading ? "Please wait…" : "or click to browse"}
        </p>
      </div>

      {error && (
        <div className="mt-4 text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <p className="mt-6 text-zinc-600 text-xs leading-relaxed">
        Your CSV must have a target column. Default is{" "}
        <code className="text-zinc-400 bg-zinc-800 px-1 py-0.5 rounded">income</code>.
        Change it in{" "}
        <code className="text-zinc-400 bg-zinc-800 px-1 py-0.5 rounded">
          Backend/experiments/run_mafe.py
        </code>.
      </p>
    </div>
  );
}