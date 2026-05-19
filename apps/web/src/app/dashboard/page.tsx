import { Suspense } from "react";

import { DashboardShell } from "@/components/dashboard-shell";

export default function DashboardPage() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10">
      <Suspense
        fallback={
          <div className="rounded-[2rem] border border-stone-200 bg-white/80 p-8 text-stone-700 shadow-xl shadow-orange-100">
            Loading dashboard...
          </div>
        }
      >
        <DashboardShell />
      </Suspense>
    </main>
  );
}
