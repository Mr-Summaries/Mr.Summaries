import React, { useEffect, useRef, useState } from 'react';
import { normalizeTikz } from './tikzUtils';
import { useThemeStore } from '../store/useThemeStore';
export { normalizeTikz } from './tikzUtils';

// ── Font asset loader ─────────────────────────────────────────────────────────
// TikZJax relies on CMU (Computer Modern Unicode) web fonts declared in
// fonts.css.  Without them the browser falls back to generic glyphs and, for
// example, a comma in math mode ($(a,b)$) may be rendered as the wrong symbol.
// index.html already contains the <link> tag, but this function injects it
// programmatically as a safety net in case the static tag is missing or the
// app is embedded in another document.
const TIKZJAX_FONTS_CSS = 'https://tikzjax.com/v1/fonts.css';

/** Injects the TikZJax fonts.css <link> into <head> exactly once. */
export function ensureFontsCssLoaded(): void {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`link[href="${TIKZJAX_FONTS_CSS}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.crossOrigin = 'anonymous';
  link.href = TIKZJAX_FONTS_CSS;
  document.head.appendChild(link);
}

// ── Singleton library loader ──────────────────────────────────────────────────
// tikzjax.js is served from /public/tikzjax.js via Vite's static asset handling.
const TIKZJAX_URL = '/tikzjax.js';
const LOAD_TIMEOUT_MS  = 20_000; // 20 s to fetch the library
const RENDER_TIMEOUT_MS = 30_000; // 30 s per block to render

type LibStatus = 'idle' | 'loading' | 'loaded' | 'error';

const lib: {
  status: LibStatus;
  error: Error | null;
  listeners: Array<(err: Error | null) => void>;
} = { status: 'idle', error: null, listeners: [] };

/** Returns a promise that resolves once tikzjax.js is loaded (or rejects on error/timeout). */
export function ensureTikzJaxLoaded(): Promise<void> {
  // Ensure CMU fonts are available before the first render attempt so that
  // glyphs like the comma in $(a,b)$ are drawn from the correct font files.
  ensureFontsCssLoaded();
  return new Promise<void>((resolve, reject) => {
    if (lib.status === 'loaded') { resolve(); return; }
    if (lib.status === 'error')  { reject(lib.error!); return; }

    lib.listeners.push((err) => (err ? reject(err) : resolve()));
    if (lib.status === 'loading') return; // wait for the in-flight load

    lib.status = 'loading';
    const tag = document.createElement('script');
    tag.src = TIKZJAX_URL;

    const timer = setTimeout(
      () => handleResult(new Error('TikZJax library load timed out')),
      LOAD_TIMEOUT_MS,
    );

    function handleResult(err: Error | null) {
      clearTimeout(timer);
      lib.status = err ? 'error' : 'loaded';
      if (err) lib.error = err;
      const ls = lib.listeners.splice(0);
      ls.forEach((l) => l(err));
    }

    tag.onload  = () => handleResult(null);
    tag.onerror = () => handleResult(new Error('Failed to load TikZJax'));
    document.head.appendChild(tag);
  });
}

// ── Debounced render trigger ──────────────────────────────────────────────────
// Newer TikZJax builds expose window.process_tikz(scriptEl) which processes a
// single <script type="text/tikz"> element directly.  Older builds (and the
// one currently served from /tikzjax.js) instead set window.onload to a
// function that scans ALL such elements in the DOM.
//
// We prefer window.process_tikz when available because:
//  - it is per-element, so concurrent blocks do not interfere with each other;
//  - calling window.onload() for a block whose script was inserted while
//    another block is already mid-render can cause the two renders to race.
//
// If neither API is available we do nothing and rely on the per-block timeout.
let triggerScheduled = false;

export function scheduleTikzRendering(el?: HTMLScriptElement): void {
  // Prefer the per-element API exposed by newer TikZJax builds.
  // Let any error thrown by process_tikz bubble up to the caller so the
  // per-block error state can report it instead of silently hanging.
  if (el && typeof (window as any).process_tikz === 'function') {
    (window as any).process_tikz(el);
    return;
  }

  // Fallback: tikzjax.js sets window.onload which scans all
  // <script type="text/tikz"> elements currently in the DOM and renders them
  // sequentially.  We call it manually because the native page onload fired
  // before any React TikzRenderer components mounted.
  // Using a microtask debounce ensures that if many blocks mount simultaneously
  // only a single window.onload() call is made per tick.
  if (triggerScheduled) return;
  triggerScheduled = true;
  Promise.resolve().then(() => {
    triggerScheduled = false;
    try {
      const fn = (window as any).onload;
      if (typeof fn === 'function') fn();
    } catch (_) { /* ignore – individual block timeouts handle stuck states */ }
  });
}

// ── Background transparency helper ────────────────────────────────────────────
/**
 * After TikZJax renders, it may leave an inline background colour on the
 * outer SVG element or insert a full-size white rectangle as the first child.
 * This function strips those artefacts so the diagram sits on a transparent
 * canvas, letting the surrounding UI theme show through naturally.
 *
 * Only SVG-level background artefacts are touched; coloured fills that are
 * part of the actual diagram (blue circles, green rectangles, etc.) are left
 * completely unchanged.
 */
export function makeSvgTransparent(container: HTMLElement): void {
  container.querySelectorAll<SVGSVGElement>('svg').forEach((svg) => {
    // Remove any inline background style on the <svg> element itself.
    svg.style.background = '';
    svg.style.backgroundColor = '';

    // TikZJax sometimes inserts a <rect> as the very first child of the <svg>
    // to act as a white page background (width/height matching the viewBox).
    // Detect it by: being a <rect>, having no stroke, and having a fill that
    // resolves to white / none-with-white-background.
    const first = svg.querySelector<SVGElement>(':scope > rect:first-child');
    if (first) {
      const fill = first.getAttribute('fill') ?? first.style.fill ?? '';
      const normalised = fill.trim().toLowerCase();
      if (
        normalised === 'white' ||
        normalised === '#fff' ||
        normalised === '#ffffff' ||
        normalised === 'rgb(255,255,255)' ||
        normalised === 'rgb(255, 255, 255)'
      ) {
        // Clear both the attribute and any inline style so neither overrides.
        first.setAttribute('fill', 'transparent');
        first.style.fill = '';
      }
    }
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
type RenderStatus = 'loading' | 'success' | 'error';

export const TikzRenderer = ({ children }: { children: string }) => {
  const [status,   setStatus]   = useState<RenderStatus>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  useEffect(() => {
    let alive = true;
    const el = containerRef.current;
    if (!el) return;

    // Reset for this render
    el.innerHTML = '';
    setStatus('loading');
    setErrorMsg('');

    let obs:   MutationObserver | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Capture the first console.error emitted during rendering so we can
    // surface a meaningful message instead of just "timed out".
    let capturedConsoleError = '';
    const origConsoleError = console.error.bind(console);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const consoleErrorCapture = (...args: any[]) => {
      if (!capturedConsoleError) capturedConsoleError = args.map(String).join(' ');
      origConsoleError(...args);
    };
    console.error = consoleErrorCapture;

    // Capture unhandled promise rejections that may come from tikzjax's async render.
    let capturedRejection = '';
    const rejectionListener = (e: PromiseRejectionEvent) => {
      if (!capturedRejection) {
        capturedRejection =
          e.reason instanceof Error ? e.reason.message : String(e.reason ?? '');
      }
    };
    window.addEventListener('unhandledrejection', rejectionListener);

    function finish(ok: boolean, msg = '') {
      if (!alive) return;
      // Restore console.error and remove the rejection listener.
      console.error = origConsoleError;
      window.removeEventListener('unhandledrejection', rejectionListener);
      obs?.disconnect(); obs = null;
      if (timer) { clearTimeout(timer); timer = null; }
      if (ok) {
        makeSvgTransparent(el);
        setStatus('success');
      } else {
        // Prefer an explicit message; fall back to any captured error hint.
        const displayMsg = msg || capturedRejection || capturedConsoleError || '';
        setStatus('error');
        setErrorMsg(displayMsg);
      }
    }

    async function go() {
      // 1. Ensure the library is loaded (shared across all TikzRenderer instances)
      try {
        await ensureTikzJaxLoaded();
      } catch (e: unknown) {
        finish(false, e instanceof Error ? e.message : 'Failed to load TikZJax');
        return;
      }
      if (!alive) return;

      // 2. Insert the <script type="text/tikz"> element for tikzjax to process
      const tikzScript = document.createElement('script');
      tikzScript.type        = 'text/tikz';
      tikzScript.textContent = normalizeTikz(children);
      el.appendChild(tikzScript);

      // 3. Watch for tikzjax to replace the script element with the rendered SVG div
      obs = new MutationObserver(() => {
        if (!el.contains(tikzScript)) finish(true);
      });
      obs.observe(el, { childList: true });

      // 4. Trigger tikzjax processing.
      //    scheduleTikzRendering uses window.process_tikz(el) when available
      //    (newer TikZJax, per-element API) and falls back to window.onload()
      //    (older TikZJax, scans all script[type=text/tikz] in the DOM).
      //    Errors from process_tikz (synchronous) are caught here so the
      //    per-block error state can surface them immediately.
      try {
        scheduleTikzRendering(tikzScript);
      } catch (e: unknown) {
        finish(false, e instanceof Error ? e.message : 'TikZ processing failed');
        return;
      }

      // 5. Safety timeout – never leave the block in an infinite loading state
      timer = setTimeout(
        () => finish(false, 'TikZ rendering timed out'),
        RENDER_TIMEOUT_MS,
      );
    }

    go();

    return () => {
      alive = false;
      console.error = origConsoleError;
      window.removeEventListener('unhandledrejection', rejectionListener);
      obs?.disconnect(); obs = null;
      if (timer) { clearTimeout(timer); timer = null; }
    };
  }, [children]);

  return (
    <div className="tikzjax-wrapper my-4" dir="ltr">
      {status === 'loading' && (
        <div className="p-4 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm">
          Rendering TikZ diagram…
        </div>
      )}
      {status === 'error' && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800 text-sm">
          <p className="font-medium">TikZ rendering failed</p>
          {errorMsg && <p className="mt-1 opacity-75">{errorMsg}</p>}
        </div>
      )}
      {/* Container is always mounted so the MutationObserver has a stable ref;
          hidden while loading/error to avoid flash of un-styled content.
          Background is kept transparent so the surrounding UI theme shows
          through naturally in both light and dark mode. */}
      <div
        ref={containerRef}
        className={`tikzjax-container flex justify-center overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700 p-4${status !== 'success' ? ' hidden' : ''}`}
        style={isDark ? { filter: 'invert(1) hue-rotate(180deg)' } : undefined}
      />
    </div>
  );
};
