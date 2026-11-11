/**
 * Text for an error that came back over IPC. Electron prefixes a handler's
 * message with "Error invoking remote method '<channel>': Error: ", which is
 * noise for the person reading it, so it is removed here.
 */
export function ipcErrorText(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : '';
  const cleaned = raw.replace(/^Error invoking remote method '[^']*': (?:Error: )?/, '').trim();
  return cleaned || fallback;
}
