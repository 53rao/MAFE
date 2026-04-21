import { create } from "zustand";
import { persist } from "zustand/middleware";
import { JobResult } from "@/types";

interface Store {
  results: Record<string, JobResult>;
  setResult: (jobId: string, result: JobResult) => void;
  deleteResult: (jobId: string) => void;
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      results: {},
      setResult: (id, r) =>
        set((s) => ({ results: { ...s.results, [id]: r } })),
      deleteResult: (id) =>
        set((s) => {
          const next = { ...s.results };
          delete next[id];
          return { results: next };
        }),
    }),
    { name: "mafe-store" }
  )
);