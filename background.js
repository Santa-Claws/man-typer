import { createTypingPlan, DEFAULT_SETTINGS } from './src/typing-plan.js';

const MENU_START = 'start-typing';
const MENU_STOP = 'stop-typing';
const tasks = new Map();

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENU_START, title: 'Start man-typer', contexts: ['all'] });
    chrome.contextMenus.create({ id: MENU_STOP, title: 'Stop man-typer', contexts: ['all'] });
  });
});

chrome.contextMenus.onClicked.addListener(({ menuItemId }, tab) => {
  if (!tab?.id) return;
  if (menuItemId === MENU_START) startTyping(tab.id);
  if (menuItemId === MENU_STOP) stopTyping(tab.id);
});

chrome.tabs.onRemoved.addListener((tabId) => stopTyping(tabId));

async function startTyping(tabId) {
  stopTyping(tabId);
  const task = { cancelled: false, attached: false };
  tasks.set(tabId, task);
  try {
    await chrome.debugger.attach({ tabId }, '1.3');
    task.attached = true;
    const text = await readClipboard(tabId);
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
    if (tasks.get(tabId) === task) tasks.delete(tabId);
    if (task.attached) await chrome.debugger.detach({ tabId }).catch(() => {});
  }
}

function stopTyping(tabId) {
  const task = tasks.get(tabId);
  if (task) task.cancelled = true;
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

async function readClipboard(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => navigator.clipboard.readText(),
  });
  return result ?? '';
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
