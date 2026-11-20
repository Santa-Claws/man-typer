import { createTypingPlan, DEFAULT_SETTINGS } from './src/typing-plan.js';
import { confirmCurrentEntry, createWorksheetSession, currentEntry, markCurrentEntryWritten } from './src/worksheet-session.js';
import { writeCurrentWorksheetEntry } from './src/worksheet-writer.js';

const tasks = new Map();
const worksheetWriteTabs = new Set();
const WORKSHEET_SESSION_KEY = 'worksheetSession';
const WORKSHEET_RESULT_KEY = 'worksheetResult';

chrome.tabs.onRemoved.addListener((tabId) => stopTyping(tabId));

chrome.commands.onCommand.addListener((command) => {
  if (command === 'write-current-worksheet-answer') void writeCurrentWorksheetAnswer();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'get-typing-state') {
    sendResponse({ running: tasks.has(message.tabId) });
    return;
  }

  if (message?.type === 'start-typing') {
    startTyping(message.tabId, message.text);
    sendResponse({ running: true });
    return;
  }

  if (message?.type === 'stop-typing') {
    stopTyping(message.tabId);
    sendResponse({ running: false });
    return;
  }

  if (message?.type === 'get-worksheet-state') {
    void worksheetState().then(sendResponse);
    return true;
  }

  if (message?.type === 'import-worksheet-package') {
    void importWorksheetPackage(message.package).then(sendResponse);
    return true;
  }

  if (message?.type === 'confirm-worksheet-entry') {
    void confirmWorksheetEntry().then(sendResponse);
    return true;
  }

  if (message?.type === 'clear-worksheet-session') {
    void clearWorksheetSession().then(sendResponse);
    return true;
  }
});

async function writeCurrentWorksheetAnswer() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || worksheetWriteTabs.has(tab.id)) return;
  const { worksheetSession } = await chrome.storage.session.get(WORKSHEET_SESSION_KEY);
  if (!worksheetSession) return;
  worksheetWriteTabs.add(tab.id);
  try {
    await chrome.debugger.attach({ tabId: tab.id }, '1.3');
    await writeCurrentWorksheetEntry(
      worksheetSession,
      tab.url,
      (method, payload) => chrome.debugger.sendCommand({ tabId: tab.id }, method, payload),
    );
    const nextSession = markCurrentEntryWritten(worksheetSession);
    await chrome.storage.session.set({
      [WORKSHEET_SESSION_KEY]: nextSession,
      [WORKSHEET_RESULT_KEY]: { message: 'Answer inserted. Visually verify it, then confirm in the extension.', error: false },
    });
  } catch (error) {
    await chrome.storage.session.set({
      [WORKSHEET_RESULT_KEY]: { message: error.message || 'Worksheet answer was not inserted.', error: true },
    });
  } finally {
    worksheetWriteTabs.delete(tab.id);
    await chrome.debugger.detach({ tabId: tab.id }).catch(() => {});
  }
}

async function importWorksheetPackage(rawPackage) {
  try {
    const worksheetSession = createWorksheetSession(rawPackage);
    await chrome.storage.session.set({
      [WORKSHEET_SESSION_KEY]: worksheetSession,
      [WORKSHEET_RESULT_KEY]: { message: 'Worksheet package loaded. Focus the first blank in the matching Google Doc, then press Alt+Shift+Y.', error: false },
    });
    return await worksheetState();
  } catch (error) {
    return { error: error.message || 'Worksheet package could not be loaded.' };
  }
}

async function confirmWorksheetEntry() {
  const { worksheetSession } = await chrome.storage.session.get(WORKSHEET_SESSION_KEY);
  if (!worksheetSession) return { error: 'No worksheet package is loaded.' };
  try {
    const nextSession = confirmCurrentEntry(worksheetSession);
    await chrome.storage.session.set({
      [WORKSHEET_SESSION_KEY]: nextSession,
      [WORKSHEET_RESULT_KEY]: {
        message: nextSession.status === 'completed' ? 'All locally tracked answers are confirmed.' : 'Confirmed. Focus the next blank and press Alt+Shift+Y.',
        error: false,
      },
    });
    return await worksheetState();
  } catch (error) {
    return { error: error.message || 'Worksheet answer could not be confirmed.' };
  }
}

