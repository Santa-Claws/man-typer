const TARGET_ATTRIBUTE = 'data-man-typer-target';
const EDITABLE_SELECTOR = [
  'input:not([type="button"]):not([type="checkbox"]):not([type="radio"])',
  'textarea',
  '[contenteditable="true"]',
  '[contenteditable=""]',
].join(', ');

document.addEventListener('focusin', (event) => {
  const target = event.target instanceof Element ? event.target.closest(EDITABLE_SELECTOR) : null;
  if (!target) return;
  document.querySelector(`[${TARGET_ATTRIBUTE}]`)?.removeAttribute(TARGET_ATTRIBUTE);
  target.setAttribute(TARGET_ATTRIBUTE, '');
}, true);
