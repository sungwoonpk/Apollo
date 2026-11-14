# Features

What Apollo does and how the pieces behave.

## Voice

- **Wake word**: "Hey Apollo" (dev builds fall back to the built-in "jarvis"
  keyword until a custom `resources/hey_apollo.ppn` is trained on the Picovoice
  console). **Push-to-talk** (the hotkey) always works with no wake engine.
- TTS defaults to the keyless `msedge-tts` voice `en-US-JennyNeural`
  (configurable in Settings → Voice).

## Two surfaces, one brain

Apollo has exactly two ways in, both reading and writing the **same** local repos:

- **Orb** (voice) — docked at the screen edge; wake word or push-to-talk. Voice
  answers for weather, news, briefs, and schedules render on the **Response
  Stage**: a wider translucent panel with staggered rows, a temperature count-up,
  and a best-effort accent bar on the line being spoken. **Open in chat**
  deep-links a voice answer into its conversation so you can continue by typing;
  the right-click menu offers **Open chat** and **Open Apollo** (Today).
- **Workspace** — a full window (tray click, orb menu, `app.open`, or a card deep
  link) with four views in rail order. **Today** (Mod+1): a greeting, today's
  schedule, weather and headlines, nothing else. **Chat** (Mod+2): the typed
  surface, with a message thread and streaming replies, inline cards,
  per-message copy/regenerate/edit/speak, a conversation sidebar with
  rename/pin/delete, and dictation into the composer. **Calendar** (Mod+3):
  Month / Week with drag create-move-resize / Agenda; recurring edits prompt
  *this event* vs *all events*. **Notes** (Mod+4): a block editor (headings,
  lists, checklists, tables), FTS search, autosave, pin, delete-with-undo.
  There is no separate to-do list. "Add milk to my list" appends a checklist
  item to your list note.

Because voice tools, the Chat tab, and the Workspace views all mutate the same repos,
changes propagate live: an event created by voice appears in an open Calendar
within one event-loop tick (a `DataBus` broadcasts `data.changed` to every
window). Settings edits broadcast the same way — no restart to change units,
time format, week start, or profile.

## Proactive nudges (quiet by design)

Apollo also notices things in your **own local data** and offers a small, polite
nudge — a meeting starting soon, a busy tomorrow, stale email threads, rain
before an event. Every rule is deterministic and local: **no LLM
calls and no new network egress**. A **governor** enforces the Quiet invariant in
code before anything reaches you: a per-day budget, Do-Not-Disturb hours,
de-duplication, 20-minute spacing, deferral while you're talking or in
fullscreen, batching into one card, and **auto-tune** (if you dismiss a rule's
nudges five times, it offers to turn that rule off). Time-sensitive nudges are
exempt from the budget but still respect DND (delivered silently). Turn any rule
on/off by voice ("stop reminding me about meetings") or in **Settings →
Proactive**.

## Quick Capture

A global-hotkey micro-window (**Ctrl/Cmd+Shift+N**) saves a thought as a note,
to-do, or reminder in under two seconds, **with zero LLM involvement**. It
classifies as you type — a future time turns it into a reminder (with the time
phrase stripped), a leading `todo` or trailing `!` forces a to-do (saved as a
checklist item on your list note) — and Tab cycles the type. It saves through the same repos, so a captured note is live in
the Workspace and available to voice instantly, and it works fully offline.

## Calendars & Google Calendar sync (opt-in)

Events belong to **local calendar collections**, managed in **Settings →
Calendars**; new events land on your default calendar. Calendars are told apart
by name and a neutral source dot, with no color picker. **Google Calendar sync**
is a strictly opt-in module (**Settings → Accounts → Connect Google Calendar**)
that is completely inert until you enable it — no scopes requested, no background
work, no UI beyond the connect entry. Once connected you pick which calendars to
sync and the direction (read-only default, or two-way). Sync is incremental
(Google `syncToken`, full re-sync on 410), expands recurrence into the same
RRULE/EXDATE model, converts timezones, and pushes two-way edits with etag
preconditions; an etag conflict never overwrites silently — it surfaces a
**Keep mine / theirs / both** card. Disconnecting asks whether to keep synced
events as local copies or remove them, then revokes the scope. It reuses the
existing Google hosts and safeStorage — no new secret store. The sync engine is
tested against a mocked Google client only. The live sign-in for the calendar
scope is not wired yet: **Connect Google Calendar** answers that live Google
sign-in isn't set up on this build. See HUMAN_TODO.

## Links & lightweight web reading

When **you** give Apollo a URL and ask about it, the tier-1 `link.read` tool
fetches and summarizes it — the **only** path allowed to reach arbitrary public
hosts, and only for links you typed (same user-substring rule as email
recipients). It is bounded in code: an **SSRF guard** resolves the host and
rejects any private/loopback/link-local/metadata address, **re-validating at
connect time and on every redirect hop** (DNS-rebinding safe); http/https only;
2 fetches per turn; 5s timeout; 2MB cap; HTML reduced to readable text; non-HTML
described, never returned raw. The result is wrapped `<data source="link">` and
marked untrusted, so a hostile page can't trigger a Tier-3 action without your
confirmation. Bare URLs in Notes get an inline **Preview** affordance.

## Keyboard shortcuts

A single **`?`** (or **Cmd/Ctrl+/**) anywhere in the Workspace opens a help sheet
listing every shortcut, grouped by scope (Global, Workspace, Calendar, Notes,
Voice). The list is generated from a single shortcuts registry that also drives
the actual key bindings, so help and behavior can never drift.

## Semantic memory & recall (on-device)

Apollo remembers meaning, not just keywords. Your **notes, past conversations,
and saved memory facts** are embedded on-device with a local MiniLM model
(`@huggingface/transformers`) into a vector index inside the same SQLite file
(`sqlite-vec`), so "what was that idea I noted about the startup last week" is
answered by semantic search — **no network egress for embedding or retrieval,
ever**. A background indexer chunks and embeds on the DataBus (debounced, and
only while no turn is active and voice is idle); `recall.search` does hybrid
vector + keyword ranking with a recency tilt; results are treated as untrusted
(notes can hold pasted text). **Cmd/Ctrl+K** in the Workspace opens an
omnisearch across Notes, Events, and Facts.

Memory facts dedupe by meaning (a near-duplicate updates in place; a
contradiction replaces and is undoable). Everything is controllable in
**Settings → Privacy → Memory index** (live counts, size on disk, Rebuild,
Clear); turning off conversation history immediately purges indexed chats.

The model is fetched **only at build time** by `pnpm --filter @apollo/desktop
fetch-models` (23 MB quantized ONNX; SHA-256 recorded in `DECISIONS.md`).
Without it, Apollo runs on a deterministic Fake embedder, so all tests and CI
need no model files.
