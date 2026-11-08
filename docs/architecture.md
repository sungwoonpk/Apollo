# Architecture

How the code is laid out, how a turn flows, and what protects your data.

## Architecture map

```
apollo/
  packages/shared/         cross-module contracts (types, zod schemas, strings, IPC table)
  apps/desktop/
    src/main/              Electron main process
      index.ts             composition root: wires everything below
      ipc/                 generic zod-validated IPC router + handlers
      agent/               orchestrator (hand-written loop), fast path, time resolver,
                           taint + confirmation gates, system prompt, LLM adapters
      tools/               the tool catalog (calendar, timers, email, weather, brief, …)
                           + registry; every tool ships tests beside it
      voice/               VoiceController FSM, Deepgram/Fake STT, edge/Fake TTS, chunker
      audio-worker/        utilityProcess: wake adapters + Silero VAD
      db/                  better-sqlite3 connection, numbered migrations, repos (only SQL),
                           DataBus (live cross-surface sync)
      net/                 httpClient + egress allowlist + circuit breaker + offline probe
      security/            secrets (safeStorage), email sanitizer, Gmail OAuth + provider
      scheduler/           timer/reminder/alarm scheduler + daily brief
      proactive/           deterministic rules + governor (Quiet pipeline) + engine + controller
      quickCapture/        classifier + save-path service (note/todo/reminder, zero LLM)
      workspace/           Today-view data provider (weather strip + latest brief)
    src/preload/           the single typed window.apollo bridge
    src/renderer/          orb, workspace (Chat/Today/Calendar/Notes), settings, onboarding, audio windows
                           (React + zustand); lib/ holds pure calendar/stage/debounce logic
  eval/                    golden.jsonl (agent eval), injection/ (prompt-injection suite)
```

### How a turn flows

1. **Renderer** sends `agent.userMessage` over the one preload bridge.
2. **IPC router** validates the payload with zod and verifies the sender frame.
3. **Orchestrator** tries the **fast path** (C9) — pure templates, no LLM. On a
   miss it streams from Anthropic with the full tool set.
4. Tool-use blocks are validated, executed (Tier 1/2 in parallel), and their
   results fed back. **Tier 3** actions (e.g. `email.send`) are **code-gated**
   behind a confirmation that no prompt can disable; untrusted content taints the
   turn and flags unstated recipients/URLs/paths red in the confirm card.
5. Sentences stream to **TTS**; the orb plays audio and shows compact cards.

## Security posture (highlights)

- Every window: `contextIsolation`, `sandbox`, `nodeIntegration:false`, strict CSP.
- Secrets never touch the renderer, disk in plaintext, or the logs (pino redaction).
- No `child_process.exec`; OS commands are fixed templates with validated args
  via `spawn(shell:false)` (CI grep-gate enforces this).
- Prompt-injection defense is structural (Tier 3 gate + taint + `<data>` wrapping)
  and covered by a 100%-required injection suite.
- Network egress is restricted to a verbatim allowlist shown in Settings → Privacy.
- Packaged builds flip Electron **fuses** (RunAsNode off, cookie encryption on,
  load-app-from-ASAR only, macOS ASAR integrity) — verified in an afterPack hook
  that fails the build on any mismatch.
- Every web permission request is denied; only the audio window's dedicated
  session may use the microphone. IPC is per-channel **rate-limited** (token bucket).
- An **action log** records every external (Tier 3) action and undo for the user's
  own accountability trail (recipients visible, message bodies never).

## Trust & data safety (Phase 8)

- **Backups**: automatic before every migration, weekly, or on demand
  (`VACUUM INTO`, newest-5-per-reason retention). A corrupt database is detected
  at boot (`PRAGMA quick_check`), quarantined, and the newest backup restored.
- **Export / import**: a zip of notes (`.md`), `calendar.ics`, todos/reminders/
  facts JSON, and settings — **secrets and OAuth tokens are provably excluded**.
- **On-device networking** goes through Electron `net.fetch` (system proxy, PAC,
  OS cert store) while keeping the breaker + egress allowlist; a CI **egress
  canary** proves no unexpected host is ever contacted.
- **Usage metering** (Anthropic tokens, Deepgram seconds, TTS characters) with a
  Diagnostics panel and an optional once-a-day over-limit warning.
- **Conversations** rotate after 30 min idle (one shared brain for voice + chat),
  a **follow-up window** lets you keep talking without the wake word, "repeat that"
  replays the last reply, and the **Chat** tab reads/continues/renames/pins/deletes
  history (delete purges its semantic-index chunks too).
- **Alerts** that actually alert: a ringing overlay with snooze/dismiss, a volume
  ramp for alarms, DND-aware silence, and notification routing.
- Boot budget `boot_to_tray` p95 < 2500 ms (measured ~260 ms), asserted by
  `pnpm --filter @apollo/desktop boot-bench`; heavy subsystems (embedder, audio
  worker, Workspace window) initialize lazily.