async function clearWorksheetSession() {
  await chrome.storage.session.remove([WORKSHEET_SESSION_KEY, WORKSHEET_RESULT_KEY]);
  return { cleared: true };
}

async function worksheetState() {
  const { worksheetSession, worksheetResult } = await chrome.storage.session.get([WORKSHEET_SESSION_KEY, WORKSHEET_RESULT_KEY]);
  if (!worksheetSession) return { session: null, result: worksheetResult || null };
  return {
    session: {
      targetDocumentId: worksheetSession.target.documentId,
      expiresAt: worksheetSession.expiresAt,
      nextSequence: worksheetSession.nextSequence,
      entryCount: worksheetSession.entryCount,
      status: worksheetSession.status,
      entry: currentEntry(worksheetSession),
    },
    result: worksheetResult || null,
  };
}

function startTyping(tabId, text) {
  const previousTask = tasks.get(tabId);
  const task = { tabId, cancelled: false, attached: false };
  tasks.set(tabId, task);
  publishState(tabId, true);
  void runTyping(tabId, task, previousTask, text);
}

async function runTyping(tabId, task, previousTask, text) {
  try {
    if (previousTask) await cancelTask(previousTask);
    if (task.cancelled || tasks.get(tabId) !== task) return;
    // Closing the action popup returns focus to the page. Let that complete, then
    // restore the exact editable element that was focused before the popup opened.
    await wait(100);
    await restoreTypingFocus(tabId);
    if (task.cancelled || tasks.get(tabId) !== task) return;
    await chrome.debugger.attach({ tabId }, '1.3');
    task.attached = true;
    const { settings = {} } = await chrome.storage.local.get('settings');
    const plan = createTypingPlan(text, { ...DEFAULT_SETTINGS, ...settings });
    for (const action of plan) {
      if (task.cancelled || tasks.get(tabId) !== task) break;
      if (action.type === 'insert') await insertText(tabId, action.text);
      if (action.type === 'backspace') await pressBackspace(tabId, action.count);
      if (action.type === 'pause') await wait(action.durationMs);
    }
  } catch (error) {
    console.warn('man-typer could not complete typing', error);
  } finally {
    if (tasks.get(tabId) === task) {
      tasks.delete(tabId);
      publishState(tabId, false);
    }
    await cancelTask(task);
  }
}

async function restoreTypingFocus(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const savedTarget = document.querySelector('[data-man-typer-target]');
      const activeTarget = document.activeElement;
      const target = savedTarget || (
        activeTarget instanceof HTMLElement && activeTarget.matches(
          'input:not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"], [contenteditable=""]',
        ) ? activeTarget : null
      );
      if (target instanceof HTMLElement) {
        target.focus({ preventScroll: true });
        target.removeAttribute('data-man-typer-target');
      }
    },
  });
}

function stopTyping(tabId) {
  const task = tasks.get(tabId);
  if (!task) return;
  tasks.delete(tabId);
  task.cancelled = true;
  publishState(tabId, false);
  void cancelTask(task);
}

async function cancelTask(task) {
  task.cancelled = true;
  if (!task.attached) return;
  task.attached = false;
  await chrome.debugger.detach({ tabId: task.tabId }).catch(() => {});
}

function publishState(tabId, running) {
  chrome.runtime.sendMessage({ type: 'typing-state', tabId, running }).catch(() => {});
}

function insertText(tabId, text) {
  return chrome.debugger.sendCommand({ tabId }, 'Input.insertText', { text });
}

async function pressBackspace(tabId, count) {
  for (let i = 0; i < count; i += 1) {
    await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
      type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8,
    });
    await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
      type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8,
    });
  }
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
