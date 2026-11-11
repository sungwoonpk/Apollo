import { describe, expect, it } from 'vitest';
import { ipcErrorText } from './ipcError';

describe('ipcErrorText', () => {
  it("strips Electron's invoke prefix and the Error: label", () => {
    const err = new Error("Error invoking remote method 'events.update': Error: That calendar is read-only.");
    expect(ipcErrorText(err, 'fallback')).toBe('That calendar is read-only.');
  });

  it('keeps a plain message as it is', () => {
    expect(ipcErrorText(new Error('Something specific'), 'fallback')).toBe('Something specific');
  });

  it('falls back for empty messages and non-errors', () => {
    expect(ipcErrorText(new Error(''), 'fallback')).toBe('fallback');
    expect(ipcErrorText('boom', 'fallback')).toBe('fallback');
    expect(ipcErrorText(undefined, 'fallback')).toBe('fallback');
  });
});
