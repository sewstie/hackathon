"use client";

// "Watch the Demo": the main call to action on the campus home. It plays the
// demo video in a pop-up. When the team's public YouTube/Vimeo link is set
// (NEXT_PUBLIC_DEMO_VIDEO_URL), that is embedded; until then the walkthrough
// recording shipped in /public/demo plays instead.
import * as React from "react";
import { Dialog } from "@/components/ui";

/** The narrated demo (with the team intro) — what "Watch the Demo" plays. */
export const LOCAL_DEMO_VIDEO = "/demo/unifix-demo.mp4";
/** The silent, captioned product walkthrough shown under "Try out the demo". */
export const LOCAL_WALKTHROUGH_VIDEO = "/demo/unifix-walkthrough.mp4";

/** Turn a YouTube / Vimeo page URL into its embeddable player URL. */
export function embedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v") ?? u.pathname.split("/").pop();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("vimeo.com")) return `https://player.vimeo.com/video/${u.pathname.split("/").pop()}`;
    return null;
  } catch {
    return null;
  }
}

export function DemoPlayer({
  autoPlay = false,
  className,
  walkthrough = false,
}: {
  autoPlay?: boolean;
  className?: string;
  /** true = always the recorded product walkthrough, never the remote pitch video. */
  walkthrough?: boolean;
}) {
  const remote = walkthrough ? undefined : process.env.NEXT_PUBLIC_DEMO_VIDEO_URL;
  const embed = remote ? embedUrl(remote) : null;
  return (
    <div className={`relative aspect-video w-full overflow-hidden rounded-2xl bg-foreground ${className ?? ""}`}>
      {embed ? (
        <iframe
          src={`${embed}${autoPlay ? "?autoplay=1" : ""}`}
          title="UniFix demo video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <video
          src={walkthrough ? LOCAL_WALKTHROUGH_VIDEO : LOCAL_DEMO_VIDEO}
          controls
          playsInline
          autoPlay={autoPlay}
          preload="metadata"
          poster={walkthrough ? "/demo/poster.jpg" : "/demo/demo-poster.jpg"}
          className="absolute inset-0 size-full"
        >
          Your browser can&apos;t play this video.
        </video>
      )}
    </div>
  );
}

export function WatchDemoButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        data-spot="watch-demo"
        onClick={() => setOpen(true)}
        className="group inline-flex h-12 items-center justify-center gap-3 rounded-full bg-primary pl-2 pr-6 text-sm font-semibold text-primary-foreground shadow-[0_18px_40px_-16px_var(--cx-glow)] transition-transform hover:-translate-y-0.5"
      >
        <span aria-hidden className="relative flex size-8 items-center justify-center">
          <span className="cx-ring absolute inset-0 rounded-full bg-primary-foreground/30" />
          <span className="relative flex size-8 items-center justify-center rounded-full bg-primary-foreground text-primary">
            ▶
          </span>
        </span>
        Watch the Demo
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="UniFix in under 3 minutes"
        className="max-w-4xl"
      >
        {open ? <DemoPlayer autoPlay /> : null}
      </Dialog>
    </>
  );
}
