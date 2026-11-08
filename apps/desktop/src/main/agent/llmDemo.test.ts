import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { createDemoLlm } from './llmDemo';
import type { LlmStreamRequest } from './llm';

const NOW = DateTime.fromISO('2026-11-08T15:00:00');

function req(text: string): LlmStreamRequest {
  return { system: '', tools: [], messages: [{ role: 'user', content: [{ type: 'text', text }] }] } as unknown as LlmStreamRequest;
}

async function run(text: string) {
  return createDemoLlm(() => NOW).stream({ ...req(text), onText: () => {} } as LlmStreamRequest);
}

describe('demo assistant', () => {
  it('creates an event with a title, a time and a one hour length', async () => {
    const r = await run('Schedule team standup tomorrow at 9am');
    expect(r.toolUses[0]).toMatchObject({
      name: 'calendar.create',
      input: { title: 'Team standup', startIso: '2026-11-09T09:00:00', endIso: '2026-11-09T10:00:00' },
    });
  });

  it('rolls a reminder to tomorrow when the time has passed today', async () => {
    const r = await run('Remind me to call mom at 9am');
    expect(r.toolUses[0]).toMatchObject({ name: 'reminder.create', input: { text: 'Call mom', dueIso: '2026-11-09T09:00:00' } });
  });

  it('saves notes and list items', async () => {
    expect((await run('note: ideas for the demo')).toolUses[0]?.name).toBe('note.save');
    expect((await run('add milk to my shopping list')).toolUses[0]).toMatchObject({
      name: 'note.appendChecklistItem',
      input: { item: 'milk' },
    });
  });

  it('lists the calendar for a question about the day', async () => {
    const r = await run("What's on my calendar tomorrow?");
    expect(r.toolUses[0]?.name).toBe('calendar.list');
  });

  it('says it is a demo for anything else', async () => {
    const r = await run('Write me a poem');
    expect(r.toolUses).toHaveLength(0);
    expect(r.text).toContain('demo mode');
  });
});
