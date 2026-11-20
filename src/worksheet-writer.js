import { currentEntry, matchesWorksheetTarget } from './worksheet-session.js';

export async function writeCurrentWorksheetEntry(session, targetUrl, sendCommand, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (session.expiresAt <= nowSeconds) {
    throw new Error('worksheet package has expired');
  }
  if (!matchesWorksheetTarget(session, targetUrl)) {
    throw new Error('active tab does not match the worksheet Google Docs target');
  }
  if (session.status !== 'ready') {
    throw new Error('worksheet entry is awaiting confirmation');
  }
  const entry = currentEntry(session);
  if (!entry) throw new Error('no worksheet entry is awaiting confirmation');
  await sendCommand('Input.insertText', { text: entry.answer });
  return { status: 'awaiting_user_confirmation', sequence: entry.sequence };
}
