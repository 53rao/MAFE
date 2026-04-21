"use client";
import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient());
  const path = usePathname();

  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased">
        <QueryClientProvider client={qc}>

          <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
            <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <span className="bg-violet-600 text-white text-sm font-bold px-3 py-1.5 rounded-lg tracking-wide">
                  MAFE
                </span>
              </Link>
              <div className="flex gap-1">
                {[
                  { href: "/", label: "New Run", exact: true },
                  { href: "/dashboard", label: "Dashboard", exact: false },
                ].map(({ href, label, exact }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${(exact ? path === href : path.startsWith(href))
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                      }`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          <main className="max-w-5xl mx-auto px-6 py-10">
            {children}
          </main>

        </QueryClientProvider>
      </body>
    </html>
  );
}