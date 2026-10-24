# Design — UniFix

## Flow
Student text → **instant safety check** (client, no network) → `/api/classify` (Claude via
`generateObject` + Zod, keyword fallback on timeout/no key) → junk / names-a-person guards →
**≤3 follow-ups** (location first, or "No specific place") → **Ari step** (history line + curated
quick fixes; skipped for safety) → optional photo → confirm card → filed to the category's team →
"sent to {team}" pop-up. Staff see only their team's queue, ranked by severity × reach.

## Modules (deep, entry-point only)
| Module | Job |
|---|---|
| `modules/emergency` | Pure emergency + hazard detectors; call-tap audit log |
| `modules/ai` | `classify()` with model seam, timeout, keyword fallback |
| `modules/reporting` | Follow-up plan, photo checks, filing, team routing |
| `packages/priority` | Severity × reach scoring and feed ordering |
| `packages/abuse` | Rate limit, spam/junk screen, comment screen |
| `packages/comments` | Public comments + direct staff ↔ reporter messages + notifications |
| `packages/ari` | History line, quick fixes, suppression rules |
| `packages/private` | Office routing + office-scoped access for private reports |
| `packages/staff` | Team queue, status changes, reassignment |
| `lib/store` | `Store` seam: in-memory (demo/tests) or Supabase |

## Safety invariants (property-tested)
- An emergency phrase is detected whatever text surrounds it.
- The AI may raise an emergency, never close one; only "Not an emergency" dismisses.
- Urgent reports always rank above non-urgent ones.
