import { DateTime } from 'luxon';
import { type LlmClient, type LlmStreamRequest } from './llm';
import { FakeLlm, type FakeStep } from './llmFake';

/**
 * Demo assistant. Dev builds only, behind APOLLO_DEMO=1.
 *
 * It answers a handful of everyday requests from a small script and calls the
 * real tools for them, so a screenshot or a recording shows real cards with
 * made-up content. It never touches the network and needs no key. Anything it
 * does not recognise gets an honest reply that says this is a demo.
 */
export function createDemoLlm(now: () => DateTime = () => DateTime.local()): LlmClient {
  return {
    stream: (req) => new FakeLlm([stepFor(req, now())]).stream(req),
  };
}

const DEMO_REPLY =
  'This is demo mode. I answer a few everyday requests from a script: timers, events, reminders, notes and list items. Nothing leaves this computer.';

const EVENT_WORD = /\b(meeting|lunch|dinner|breakfast|standup|call|appointment|dentist|review|event|coffee|sync|interview|class|session)\b/i;
const CREATE_VERB = /\b(schedule|book|add|create|set up|put)\b/i;
const QUESTION = /^\s*(what|what's|whats|show|when|do i|anything|how)\b|\?\s*$/i;

function lastUserText(req: LlmStreamRequest): string {
  const last = req.messages.at(-1);
  if (!last || last.role !== 'user') return '';
  return last.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join(' ').trim();
}

function toolResults(req: LlmStreamRequest): Array<{ content: string; isError: boolean }> {
  const last = req.messages.at(-1);
  if (!last || last.role !== 'user') return [];
  return last.content.flatMap((b) => (b.type === 'tool_result' ? [{ content: b.content, isError: b.is_error === true }] : []));
}

/** The day a request talks about and the clock time in it, as a local ISO string without offset. */
function whenFrom(text: string, now: DateTime, defaultHour: number, rollToFuture: boolean): DateTime {
  const day = /\btomorrow\b/i.test(text) ? now.plus({ days: 1 }) : now;
  const m = /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i.exec(text);
  let hour = defaultHour;
  let minute = 0;
  if (m) {
    hour = Number(m[1]);
    minute = m[2] ? Number(m[2]) : 0;
    const mer = m[3]?.toLowerCase();
    if (mer === 'pm' && hour < 12) hour += 12;
    if (mer === 'am' && hour === 12) hour = 0;
  }
  let when = day.set({ hour, minute, second: 0, millisecond: 0 });
  if (rollToFuture && !/\btomorrow\b/i.test(text) && when <= now) when = when.plus({ days: 1 });
  return when;
}

const iso = (d: DateTime): string => d.toISO({ suppressMilliseconds: true, includeOffset: false }) ?? '';

const capitalize = (s: string): string => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

/** "Schedule team standup tomorrow at 9am" becomes "Team standup". */
function titleFrom(text: string): string {
  const t = text
    .replace(/\s+(tomorrow|today)\b/gi, '')
    .replace(/\s+at\s+\d.*$/i, '')
    .replace(/^\s*(please\s+)?(schedule|book|add|create|set up|put)\s+(a|an|my|the)?\s*/i, '')
    .replace(/[.!?]+$/, '')
    .trim();
  return capitalize(t || 'Event');
}

function closing(results: Array<{ content: string; isError: boolean }>): FakeStep {
  const first = results[0];
  if (!first) return { text: 'Done.' };
  if (first.isError || first.content.startsWith('ERROR')) return { text: 'That did not work. Try rephrasing it.' };
  if (/^\d+\.\s/.test(first.content)) return { text: 'Here is what I found.' };
  const line = first.content.split('\n')[0]?.trim() ?? '';
  return { text: line ? `Done. ${line}` : 'Done.' };
}

function stepFor(req: LlmStreamRequest, now: DateTime): FakeStep {
  // Second round of a turn: the tools have run, say so.
  const results = toolResults(req);
  if (results.length > 0) return closing(results);

  const text = lastUserText(req);

  const note = /^\s*(?:note|jot(?: down)?)\b[:\s-]*(.+)$/i.exec(text);
  if (note?.[1]) return { toolUses: [{ name: 'note.save', input: { content: note[1].trim() } }] };

  const listItem = /^\s*(?:add|put)\s+(.+?)\s+(?:to|on)\s+(?:my\s+)?(?:list|todo(?:s)?|shopping list)\b/i.exec(text)
    ?? /^\s*todo\b[:\s-]*(.+)$/i.exec(text);
  if (listItem?.[1]) return { toolUses: [{ name: 'note.appendChecklistItem', input: { item: listItem[1].trim() } }] };

  const reminder = /^\s*remind me\s+(?:to\s+)?(.+)$/i.exec(text);
  if (reminder?.[1]) {
    const what = reminder[1]
      .replace(/\s+(tomorrow|today)\b/gi, '')
      .replace(/\s+at\s+\d.*$/i, '')
      .replace(/[.!?]+$/, '')
      .trim();
    return {
      toolUses: [{ name: 'reminder.create', input: { text: capitalize(what), dueIso: iso(whenFrom(text, now, 9, true)), tz: 'LOCAL' } }],
    };
  }

  if (QUESTION.test(text) && /\b(calendar|schedule|agenda|today|tomorrow|on my)\b/i.test(text)) {
    const day = /\btomorrow\b/i.test(text) ? now.plus({ days: 1 }) : now;
    return { toolUses: [{ name: 'calendar.list', input: { startIso: iso(day.startOf('day')), endIso: iso(day.endOf('day')) } }] };
  }

  if (!QUESTION.test(text) && EVENT_WORD.test(text) && (CREATE_VERB.test(text) || /\bat\s+\d/i.test(text))) {
    const start = whenFrom(text, now, 10, false);
    return {
      toolUses: [{ name: 'calendar.create', input: { title: titleFrom(text), startIso: iso(start), endIso: iso(start.plus({ hours: 1 })), tz: 'LOCAL' } }],
    };
  }

  return { text: DEMO_REPLY };
}
