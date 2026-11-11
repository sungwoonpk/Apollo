# Setup

Everything needed to run Apollo, with or without accounts and keys.

## Requirements

- **Node 20+** (developed on Node 22) and **pnpm 10+**
- **macOS** or **Windows** (primary dev target is the current machine's OS)
- Python 3 + Xcode Command Line Tools (macOS) for building `better-sqlite3`

## Quick start (development)

```bash
pnpm install
pnpm dev            # launches the tray app (orb + Workspace)
```

> If your shell sets `ELECTRON_RUN_AS_NODE` (some CI/agent shells do), unset it for
> dev: `env -u ELECTRON_RUN_AS_NODE pnpm dev`.

On first run, a 4-step onboarding walks you through permissions and keys. Without
any keys, Apollo still runs on **Fake adapters**: timers, notes, calendar,
reminders, the fast path, and text replies all work locally; networked and
LLM-backed features show a clear "add a key" message until you provide one.

Open the Workspace (tray icon) and type **"set a timer for 5 minutes"** in the
Chat tab to see a live card.

## Demo mode

`APOLLO_DEMO=1 pnpm dev` runs the whole app on made-up data with no accounts, no
keys and no network. The database is in memory, the assistant is scripted, and
weather and headlines are built in. It only works in development builds. Try:
"Schedule design review today at 2pm", "Remind me to call the dentist tomorrow at
9am", "Note: plan the launch", "Add oat milk to my shopping list", "What's on my
calendar tomorrow?".

## Accounts and modes

Apollo runs in one of two modes. Which one is active is decided at boot and
logged (`operating mode: …`); the orchestrator, tools, and voice code are
identical in both, because the transport is selected behind the `LlmClient`
interface.

**Managed (the default, and what a real user gets).** You sign in to an Apollo
account and inference is proxied by the Apollo backend. No provider keys ever
touch the device, and there is no Keys tab. Sign-in happens in Apollo's own UI
(**Settings → Account**) — a native form, not a browser hand-off and not an
embedded web view. See DECISIONS.md for why this departs from RFC 8252 and what
it costs. The backend is not deployed yet, so managed sign-in cannot succeed
until it is; that is tracked in **HUMAN_TODO.md**.

**BYOK (the developer / self-host path).** Set `APOLLO_ALLOW_BYOK=true` *and*
supply a real provider key, and Apollo calls the providers directly with your
own keys. Both conditions are required — a managed build with a stray key stays
managed, so a normal user can never be silently dropped onto direct provider
calls. This is the mode the entire Phase 0–11 offline test story runs in, and it
needs no account and no backend.

The egress allowlist follows the mode: managed drops the direct provider hosts
it can no longer authenticate to and adds the backend and identity-provider
hosts from config, so a self-hosted deployment is permitted by configuration
rather than a hardcoded domain.

### Keys (BYOK only — Settings → Keys, or a `.env` at the repo root)

Keys are stored write-only, encrypted with the OS keychain via Electron
`safeStorage`; the renderer can set and test them but never read them. In
managed mode this tab does not exist.

| Provider | Env var | Purpose | Required |
|----------|---------|---------|----------|
| Anthropic | `ANTHROPIC_API_KEY` | the LLM brain | yes (for anything beyond the fast path) |
| Deepgram | `DEEPGRAM_API_KEY` | speech-to-text | for voice input |
| Picovoice | `PICOVOICE_ACCESS_KEY` | "Hey Apollo" wake word | optional (PTT works without it) |
| Brave | `BRAVE_API_KEY` | web search | optional |
| Google OAuth | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Gmail | optional |

Google Calendar and Gmail are per-user connections in both modes, so those stay
here regardless.

Model id comes from config key `anthropic.model` (default `claude-sonnet-4-6`),
overridable via `ANTHROPIC_MODEL`. Backend and identity endpoints come from
`APOLLO_BACKEND_URL`, `APOLLO_OIDC_AUTHORIZE_URL`, and `APOLLO_OIDC_CLIENT_ID`.
See `.env.example`. Full setup steps for each account are in **HUMAN_TODO.md**.

## Permissions (macOS)

- **Microphone** — to hear you (requested during onboarding).
- **Accessibility** — for `screen.context` (active window + selected text).
  Grant in System Settings → Privacy & Security → Accessibility.
