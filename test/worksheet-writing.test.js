import assert from 'node:assert/strict';
import test from 'node:test';

import { createWorksheetSession, markCurrentEntryWritten } from '../src/worksheet-session.js';
import { writeCurrentWorksheetEntry } from '../src/worksheet-writer.js';

const session = createWorksheetSession({
  version: 1,
  session_id: 'session-1',
  session_secret: 'secret-1',
  expires_at: 2_000,
  target: { origin: 'https://docs.google.com', document_id: 'doc-123' },
  entries: [{ sequence: 1, slot_id: 'slot-1', prompt: 'Prompt', answer: 'Café\n✓' }],
}, 1_000);

test('worksheet writer inserts the exact current answer once into a matching document', async () => {
  const calls = [];

  const result = await writeCurrentWorksheetEntry(session, 'https://docs.google.com/document/d/doc-123/edit', async (method, payload) => {
    calls.push({ method, payload });
  }, 1_000);

  assert.deepEqual(calls, [{ method: 'Input.insertText', payload: { text: 'Café\n✓' } }]);
  assert.deepEqual(result, { status: 'awaiting_user_confirmation', sequence: 1 });
});

test('worksheet writer rejects a mismatched document before it sends input', async () => {
  await assert.rejects(
    () => writeCurrentWorksheetEntry(session, 'https://docs.google.com/document/d/other/edit', async () => assert.fail('must not send input'), 1_000),
    /does not match/,
  );
});

test('worksheet writer does not insert the same answer again while confirmation is pending', async () => {
  await assert.rejects(
    () => writeCurrentWorksheetEntry(markCurrentEntryWritten(session), 'https://docs.google.com/document/d/doc-123/edit', async () => assert.fail('must not send input'), 1_000),
    /confirmation/,
  );
});

test('worksheet writer rejects an expired package before it sends input', async () => {
  await assert.rejects(
    () => writeCurrentWorksheetEntry(session, 'https://docs.google.com/document/d/doc-123/edit', async () => assert.fail('must not send input'), 2_000),
    /expired/,
  );
});
