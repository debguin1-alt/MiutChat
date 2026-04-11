/**
 * screen-guard.js — Advanced Anti-Screenshot / Anti-Screen-Recording System
 *
 * Strategy: multi-signal detection → instant zero-delay blur
 *
 * Signals detected:
 *  1. 3+ finger touchstart (screenshot gesture on Android)
 *  2. visibilitychange hidden (tab switch, screen capture start)
 *  3. window blur (notification shade, app switcher, power button)
 *  4. devicechange (capture device connected)
 *  5. keydown: PrintScreen / meta+shift+3/4 (desktop screenshots)
 *  6. focus/blur delta timing (screen record often creates rapid blur/focus)
 *
 * Architecture:
 *  - Overlay injected immediately at script load (not on DOM ready)
 *    so there is ZERO paint before protection is active
 *  - CSS backdrop-filter + opacity transition = instant visual cover
 *  - Signal weighting: some signals alone trigger, others combine
 *  - Debounce on unblur to prevent flash between trigger + settle
 */

'use strict';

(function ScreenGuard() {

  /* ── Config ──────────────────────────────────────────────────────── */
  const CFG = {
    TOUCH_THRESHOLD:    3,      // fingers needed to trigger
    BLUR_MS:            5000,   // auto-unblur after N ms (for transient signals)
    HIDDEN_BLUR_MS:     0,      // 0 = stay blurred until visible again
    UNBLUR_DEBOUNCE:    600,    // ms to wait before unblurring after focus
    SIGNAL_WINDOW_MS:   1200,   // window to combine weak signals
    BLUR_OPACITY:       '1',
    ENABLE:             true,
  };

  /* ── State ───────────────────────────────────────────────────────── */
  let _blurred        = false;
  let _unblurTimer    = null;
  let _autoUnblurTimer= null;
  let _lastSignalTs   = 0;
  let _recentSignals  = 0;
  let _maxTouches     = 0;
  let _touchActive    = false;

  /* ── Overlay: inject SYNCHRONOUSLY before any paint ─────────────── */
  // Use document.write to inject immediately during parsing if possible,
  // otherwise inject via createElement (DOMContentLoaded not needed —
  // we append to document.documentElement directly).
  const _el = document.createElement('div');
  _el.id = '__sg_overlay';
  _el.setAttribute('aria-hidden', 'true');
  _el.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483647',     // max z-index
    'pointer-events:none',
    'opacity:0',
    'background:#050d0c',
    'backdrop-filter:blur(28px) brightness(.25)',
    '-webkit-backdrop-filter:blur(28px) brightness(.25)',
    'transition:opacity 0ms',  // ZERO transition when activating
    'will-change:opacity',
    'contain:strict',
  ].join(';');

  // Inject as early as possible — appended to <html> if <body> not yet parsed
  (document.body || document.documentElement).appendChild(_el);

  /* ── Blur / Unblur ───────────────────────────────────────────────── */
  function _blur(reason, autoUnblurMs) {
    if (!CFG.ENABLE) return;
    _blurred = true;
    _el.style.transition    = 'opacity 0ms';     // instant activation
    _el.style.opacity       = CFG.BLUR_OPACITY;
    _el.style.pointerEvents = 'all';

    if (_autoUnblurTimer) { clearTimeout(_autoUnblurTimer); _autoUnblurTimer = null; }
    if (_unblurTimer)     { clearTimeout(_unblurTimer);     _unblurTimer     = null; }

    const ms = autoUnblurMs ?? CFG.BLUR_MS;
    if (ms > 0) {
      _autoUnblurTimer = setTimeout(() => _unblur('auto'), ms);
    }
    // Dispatch custom event for app-level hooks
    document.dispatchEvent(new CustomEvent('screenshield:blur', { detail: { reason } }));
  }

  function _unblur(reason) {
    if (!_blurred) return;
    // Smooth unblur — short transition only when unblurring
    _el.style.transition    = 'opacity 280ms ease';
    _el.style.opacity       = '0';
    _el.style.pointerEvents = 'none';
    _blurred = false;
    if (_autoUnblurTimer) { clearTimeout(_autoUnblurTimer); _autoUnblurTimer = null; }
    document.dispatchEvent(new CustomEvent('screenshield:unblur', { detail: { reason } }));
  }

  function _scheduleUnblur(delayMs) {
    if (_unblurTimer) clearTimeout(_unblurTimer);
    _unblurTimer = setTimeout(() => _unblur('focus'), delayMs);
  }

  /* ── Signal combiner — weak signals accumulate ───────────────────── */
  function _signal(strength) {
    // strength: 'strong' = immediate blur, 'weak' = needs combination
    const now = Date.now();
    if (strength === 'strong') { _blur('strong-signal'); return; }
    // Weak signal: accumulate within window
    if (now - _lastSignalTs > CFG.SIGNAL_WINDOW_MS) _recentSignals = 0;
    _lastSignalTs = now;
    _recentSignals++;
    if (_recentSignals >= 2) { _recentSignals = 0; _blur('combined-weak'); }
  }

  /* ── Signal 1: Multi-touch (screenshot gesture) ──────────────────── */
  // touchstart fires BEFORE the OS screenshot can process the gesture —
  // we blur the DOM before the screenshot frame is composited.
  document.addEventListener('touchstart', e => {
    _touchActive = true;
    const n = e.touches.length;
    if (n > _maxTouches) _maxTouches = n;

    if (n >= CFG.TOUCH_THRESHOLD) {
      // Immediate blur — screenshot hasn't happened yet
      _blur('3-finger', CFG.BLUR_MS);
    }
  }, { passive: true, capture: true });

  document.addEventListener('touchmove', e => {
    // Additional check: if 3 fingers detected during move
    if (e.touches.length >= CFG.TOUCH_THRESHOLD && !_blurred) {
      _blur('3-finger-move', CFG.BLUR_MS);
    }
  }, { passive: true, capture: true });

  document.addEventListener('touchend', e => {
    if (e.touches.length === 0) {
      _touchActive = false;
      _maxTouches  = 0;
    }
  }, { passive: true });

  /* ── Signal 2: Visibility — most reliable for screen recording ───── */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Immediate — no timer — stay blurred until visible + settled
      _blur('visibility-hidden', CFG.HIDDEN_BLUR_MS);
    } else {
      // Visible again: wait for OS to settle before unblurring
      _scheduleUnblur(CFG.UNBLUR_DEBOUNCE);
    }
  });

  /* ── Signal 3: Window blur (notification bar, app switcher) ─────── */
  let _blurFocusDelta = 0;
  let _lastBlurTs     = 0;

  window.addEventListener('blur', () => {
    const now = Date.now();
    _blurFocusDelta = now - _lastBlurTs;
    _lastBlurTs = now;
    // Very rapid blur/focus (< 150ms) = likely screen recording event
    if (_blurFocusDelta > 0 && _blurFocusDelta < 150) {
      _signal('strong');
    } else {
      _signal('weak');
    }
  });

  window.addEventListener('focus', () => {
    _scheduleUnblur(CFG.UNBLUR_DEBOUNCE);
  });

  /* ── Signal 4: Media device change (screen capture device) ──────── */
  try {
    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', () => {
        _signal('weak');
      });
    }
  } catch {}

  /* ── Signal 5: Keyboard screenshot shortcuts ─────────────────────── */
  window.addEventListener('keydown', e => {
    const key = e.key?.toLowerCase() || '';
    // PrintScreen, meta+shift+3 (mac), meta+shift+4, ctrl+printscreen
    if (
      key === 'printscreen'                              ||
      (e.metaKey && e.shiftKey && (key === '3' || key === '4' || key === '5')) ||
      (e.ctrlKey && key === 'printscreen')
    ) {
      _blur('keyboard-screenshot', CFG.BLUR_MS);
    }
  }, { capture: true });

  /* ── Signal 6: Page Visibility API + requestAnimationFrame timing ── */
  // Screen recording tools often cause frame drops. We use this heuristic
  // carefully to avoid false positives from normal lag.
  let _lastFrameTs = 0;
  let _checkFrames = false;

  function _frameCheck(ts) {
    if (!_checkFrames) return;
    const delta = ts - _lastFrameTs;
    _lastFrameTs = ts;
    // Unusually long frame (>800ms gap while tab is visible) could indicate
    // a screencap tool compositing — very conservative threshold
    if (delta > 800 && document.visibilityState === 'visible' && !_blurred) {
      _signal('weak');
    }
    requestAnimationFrame(_frameCheck);
  }

  // Only run frame check when page is visible
  document.addEventListener('visibilitychange', () => {
    _checkFrames = document.visibilityState === 'visible';
    if (_checkFrames) {
      _lastFrameTs = performance.now();
      requestAnimationFrame(_frameCheck);
    }
  });

  /* ── Public API ──────────────────────────────────────────────────── */
  window.ScreenGuard = {
    blur:    (ms) => _blur('manual', ms),
    unblur:  ()   => _unblur('manual'),
    toggle:  ()   => _blurred ? _unblur('manual') : _blur('manual'),
    enable:  ()   => { CFG.ENABLE = true; },
    disable: ()   => { CFG.ENABLE = false; _unblur('disabled'); },
    isBlurred: () => _blurred,
  };

})();
