// app/admin/logs/page.tsx
"use client";

import PageHeader from "@/components/PageHeader";
import LogViewer from "@/components/LogViewer";

export default function AdminLogsPage() {
  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      <div className="shrink-0 z-30 bg-background">
        <PageHeader title="Logs" />
      </div>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="pt-4 px-4 sm:px-6 mb-6">
          <h1 className="text-[30px] font-extrabold tracking-tight text-primary">Centralized Logs</h1>
          <p className="text-[14px] font-medium text-secondary mt-1">
            Activity audit trail, application errors, and access traffic.
          </p>
        </div>

        <div className="px-4 sm:px-6 pb-6 max-w-5xl mx-auto">
          <LogViewer />
        </div>
      </main>
    </div>
  );
}
