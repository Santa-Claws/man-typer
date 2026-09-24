import assert from 'node:assert/strict';
import test from 'node:test';
import { createTypingPlan, normalizeSettings } from '../src/typing-plan.js';

function replay(actions) {
  let result = '';
  for (const action of actions) {
    if (action.type === 'insert') result += action.text;
    if (action.type === 'backspace') result = [...result].slice(0, -action.count).join('');
  }
  return result;
}

test('disabled human mode types an exact literal sequence', () => {
  const text = 'Hello, café!\nA 😀';
  const actions = createTypingPlan(text, { humanLike: false, minDelayMs: 10, maxDelayMs: 10 }, () => 0);
  assert.equal(replay(actions), text);
  assert.equal(actions.some((action) => action.type === 'backspace'), false);
});

test('corrections leave the final clipboard text unchanged', () => {
  const text = 'Typing words should remain exact.';
  const actions = createTypingPlan(text, { typoRate: 0.4 }, () => 0.2);
  assert.equal(replay(actions), text);
  assert.ok(actions.some((action) => action.type === 'backspace'));
});

test('the planner preserves whitespace and punctuation', () => {
  const text = 'one\t two\n\nthree...';
  assert.equal(replay(createTypingPlan(text, { humanLike: false }, () => 0.5)), text);
});

test('settings are clamped to safe ranges', () => {
  assert.deepEqual(normalizeSettings({ typoRate: 5, minDelayMs: -1, correctionDelayMs: 99999 }), {
    humanLike: true,
    typoRate: 0.4,
    correctionDelayMs: 3000,
    minDelayMs: 5,
    maxDelayMs: 80,
    pauseIntensity: 1,
  });
});
