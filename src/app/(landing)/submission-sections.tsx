// The submission write-up, shown on the front page (About) right under the hero:
// what UniFix is, the problem, who it helps, every feature, the Hackachusetts
// track, how Kiro was used, and how to test it — then the walkthrough video.
import Link from "next/link";
import { Reveal } from "@/components/ui";
import { DEMO_ENTRY } from "@/components/layout";
import { DemoPlayer } from "./demo-video";

const REPO_URL = "https://github.com/sewstie/hackathon";

const FEATURES: Array<{ icon: string; title: string; body: string }> = [
  { icon: "✍️", title: "Report in plain words", body: "No forms. Type “the printer in Hayden is jammed” — AI picks the team, the severity and a title." },
  { icon: "❓", title: "Only the questions that matter", body: "At most 3 tap-chip follow-ups, location first — or “No specific place” for things like Wi-Fi." },
  { icon: "🤖", title: "Ari checks the past first", body: "“9 similar reports this semester · usually fixed in ~3 days”, plus safe quick fixes that can save a report." },
  { icon: "🚨", title: "Safety beats everything", body: "Words like “someone collapsed” or “got stabbed” instantly show Call 911 and Campus Police — before any AI runs. Self-harm adds 988." },
  { icon: "▲", title: "Co-sign instead of duplicates", body: "Students upvote what they also hit; the queue ranks by severity × how many people it affects." },
  { icon: "🗺️", title: "A live campus map", body: "Severity-colored clusters show where problems pile up; click a bubble to see every report in it." },
  { icon: "🔒", title: "Private reports", body: "Sensitive issues that name a person go to ONE office only — never the public feed — with a private two-way thread." },
  { icon: "🛠️", title: "Staff see only their area", body: "Facilities sees Facilities, IT sees IT. Mark solved or dismiss with a reason; everyone on the report is notified." },
  { icon: "💬", title: "Talk it through", body: "Public comments for everyone, plus a direct staff ↔ reporter chat for clarifying questions. Notifications open the chat." },
  { icon: "🧹", title: "Junk stays out", body: "Spam, jokes and “I won a million dollars” are blocked; public posts can't name people." },
];

const KIRO: Array<{ title: string; body: string }> = [
  { title: "Kiro Crew + Kiro CLI", body: "Crew's dashboard agent did the redesign, safety, onboarding, comments, map and deployment, verifying each change in a real headless browser. Our Ralph loop can drive the Kiro CLI headless to work through tickets." },
  { title: "Spec-driven development", body: "A full PRD (issues/00-spec.md) was broken into 9 tracer-bullet tickets with a Gantt roadmap, then built in 3 parallel tracks (A/B/C) by three teammates — instead of vibe coding one giant prompt." },
  { title: "Steering", body: "AGENTS.md and .kiro/steering pin the rules every task follows: deep modules, theme tokens only, accessibility, safety-first and a definition of done (lint, test, build)." },
  { title: "Skills (Kiro powers)", body: "Installed skills — grilling, to-spec, to-tickets, tdd, setup-ts-deep-modules, codebase-design, ship-keys — gave Kiro our team's playbook for planning, testing, architecture and secret-safe deploys." },
  { title: "Hooks", body: "Project hooks in .kiro/hooks re-run the related tests and the module-boundary check whenever the agent saves a file." },
  { title: "Tests, incl. property-based", body: "300+ Vitest tests, plus fast-check property tests that hammer the emergency detector and the priority ranking with thousands of random inputs." },
];

function Eyebrow({ index, label }: { index: string; label: string }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
      <span className="text-primary">{index}</span> — {label}
    </span>
  );
}

