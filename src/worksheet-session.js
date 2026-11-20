const GOOGLE_DOCS_ORIGIN = 'https://docs.google.com';
const MAX_ENTRIES = 500;
const MAX_TEXT_LENGTH = 10_000;

export function createWorksheetSession(rawPackage, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!rawPackage || typeof rawPackage !== 'object' || rawPackage.version !== 1) {
    throw new Error('worksheet package version is unsupported');
  }
  if (!isNonEmptyString(rawPackage.session_id) || !isNonEmptyString(rawPackage.session_secret)) {
    throw new Error('worksheet package is missing session credentials');
  }
  if (!Number.isInteger(rawPackage.expires_at) || rawPackage.expires_at <= nowSeconds) {
    throw new Error('worksheet package has expired');
  }
  const target = validateTarget(rawPackage.target);
  const entries = validateEntries(rawPackage.entries);
  const entryCount = rawPackage.entry_count ?? entries.at(-1).sequence;
  if (!Number.isInteger(entryCount) || entryCount < entries.at(-1).sequence || entryCount > MAX_ENTRIES) {
    throw new Error('worksheet package entry count is invalid');
  }
  return {
    sessionId: rawPackage.session_id,
    sessionSecret: rawPackage.session_secret,
    expiresAt: rawPackage.expires_at,
    target,
    entries,
    entryCount,
    nextSequence: entries[0].sequence,
    status: 'ready',
  };
}

export function currentEntry(session) {
  if (!session || !['ready', 'awaiting_confirmation'].includes(session.status)) return null;
  return session.entries.find((entry) => entry.sequence === session.nextSequence) || null;
}

export function markCurrentEntryWritten(session) {
  if (!session || session.status !== 'ready' || !currentEntry(session)) {
    throw new Error('worksheet entry is already awaiting confirmation');
  }
  return { ...session, status: 'awaiting_confirmation' };
}

export function confirmCurrentEntry(session) {
  if (!session || session.status !== 'awaiting_confirmation') {
    throw new Error('worksheet entry must be written before confirmation');
  }
  const entry = currentEntry(session);
  if (!entry) throw new Error('no worksheet entry is awaiting confirmation');
  const nextSequence = session.nextSequence + 1;
  return {
    ...session,
    nextSequence,
    status: nextSequence > session.entries.at(-1).sequence ? 'completed' : 'ready',
  };
}

export function matchesWorksheetTarget(session, targetUrl) {
  if (!session || !isNonEmptyString(targetUrl)) return false;
  try {
    const url = new URL(targetUrl);
    const parts = url.pathname.split('/');
    return url.origin === GOOGLE_DOCS_ORIGIN
      && parts.length === 5
      && parts[1] === 'document'
      && parts[2] === 'd'
      && parts[3] === session.target.documentId
      && parts[4] === 'edit';
  } catch {
    return false;
  }
}

function validateTarget(target) {
  if (!target || target.origin !== GOOGLE_DOCS_ORIGIN || !isNonEmptyString(target.document_id)) {
    throw new Error('worksheet package has an invalid Google Docs target');
  }
  return { origin: GOOGLE_DOCS_ORIGIN, documentId: target.document_id };
}

function validateEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > MAX_ENTRIES) {
    throw new Error('worksheet package must contain a bounded list of entries');
  }
  const firstSequence = entries[0]?.sequence;
  return entries.map((entry, index) => {
    if (
      !entry
      || !Number.isInteger(firstSequence)
      || firstSequence < 1
      || entry.sequence !== firstSequence + index
      || !isNonEmptyString(entry.slot_id)
      || !isNonEmptyString(entry.prompt)
      || !isNonEmptyString(entry.answer)
      || entry.prompt.length > MAX_TEXT_LENGTH
      || entry.answer.length > MAX_TEXT_LENGTH
    ) {
      throw new Error('worksheet package entries must be ordered and contain bounded text');
    }
    return {
      sequence: entry.sequence,
      slot_id: entry.slot_id,
      prompt: entry.prompt,
      answer: entry.answer,
    };
  });
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}
