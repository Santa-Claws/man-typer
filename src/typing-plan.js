export const DEFAULT_SETTINGS = Object.freeze({
  humanLike: true,
  typoRate: 0.06,
  correctionDelayMs: 450,
  minDelayMs: 35,
  maxDelayMs: 80,
  pauseIntensity: 1,
});

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
const KEY_NEIGHBORS = {
  a: 'qwsz', b: 'vghn', c: 'xdfv', d: 'ersfcx', e: 'wrsd', f: 'rtdgvc',
  g: 'tyfhvb', h: 'yugjbn', i: 'uojk', j: 'uikhmn', k: 'iojlm', l: 'opk',
  m: 'njk', n: 'bhjm', o: 'ipkl', p: 'ol', q: 'wa', r: 'etdf', s: 'awedxz',
  t: 'ryfg', u: 'yihj', v: 'cfgb', w: 'qase', x: 'zsdc', y: 'tugh', z: 'asx',
};

export function normalizeSettings(settings = {}) {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  return {
    humanLike: Boolean(merged.humanLike),
    typoRate: clamp(Number(merged.typoRate), 0, 0.4),
    correctionDelayMs: clamp(Math.round(Number(merged.correctionDelayMs)), 50, 3000),
    minDelayMs: clamp(Math.round(Number(merged.minDelayMs)), 5, 1000),
    maxDelayMs: clamp(Math.round(Number(merged.maxDelayMs)), 5, 1000),
    pauseIntensity: clamp(Number(merged.pauseIntensity), 0, 3),
  };
}

export function createTypingPlan(text, rawSettings = {}, random = Math.random) {
  const settings = normalizeSettings(rawSettings);
  if (settings.maxDelayMs < settings.minDelayMs) {
    [settings.minDelayMs, settings.maxDelayMs] = [settings.maxDelayMs, settings.minDelayMs];
  }
  const actions = [];
  let cursor = 0;
  for (const match of text.matchAll(WORD_PATTERN)) {
    appendLiteral(actions, text.slice(cursor, match.index), settings, random);
    const word = match[0];
    const mistake = settings.humanLike && random() < settings.typoRate ? makeMistake(word, random) : null;
    if (mistake) {
      appendLiteral(actions, mistake, settings, random);
      actions.push({ type: 'pause', durationMs: settings.correctionDelayMs });
      actions.push({ type: 'backspace', count: [...mistake].length });
    }
    appendLiteral(actions, word, settings, random);
    cursor = match.index + word.length;
  }
  appendLiteral(actions, text.slice(cursor), settings, random);
  return actions;
}

function appendLiteral(actions, text, settings, random) {
  for (const character of text) {
    actions.push({ type: 'insert', text: character });
    actions.push({ type: 'pause', durationMs: characterDelay(character, settings, random) });
  }
}

function characterDelay(character, settings, random) {
  const base = randomInt(settings.minDelayMs, settings.maxDelayMs, random);
  if (!settings.humanLike) return base;
  if (/[,;:]/u.test(character)) return base + 80 * settings.pauseIntensity;
  if (/[.!?]/u.test(character)) return base + 220 * settings.pauseIntensity;
  if (/\s/u.test(character)) return base + 25 * settings.pauseIntensity;
  return base;
}

function makeMistake(word, random) {
  const characters = [...word];
  if (characters.length < 3) return null;
  const index = randomInt(0, characters.length - 1, random);
  const original = characters[index];
  const lower = original.toLowerCase();
  const neighborKeys = KEY_NEIGHBORS[lower];
  const possibleKinds = ['omit', 'duplicate'];
  if (index < characters.length - 1) possibleKinds.push('transpose');
  if (neighborKeys) possibleKinds.push('substitute');
  const kind = possibleKinds[randomInt(0, possibleKinds.length - 1, random)];
  if (kind === 'omit') return characters.filter((_, i) => i !== index).join('');
  if (kind === 'duplicate') return [...characters.slice(0, index + 1), original, ...characters.slice(index + 1)].join('');
  if (kind === 'transpose') {
    [characters[index], characters[index + 1]] = [characters[index + 1], characters[index]];
    return characters.join('');
  }
  const replacement = neighborKeys[randomInt(0, neighborKeys.length - 1, random)];
  characters[index] = original === lower ? replacement : replacement.toUpperCase();
  return characters.join('');
}

function randomInt(min, max, random) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}
