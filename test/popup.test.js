import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const popupHtml = await readFile(new URL('../popup.html', import.meta.url), 'utf8');

test('popup exposes a local worksheet package importer and explicit confirmation control', () => {
  assert.match(popupHtml, /id="worksheetPackage"/);
  assert.match(popupHtml, /id="loadWorksheetPackage"/);
  assert.match(popupHtml, /id="confirmWorksheetEntry"/);
});
