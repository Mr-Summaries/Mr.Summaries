import React, { useEffect, useRef, useState } from 'react';
import { normalizeTikz } from './tikzUtils';
export { normalizeTikz } from './tikzUtils';
import { useThemeStore } from '../store/useThemeStore';

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
// tikzjax.js sets window.onload = async function(){ ... } and that function
// scans ALL <script type="text/tikz"> elements currently in the DOM and renders
// them sequentially.  We call it manually here (the native page onload fired
// before any React TikzRenderer components mounted).
// Using a microtask debounce ensures that if many blocks mount simultaneously
// only a single window.onload() call is made per tick.
let triggerScheduled = false;

export function scheduleTikzRendering(): void {
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

// ── Component ─────────────────────────────────────────────────────────────────
type RenderStatus = 'loading' | 'success' | 'error';

export const TikzRenderer = ({ children }: { children: string }) => {
  const [status,   setStatus]   = useState<RenderStatus>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useThemeStore();
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

    function finish(ok: boolean, msg = '') {
      if (!alive) return;
      obs?.disconnect(); obs = null;
      if (timer) { clearTimeout(timer); timer = null; }
      if (ok) setStatus('success');
      else    { setStatus('error'); setErrorMsg(msg); }
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

      // 4. Trigger tikzjax processing (debounced so concurrent mounts coalesce)
      scheduleTikzRendering();

      // 5. Safety timeout – never leave the block in an infinite loading state
      timer = setTimeout(
        () => finish(false, 'TikZ rendering timed out'),
        RENDER_TIMEOUT_MS,
      );
    }

    go();

    return () => {
      alive = false;
      obs?.disconnect(); obs = null;
      if (timer) { clearTimeout(timer); timer = null; }
    };
  }, [children]);

  return (
    <div className="tikzjax-wrapper my-4">
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
          In dark mode a CSS invert filter is applied so black strokes/text
          become white and the white SVG background becomes dark, maintaining
          contrast without requiring any changes to the authored TikZ source. */}
      <div
        ref={containerRef}
        style={isDark ? { filter: 'invert(1) hue-rotate(180deg)' } : undefined}
        className={`tikzjax-container flex justify-center overflow-x-auto bg-white rounded-lg border border-zinc-200 dark:border-zinc-700 p-4${status !== 'success' ? ' hidden' : ''}`}
      />
    </div>
  );
};
