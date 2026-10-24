// The report screen. A thin server component wrapper around the client-side
// public report flow (ticket 03). The Public/Private entry point, follow-ups,
// emergency takeover and names-a-person block are layered on here by later
// Track A tickets (04–06).
import { ReportFlow } from "./report-flow";

export const metadata = {
  title: "Report an issue · CampusFix",
};

export default function ReportPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Report an issue</h1>
        <p className="text-muted-foreground">
          Say what&apos;s wrong in plain language. We&apos;ll classify it and route it
          to the right team.
        </p>
      </header>
      <ReportFlow />
    </div>
  );
}
