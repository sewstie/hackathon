"use client";

// A short explainer that pops up whenever staff open the private inbox.
import { Button, Dialog } from "@/components/ui";
import { AriRobot } from "@/components/ari";

const POINTS = [
  { icon: "🔒", label: "One office only", hint: "Sent privately to your office — never the public feed." },
  { icon: "👁", label: "Every view is logged", hint: "Who opened it, and when, is kept on record." },
  { icon: "💬", label: "Private thread", hint: "Reply to the student; they may have hidden their name." },
  { icon: "↪", label: "Review, resolve, refer", hint: "Move it along, or send it to the right office." },
];

export function PrivateInboxHint({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="This is the private inbox"
      className="max-w-md"
      titleClassName="text-xl font-bold tracking-tight"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <AriRobot size={56} className="shrink-0" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Students use a <span className="font-semibold text-foreground">private report</span> for
            sensitive issues — like ones that name a person or a room. It is private, not
            confidential: staff may be required to act on it.
          </p>
        </div>
        <ul className="cx-stagger flex flex-col gap-2">
          {POINTS.map((p) => (
            <li key={p.label} className="flex items-center gap-3 rounded-2xl border border-border px-3 py-2.5">
              <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-staff-muted text-sm">
                {p.icon}
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{p.label}</span>
                <span className="text-xs text-muted-foreground">{p.hint}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <Button onClick={onClose} className="bg-staff text-staff-foreground">
            Got it, show me
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
