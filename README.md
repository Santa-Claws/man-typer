# man-typer

A local-only Chrome/Chromium extension that types clipboard text with natural timing and optional, self-corrected typos. The final text always exactly matches the clipboard.

## Install locally

1. Clone this repository.
2. In Chrome, open `chrome://extensions` and enable **Developer mode**.
3. Select **Load unpacked** and choose this project directory.
4. Copy text, focus the destination field, then right-click and choose **Start man-typer**.
5. Use **Stop man-typer** from the same menu to cancel. Open the extension toolbar icon to adjust behavior.

## What it does

- Types clipboard content with variable key delays and longer punctuation pauses.
- Optionally makes nearby-key substitutions, omissions, duplicated characters, and transpositions within words.
- Pauses, backspaces the transient mistake, then retypes the correct word.
- Preserves the exact clipboard contents after completion, including Unicode, whitespace, punctuation, and line breaks.
- Keeps all text and settings in the browser; it has no network requests or analytics.

## Development

Run the planner tests with:

```sh
npm test
```

## Permissions

- `debugger` sends text and Backspace events, including to editors such as Google Docs.
- `scripting` and `activeTab` let the extension read clipboard text only after a user starts typing from the active page.
- `contextMenus` adds the start/stop controls.
- `storage` saves settings locally.

## License and attribution

man-typer is derived from [behaviorism/clipboard-typer](https://github.com/behaviorism/clipboard-typer). It retains the upstream MIT license and copyright notice.