export function SubmissionSections() {
  return (
    <>
      {/* ── About: description, problem, who benefits, track ─────────────── */}
      <Reveal id="about" data-spot="about" className="flex scroll-mt-24 flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Eyebrow index="01" label="About UniFix" />
          <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            The student-friendly front door to campus repairs
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-fit rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Hackachusetts track · Civic Action
            </span>
            <span className="w-fit rounded-full border border-primary/30 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Challenge V4 · Better college experiences
            </span>
          </div>
        </div>

        {/* Where the idea came from: the official challenge brief. */}
        <blockquote className="flex flex-col gap-2 rounded-3xl border-l-4 border-primary bg-primary/5 px-6 py-5">
          <p className="text-sm font-semibold text-foreground">
            Our idea comes straight from the Hackachusetts 2026 Civic Action challenge{" "}
            <strong>V4 — “Better college experiences”</strong>:
          </p>
          <p className="text-sm italic leading-relaxed text-muted-foreground">
            “Create more supportive college experiences. Show the campus, the engagement, and the
            research.”
          </p>
          <p className="text-xs text-muted-foreground">
            Source: the official{" "}
            <a
              href="https://hackachusetts2026.vercel.app"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary underline underline-offset-2"
            >
              Hackachusetts 2026 campus data portal
            </a>
            . UniFix shows <strong>the campus</strong> (a live map of what&apos;s broken),{" "}
            <strong>the engagement</strong> (students co-signing, commenting and hearing back) and
            uses the challenge&apos;s own <strong>IPEDS Massachusetts institution directory</strong> so
            any of the state&apos;s colleges can open UniFix.
          </p>
        </blockquote>

        <div className="grid gap-4 lg:grid-cols-3">
          <article className="flex flex-col gap-2 rounded-3xl border border-border bg-card p-6">
            <h3 className="text-lg font-bold">What it is</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              UniFix lets college students report what&apos;s broken on campus in plain
              language. AI classifies each report, asks only the few details still missing,
              merges duplicates into one co-signed ticket, ranks it by severity × reach, and
              routes it to the one staff team that fixes it. Every report shows a visible
              status from Received to Fixed, and everyone who co-signed is notified.
            </p>
          </article>
          <article className="flex flex-col gap-2 rounded-3xl border border-border bg-card p-6">
            <h3 className="text-lg font-bold">The problem</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Students hit broken Wi-Fi, cold dorms and loose railings every day, but reporting
              means finding the right office, filling a form and never hearing back. Staff drown
              in duplicates, urgent hazards wait in the same pile as cosmetic ones, and sensitive
              issues have no safe place to go — so most problems simply go unreported.
            </p>
          </article>
          <article className="flex flex-col gap-2 rounded-3xl border border-border bg-card p-6">
            <h3 className="text-lg font-bold">Who benefits, and how it scales</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Students get one place to speak up and a reason to trust it. Facilities, IT,
              Housing, Dining, Grounds and Safety get a clean, ranked queue. UniFix is
              campus-agnostic: any Massachusetts school from the public IPEDS directory opens
              instantly, and off-campus issues hand off to the city&apos;s own service.
            </p>
          </article>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Built for everyone: plain language, keyboard and screen-reader friendly, high-contrast
          severity labels (never color alone), reduced-motion support, anonymous to other
          students, and a private path for reports that can&apos;t be public.
        </p>
      </Reveal>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <Reveal className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Eyebrow index="02" label="Features" />
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything it does</h2>
        </div>
        <ul className="cx-stagger grid gap-3 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <li key={f.title} className="cx-lift flex items-start gap-4 rounded-3xl border border-border bg-card p-5">
              <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg">
                {f.icon}
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-bold">{f.title}</span>
                <span className="text-sm leading-relaxed text-muted-foreground">{f.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </Reveal>

      {/* ── How Kiro was used ────────────────────────────────────────────── */}
      <Reveal className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Eyebrow index="03" label="Built with Kiro" />
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How we used Kiro</h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            The full write-up is in{" "}
            <a href={`${REPO_URL}/blob/main/KIRO.md`} className="font-semibold text-primary underline underline-offset-2">
              KIRO.md
            </a>{" "}
            and the <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.kiro</code> folder of the repo.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {KIRO.map((k) => (
            <li key={k.title} className="flex flex-col gap-1.5 rounded-3xl border border-border bg-card p-5">
              <span className="font-bold">{k.title}</span>
              <span className="text-sm leading-relaxed text-muted-foreground">{k.body}</span>
            </li>
          ))}
        </ul>
      </Reveal>

      {/* ── Testing instructions ─────────────────────────────────────────── */}
      <Reveal className="flex flex-col gap-6 rounded-[2rem] border border-border bg-card p-7 sm:p-9">
        <div className="flex flex-col gap-2">
          <Eyebrow index="04" label="Try it yourself" />
          <h2 className="text-3xl font-bold tracking-tight">Testing instructions</h2>
          <p className="text-sm text-muted-foreground">No login, no install — it&apos;s free and open for judging.</p>
        </div>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed">
          <li>
            Click <strong>Student demo</strong> (top right). You land in the <strong>student view</strong>; the
            pop-up offers <strong>Try creating a report, step by step</strong>. Or click{" "}
            <strong>Report an issue</strong> and type <em>“my wifi is not working”</em>.
          </li>
          <li>
            Type <em>“somebody collapsed in the library”</em> to see Ari&apos;s emergency screen
            (it never dials for you).
          </li>
          <li>Upvote a report in the campus feed, and click a map bubble to list its reports.</li>
          <li>
            Click <strong>Switch to staff view</strong> in the banner. Pick a team in the Staff
            member menu (top right) — each sees only its own area. Open a report, message the
            reporter, then <strong>Mark solved</strong>.
          </li>
          <li>Switch back to the student, open the bell, and click the notification to answer.</li>
        </ol>
        <p className="text-sm text-muted-foreground">
          Source code and setup:{" "}
          <a href={REPO_URL} className="font-semibold text-primary underline underline-offset-2">
            github.com/sewstie/hackathon
          </a>{" "}
          ·{" "}
          <Link href={DEMO_ENTRY.student} className="font-semibold text-primary underline underline-offset-2">
            Open the student demo
          </Link>
        </p>
      </Reveal>

      {/* ── Try out the demo: the walkthrough video ──────────────────────── */}
      <Reveal id="try-demo" className="flex scroll-mt-24 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Eyebrow index="05" label="Try out the demo" />
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">See the whole flow</h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            A student reports a problem, Ari helps, an emergency gets Call 911 first, and the
            right staff team fixes it — from both sides.
          </p>
        </div>
        <DemoPlayer walkthrough className="shadow-[0_30px_80px_-40px_var(--cx-glow)]" />
      </Reveal>
    </>
  );
}
