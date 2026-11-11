import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openDb } from '../../db/connection';
import { migrate } from '../../db/migrate';
import { createRepos, type Repos } from '../../db/repos/index';
import { buildWorkspaceHandlers } from './workspace';

const CAL = 'google:cal-1';
let repos: Repos;

function setup(opts: { readOnly?: string[] } = {}) {
  const moveEvent = vi.fn((id: string, to: string): boolean => {
    repos.events.update(id, { calendarId: to, remoteId: null, etag: null });
    return true;
  });
  const handlers = buildWorkspaceHandlers({
    repos,
    tz: () => 'UTC',
    openWorkspace: () => undefined,
    log: () => undefined,
    moveEvent,
    isReadOnlyCalendar: (id) => (opts.readOnly ?? []).includes(id),
  });
  return { handlers, moveEvent };
}

function makeEvent(calendarId: string) {
  return repos.events.create({ title: 'Review', startTs: Date.UTC(2026, 10, 9, 17, 0), endTs: null, tz: 'UTC', calendarId });
}

beforeEach(() => {
  const db = openDb(':memory:');
  migrate(db);
  repos = createRepos(db);
});

describe('events.update across the local/synced boundary (backlog I7)', () => {
  it('hands a move onto a synced calendar to the sync engine and still applies the other edits', () => {
    const ev = makeEvent('default');
    const { handlers, moveEvent } = setup();
    handlers['events.update']({ id: ev.id, patch: { title: 'Design review', calendarId: CAL }, scope: 'all' });
    expect(moveEvent).toHaveBeenCalledWith(ev.id, CAL);
    const row = repos.events.get(ev.id)!;
    expect(row.title).toBe('Design review');
    expect(row.calendarId).toBe(CAL);
  });

  it('hands a move off a synced calendar to the sync engine too', () => {
    const ev = makeEvent(CAL);
    const { handlers, moveEvent } = setup();
    handlers['events.update']({ id: ev.id, patch: { calendarId: 'default' }, scope: 'all' });
    expect(moveEvent).toHaveBeenCalledWith(ev.id, 'default');
  });

  it('keeps a plain update when both calendars are local', () => {
    const ev = makeEvent('default');
    const { handlers, moveEvent } = setup();
    handlers['events.update']({ id: ev.id, patch: { calendarId: 'work' }, scope: 'all' });
    expect(moveEvent).not.toHaveBeenCalled();
    expect(repos.events.get(ev.id)?.calendarId).toBe('work');
  });

  it('does nothing special when the calendar did not change', () => {
    const ev = makeEvent(CAL);
    const { handlers, moveEvent } = setup();
    handlers['events.update']({ id: ev.id, patch: { title: 'Renamed', calendarId: CAL }, scope: 'all' });
    expect(moveEvent).not.toHaveBeenCalled();
    expect(repos.events.get(ev.id)?.title).toBe('Renamed');
  });

  it('refuses a move onto a read-only calendar and changes nothing', () => {
    const ev = makeEvent('default');
    const { handlers, moveEvent } = setup({ readOnly: [CAL] });
    expect(() => handlers['events.update']({ id: ev.id, patch: { title: 'X', calendarId: CAL }, scope: 'all' })).toThrow(/read-only/i);
    expect(moveEvent).not.toHaveBeenCalled();
    const row = repos.events.get(ev.id)!;
    expect(row.calendarId).toBe('default');
    expect(row.title).toBe('Review');
  });
});
