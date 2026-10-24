# 09: Ari persona alignment

Status: DONE
Track: C
Blocked By: 01-prefactor-shared-seams.md
Files Touched: src/components/ari/ (ari-popup.tsx, ari-shell.tsx, index.ts, tests, avatar asset)

**What to build:** make UniFix's Ari feel like a consistent, friendly named assistant whose identity matches the referenced Ari project — same name, a small avatar, a warm voice/chat-style tone — without changing what Ari does.

- [x] Ari presents a consistent identity: the name "Ari", a small friendly avatar, and a voice/chat-style tone aligned with the referenced Ari project (github.com/NicolasNabhan/ari). Presentation/persona only.
- [x] Ari keeps its existing UniFix functionality: showing past history and safe quick fixes.
- [x] The emergency behavior is unchanged: the one-tap Call 911 takeover still fires before any AI runs.
- [x] No ElevenLabs voice/talking-head technology and no apprentice-workflow behavior are ported (out of scope).
- [x] Existing Ari tests still pass; any new persona behavior is tested through the Ari component's public surface.
- [x] `npm run lint && npm run test && npm run build` pass.
