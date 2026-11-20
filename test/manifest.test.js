import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));

test('manifest declares a user-triggered worksheet writing command', () => {
  assert.equal(manifest.commands['write-current-worksheet-answer'].description, 'Write the current reviewed worksheet answer');
  assert.equal(manifest.commands['write-current-worksheet-answer'].suggested_key.default, 'Alt+Shift+Y');
});
