// Track fingers independently so releasing one never cancels another input.
export function bindTouchControls(root, enabled) {
  const keys = {}, pointers = new Map();
  // Mobile Safari can still start text selection/callouts after pointerdown.
  // Cancel native touch gestures explicitly on held driving controls only.
  const suppressGesture = event => {
    if (event.target.closest?.('[data-key]') && event.cancelable) event.preventDefault();
  };
  root.addEventListener('touchstart', suppressGesture, {passive: false});
  root.addEventListener('touchmove', suppressGesture, {passive: false});
  for (const type of ['contextmenu', 'selectstart', 'dragstart']) {
    root.addEventListener(type, event => event.preventDefault());
  }
  function refresh(button) {
    const held = [...pointers.values()].includes(button);
    keys[button.dataset.key] = held;
    button.classList.toggle('is-held', held);
    button.setAttribute('aria-pressed', String(held));
  }
  function release(event) {
    const button = pointers.get(event.pointerId);
    if (!button) return;
    pointers.delete(event.pointerId);
    refresh(button);
  }
  for (const button of root.querySelectorAll('[data-key]')) {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('pointerdown', event => {
      if (!enabled() || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      // Clear selection left by an earlier gesture before capturing the finger.
      globalThis.getSelection?.()?.removeAllRanges();
      pointers.set(event.pointerId, button);
      button.setPointerCapture(event.pointerId);
      refresh(button);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
      button.addEventListener(type, release);
    button.addEventListener('contextmenu', event => event.preventDefault());
  }
  return {keys, clear() {
    const active = [...pointers.entries()];
    pointers.clear();
    for (const [id, button] of active) {
      refresh(button);
      if (button.hasPointerCapture(id)) button.releasePointerCapture(id);
    }
    for (const key in keys) delete keys[key];
  }};
}
