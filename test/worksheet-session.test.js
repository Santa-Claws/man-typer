import assert from 'node:assert/strict';
import test from 'node:test';

import { confirmCurrentEntry, createWorksheetSession, currentEntry, markCurrentEntryWritten, matchesWorksheetTarget } from '../src/worksheet-session.js';

const packageData = {
  version: 1,
  session_id: 'session-1',
  session_secret: 'secret-1',
  expires_at: 2_000,
  target: { origin: 'https://docs.google.com', document_id: 'doc-123' },
  entries: [
    { sequence: 1, slot_id: 'slot-1', prompt: 'First prompt', answer: 'First answer' },
    { sequence: 2, slot_id: 'slot-2', prompt: 'Second prompt', answer: 'Second answer' },
  ],
};

test('worksheet package exposes only the next ordered answer until it is confirmed', () => {
  const session = createWorksheetSession(packageData, 1_000);

  assert.deepEqual(currentEntry(session), packageData.entries[0]);
  const awaitingConfirmation = markCurrentEntryWritten(session);
  assert.equal(awaitingConfirmation.status, 'awaiting_confirmation');
  assert.throws(() => markCurrentEntryWritten(awaitingConfirmation), /confirmation/);
  const advanced = confirmCurrentEntry(awaitingConfirmation, 1_001);
  assert.deepEqual(currentEntry(advanced), packageData.entries[1]);
  assert.equal(advanced.nextSequence, 2);
});

test('worksheet target matches only its canonical Google Docs edit URL', () => {
  const session = createWorksheetSession(packageData, 1_000);

  assert.equal(matchesWorksheetTarget(session, 'https://docs.google.com/document/d/doc-123/edit'), true);
  assert.equal(matchesWorksheetTarget(session, 'https://docs.google.com/document/d/other/edit'), false);
  assert.equal(matchesWorksheetTarget(session, 'https://drive.google.com/file/d/doc-123/view'), false);
});

test('worksheet package resumes at a later original sequence without replaying confirmed entries', () => {
  const resumed = createWorksheetSession({ ...packageData, entry_count: 2, entries: [packageData.entries[1]] }, 1_000);

  assert.equal(resumed.nextSequence, 2);
  assert.equal(resumed.entryCount, 2);
  assert.deepEqual(currentEntry(resumed), packageData.entries[1]);
});

test('worksheet package rejects expired or out-of-order entries', () => {
  assert.throws(() => createWorksheetSession(packageData, 2_000), /expired/);
  assert.throws(
    () => createWorksheetSession({ ...packageData, entries: [packageData.entries[1], packageData.entries[0]] }, 1_000),
    /ordered/,
  );
});

test('worksheet confirmation fails closed when the package expires after writing', () => {
  const session = markCurrentEntryWritten(createWorksheetSession(packageData, 1_000));

  assert.throws(() => confirmCurrentEntry(session, 2_000), /expired/);
});
