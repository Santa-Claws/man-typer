import { DEFAULT_SETTINGS, normalizeSettings } from './src/typing-plan.js';

const form = document.querySelector('#settings-form');
const typoRate = document.querySelector('#typoRate');
const typoRateValue = document.querySelector('#typoRateValue');
const status = document.querySelector('#status');

const { settings = {} } = await chrome.storage.local.get('settings');
populate(normalizeSettings({ ...DEFAULT_SETTINGS, ...settings }));

typoRate.addEventListener('input', updateTypoRateLabel);
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
