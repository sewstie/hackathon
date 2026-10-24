import { redirect } from "next/navigation";
import { MIT_CAMPUS_ID } from "@/lib/store";

/**
 * The front door. The demo now drops a visitor STRAIGHT INTO the student view
 * — the scrollable feed of the seeded MIT campus — instead of a marketing
 * page. The pitch/impact content moved to `/about`; onboarding (the welcome
 * pop-up + try-reporting nudge) mounts on the campus feed itself.
 */
export default function LandingEntry() {
  redirect(`/campus/${MIT_CAMPUS_ID}`);
}
