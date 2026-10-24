// Staff view for private reports — a top-level route (src/app/staff-private/)
// so it never nests inside Track B's src/app/staff/ or Track A's report flow.
//
// A responder who holds an office sees only their office's inbox; opening a
// report logs a "view", and they can reply, change status (Referred needs a
// note), and reassign — each enforced and logged by the private module's
// office-scoped seam, not by this UI.

import { StaffPrivateView } from "./staff-private-view";

export default function StaffPrivatePage() {
  return <StaffPrivateView />;
}
