import { DEFAULT_SETTINGS, normalizeSettings } from './src/typing-plan.js';

const form = document.querySelector('#settings-form');
const typoRate = document.querySelector('#typoRate');
const typoRateValue = document.querySelector('#typoRateValue');
const status = document.querySelector('#status');
const startTypingButton = document.querySelector('#startTyping');
const stopTypingButton = document.querySelector('#stopTyping');
const typingStatus = document.querySelector('#typingStatus');

const { settings = {} } = await chrome.storage.local.get('settings');
populate(normalizeSettings({ ...DEFAULT_SETTINGS, ...settings }));
const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
updateTypingControls(false);
if (activeTab?.id) {
  const { running } = await chrome.runtime.sendMessage({ type: 'get-typing-state', tabId: activeTab.id });
  updateTypingControls(running);
}

typoRate.addEventListener('input', updateTypoRateLabel);
startTypingButton.addEventListener('click', () => controlTyping('start-typing'));
stopTypingButton.addEventListener('click', () => controlTyping('stop-typing'));
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
  const { running } = await chrome.runtime.sendMessage({ type, tabId: activeTab.id });
  updateTypingControls(running);
  if (type === 'start-typing') window.close();
}

function updateTypingControls(running) {
  startTypingButton.disabled = running;
  stopTypingButton.disabled = !running;
  typingStatus.textContent = running
    ? 'Typing clipboard text in the focused field.'
    : 'Focus a field, then start typing.';
}
