# 06: Notification dropdown + university-name slot + branding

Status: OPEN
Track: B
Blocked By: 01-prefactor-shared-seams.md
Files Touched: src/components/layout/notification-bell.tsx, src/components/layout/university-name.tsx (fills the header university-name slot), public/logo.png, src/app/favicon.ico, design/ (source assets)

**What to build:** make the header feel finished — the notification bell actually opens, the university name reads as its own clear element, and the UniFix brand replaces the leftover placeholder.

- [ ] The notification bell opens a dropdown listing the active user's notifications (reuse `listNotifications`), marks them read on open (reuse `markAllRead`), and shows a friendly empty state. The existing unread badge continues to reflect `countUnread`.
- [ ] The university name fills the header's university-name slot as its own element, distinct from the logo, reading like "UniFix | MIT".
- [ ] The `design/logo.png` and `design/favicon.ico` assets are wired in as the UniFix logo and site favicon, replacing the Next default favicon. Any leftover "CF"/placeholder brand text or mark is replaced with UniFix branding. If `design/logo.png` is byte-identical to the current `public/logo.png`, flag it and request the intended asset rather than silently shipping the old mark.
- [ ] `npm run lint && npm run test && npm run build` pass.
