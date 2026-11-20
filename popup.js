import { DEFAULT_SETTINGS, normalizeSettings } from './src/typing-plan.js';

const form = document.querySelector('#settings-form');
const typoRate = document.querySelector('#typoRate');
const typoRateValue = document.querySelector('#typoRateValue');
const status = document.querySelector('#status');
const startTypingButton = document.querySelector('#startTyping');
const stopTypingButton = document.querySelector('#stopTyping');
const typingStatus = document.querySelector('#typingStatus');
const worksheetPackage = document.querySelector('#worksheetPackage');
const loadWorksheetPackageButton = document.querySelector('#loadWorksheetPackage');
const confirmWorksheetEntryButton = document.querySelector('#confirmWorksheetEntry');
const clearWorksheetSessionButton = document.querySelector('#clearWorksheetSession');
const worksheetEntry = document.querySelector('#worksheetEntry');
const worksheetStatus = document.querySelector('#worksheetStatus');

const { settings = {} } = await chrome.storage.local.get('settings');
populate(normalizeSettings({ ...DEFAULT_SETTINGS, ...settings }));
const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
updateTypingControls(false);
if (activeTab?.id) {
  const { running } = await chrome.runtime.sendMessage({ type: 'get-typing-state', tabId: activeTab.id });
  updateTypingControls(running);
}
await refreshWorksheetState();

typoRate.addEventListener('input', updateTypoRateLabel);
startTypingButton.addEventListener('click', () => controlTyping('start-typing'));
stopTypingButton.addEventListener('click', () => controlTyping('stop-typing'));
loadWorksheetPackageButton.addEventListener('click', loadWorksheetPackage);
confirmWorksheetEntryButton.addEventListener('click', confirmWorksheetEntry);
clearWorksheetSessionButton.addEventListener('click', clearWorksheetSession);
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'typing-state' && message.tabId === activeTab?.id) {
    updateTypingControls(message.running);
  }
});
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const next = normalizeSettings({
    humanLike: document.querySelector('#humanLike').checked,
    typoRate: typoRate.value,
    minDelayMs: document.querySelector('#minDelayMs').value,
    maxDelayMs: document.querySelector('#maxDelayMs').value,
    correctionDelayMs: document.querySelector('#correctionDelayMs').value,
    pauseIntensity: document.querySelector('#pauseIntensity').value,
  });
  await chrome.storage.local.set({ settings: next });
  populate(next);
  status.textContent = 'Saved.';
  setTimeout(() => { status.textContent = ''; }, 1500);
});

function populate(settings) {
  document.querySelector('#humanLike').checked = settings.humanLike;
  typoRate.value = settings.typoRate;
  document.querySelector('#minDelayMs').value = settings.minDelayMs;
  document.querySelector('#maxDelayMs').value = settings.maxDelayMs;
  document.querySelector('#correctionDelayMs').value = settings.correctionDelayMs;
  document.querySelector('#pauseIntensity').value = settings.pauseIntensity;
  updateTypoRateLabel();
}

function updateTypoRateLabel() {
  typoRateValue.value = `${Math.round(Number(typoRate.value) * 100)}%`;
  typoRateValue.textContent = typoRateValue.value;
}

async function controlTyping(type) {
  if (!activeTab?.id) {
    typingStatus.textContent = 'No active tab is available.';
    return;
  }
  try {
    const message = { type, tabId: activeTab.id };
    if (type === 'start-typing') message.text = await navigator.clipboard.readText();
    const { running } = await chrome.runtime.sendMessage(message);
    updateTypingControls(running);
    if (type === 'start-typing') window.close();
  } catch (error) {
    console.warn('man-typer could not read the clipboard', error);
    typingStatus.textContent = 'Could not read the clipboard. Copy the text, then try again.';
  }
}

function updateTypingControls(running) {
  startTypingButton.disabled = running;
  stopTypingButton.disabled = !running;
  typingStatus.textContent = running
    ? 'Typing clipboard text in the focused field.'
    : 'Focus a field, then start typing.';
}

async function loadWorksheetPackage() {
  try {
    const state = await chrome.runtime.sendMessage({ type: 'import-worksheet-package', package: JSON.parse(worksheetPackage.value) });
    renderWorksheetState(state);
    if (!state.error) worksheetPackage.value = '';
  } catch {
    worksheetStatus.textContent = 'Paste a valid worksheet package JSON from Worksheet Automation.';
  }
}

async function confirmWorksheetEntry() {
  renderWorksheetState(await chrome.runtime.sendMessage({ type: 'confirm-worksheet-entry' }));
}

async function clearWorksheetSession() {
  await chrome.runtime.sendMessage({ type: 'clear-worksheet-session' });
  worksheetPackage.value = '';
  await refreshWorksheetState();
}

async function refreshWorksheetState() {
  renderWorksheetState(await chrome.runtime.sendMessage({ type: 'get-worksheet-state' }));
}

function renderWorksheetState(state) {
  if (state?.error) {
    worksheetStatus.textContent = state.error;
    return;
  }
  const session = state?.session;
  const entry = session?.entry;
  confirmWorksheetEntryButton.disabled = session?.status !== 'awaiting_confirmation';
  clearWorksheetSessionButton.disabled = !session;
  if (!session) {
    worksheetEntry.textContent = 'No worksheet package loaded.';
  } else if (session.status === 'completed') {
    worksheetEntry.textContent = `All ${session.entryCount} entries were locally confirmed. Record completion in Worksheet Automation, then clear this package.`;
  } else {
    worksheetEntry.textContent = `Entry ${entry.sequence} of ${session.entryCount}: ${entry.prompt}`;
  }
  worksheetStatus.textContent = state?.result?.message || '';
}
