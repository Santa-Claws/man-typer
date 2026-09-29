# man-typer

A local-only Chrome/Chromium extension that types clipboard text with natural timing and optional, self-corrected typos. The final text always exactly matches the clipboard.

## Install it (the easy way)

This extension works in **Google Chrome** and **Microsoft Edge**. You do not need to install any other program.

1. On this GitHub page, click the green **Code** button, then click **Download ZIP**. Or use [this Download ZIP link](https://github.com/Santa-Claws/man-typer/archive/refs/heads/main.zip).
2. Open your **Downloads** folder. Find `man-typer-main.zip`, right-click it, and choose **Extract All**. Click **Extract**.
3. Open Chrome. (In Edge, use the same steps, but type `edge://extensions` instead.)
4. Click the address bar, type `chrome://extensions`, and press Enter.
5. Turn on **Developer mode**. It is a little switch near the top-right corner.
6. Click **Load unpacked**.
7. Choose the folder named `man-typer-main` that was created when you extracted the ZIP. Important: choose the folder, not the ZIP file. Then click **Select Folder**.
8. You should see a new card called **man-typer**. Click the puzzle-piece icon near the top-right of Chrome and pin man-typer if you want its button to stay visible.

### Use it

1. Copy the words you want to type.
2. Click once in the box where you want the words to go.
3. Click the man-typer extension icon, then click **Start typing**.
4. The popup disappears and typing begins. To stop it, open man-typer again and click **Stop typing**.

### If it does not type

- After installing or updating, go back to the page where you want to type and refresh it once.
- Make sure you copied some text first, then click inside a normal text box before pressing **Start typing**.
- Try it in a simple text box on a normal website first. Password boxes, payment forms, browser pages such as `chrome://...`, and some work/school websites may block extensions from typing for safety.
- When Chrome asks to allow the extension to debug the page, allow it. That permission is how man-typer types one character at a time.

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
- `clipboardRead` reads the text you choose to type when you press **Start typing**.
- `scripting` and `activeTab` restore the focused field after the popup closes.
- `storage` saves settings locally.

## License and attribution

man-typer is derived from [behaviorism/clipboard-typer](https://github.com/behaviorism/clipboard-typer). It retains the upstream MIT license and copyright notice.
