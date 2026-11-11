# Backlog

Deferred S3 findings and desirable features surfaced during audits. Per Part J scope discipline (A3), features discovered during Phase 10 are logged here and NOT built.

## Deferred S3 (from Phase 10 audit)
_none yet — all Pass A S3 findings were fixed inline._

## Features surfaced (not built — scope discipline)
_none open. Both items below were built on 2026-11-11 at the owner's request._

## Done
- **Editor cross-boundary move UI (I7)**: the event editor's calendar picker now moves an event across the local/synced boundary through the sync engine (`moveEvent`), so a move onto a two-way calendar queues a remote create and a move off one queues a remote delete. Moving onto a read-only calendar is refused with a message in the editor. Tests in `ipc/handlers/workspaceMove.test.ts`.
- **Warmer empty-state copy (I6)**: the Chats, Today, news and Notes empty states each say what to do next in one line, with one example prompt where it helps. All copy is in `strings.ts`.
