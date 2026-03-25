/**
 * Pure-logic unit tests for TikzRenderer helpers.
 *
 * These run in Node.js (no browser required) and validate the parts that are
 * safe to test without a DOM.  Browser-specific behaviour (script loading,
 * MutationObserver, SVG output) must be verified manually – see the PR
 * description for the manual verification checklist.
 *
 * There is currently no test runner (Jest/Vitest) configured in the project.
 * This file uses a minimal inline harness so it can be run directly with
 * `npx tsx src/components/__tests__/tikzRenderer.test.ts`.
 * When a test runner is added, the harness can be replaced with the runner's
 * describe/it/expect API without changing the test logic.
 *
 * Run:  npx tsx src/components/__tests__/tikzRenderer.test.ts
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { normalizeTikz } from '../tikzUtils';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --------------------------------------------------------------------------
// Minimal test harness
// --------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    failed++;
  }
}

function describe(suite: string, fn: () => void) {
  console.log(`\n${suite}`);
  fn();
}

// --------------------------------------------------------------------------
// normalizeTikz
// --------------------------------------------------------------------------
describe('normalizeTikz – content already has \\begin{document}', () => {
  const input = `\\begin{document}\n\\begin{tikzpicture}\n\\end{tikzpicture}\n\\end{document}`;
  const result = normalizeTikz(input);
  assert(result === input.trim(), 'returns content unchanged');
  assert(!result.startsWith('\\begin{document}\n\\begin{document}'), 'does not double-wrap');
});

describe('normalizeTikz – bare tikzpicture without \\begin{document}', () => {
  const bare = `\\begin{tikzpicture}\n\\draw (0,0) -- (1,1);\n\\end{tikzpicture}`;
  const result = normalizeTikz(bare);
  assert(result.startsWith('\\begin{document}'), 'wraps with \\begin{document}');
  assert(result.endsWith('\\end{document}'), 'closes with \\end{document}');
  assert(result.includes(bare.trim()), 'preserves original content');
});

describe('normalizeTikz – leading/trailing whitespace is trimmed first', () => {
  const withSpaces = `  \n  \\begin{document}\n\\end{document}  \n`;
  const result = normalizeTikz(withSpaces);
  assert(!result.startsWith(' '), 'no leading whitespace');
  assert(!result.endsWith(' '), 'no trailing whitespace');
  assert(!result.startsWith('\\begin{document}\n\\begin{document}'), 'does not double-wrap');
});

describe('normalizeTikz – \\begin{document} with optional whitespace gap matches', () => {
  // Regex is \begin\s*{document}: whitespace between \begin and {document} is ignored
  const withGap = `\\begin   {document}\n\\end{document}`;
  const result = normalizeTikz(withGap);
  assert(!result.startsWith('\\begin{document}\n\\begin{'), 'does not double-wrap when gap between \\begin and {document}');
});

describe('normalizeTikz – empty string produces valid wrapper', () => {
  const result = normalizeTikz('');
  assert(result.includes('\\begin{document}'), 'contains \\begin{document}');
  assert(result.includes('\\end{document}'), 'contains \\end{document}');
});

// --------------------------------------------------------------------------
// Source-level structural checks
// (verify key implementation properties without requiring a browser)
// --------------------------------------------------------------------------
describe('TikzRenderer.tsx – structural requirements', () => {
  const src = readFileSync(resolve(__dirname, '../TikzRenderer.tsx'), 'utf8');

  assert(src.includes('export function ensureTikzJaxLoaded'), 'ensureTikzJaxLoaded is exported');
  assert(src.includes('export function scheduleTikzRendering'), 'scheduleTikzRendering is exported');
  assert(
    src.includes('normalizeTikz') && (
      src.includes("export function normalizeTikz") ||
      src.includes("export { normalizeTikz")
    ),
    'normalizeTikz is exported (directly or via re-export)',
  );
  assert(src.includes("'/tikzjax.js'"), 'uses local /tikzjax.js URL (not broken CDN)');
  assert(!src.includes('process_tikz'), 'does not call non-existent process_tikz');
  assert(!src.includes('somethingorother'), 'does not reference broken CDN URL');
  assert(src.includes('RENDER_TIMEOUT_MS'), 'defines render timeout constant');
  assert(src.includes('LOAD_TIMEOUT_MS'), 'defines library load timeout constant');
  assert(src.includes('MutationObserver'), 'uses MutationObserver for render completion');
  assert(src.includes("status === 'error'"), 'has per-block error state');
  assert(src.includes("status === 'loading'"), 'has per-block loading state');
  assert(src.includes("status !== 'success'") || src.includes("status === 'success'"), 'has per-block success state');
  assert(src.includes('lib.listeners'), 'uses shared listener array for singleton loading');
});

// --------------------------------------------------------------------------
// Theme-aware style checks
// --------------------------------------------------------------------------
describe('TikzRenderer.tsx - theme-aware styles (light & dark mode)', () => {
  const src = readFileSync(resolve(__dirname, '../TikzRenderer.tsx'), 'utf8');

  // Loading state must not use a hardcoded-dark-only background
  assert(
    !src.includes("bg-zinc-800 text-zinc-300"),
    'loading state does not use hardcoded dark-only background (bg-zinc-800 text-zinc-300)',
  );

  // Loading state must have both light-mode AND dark-mode background in the same element
  assert(
    src.includes('bg-white dark:bg-zinc-100') || src.includes('bg-zinc-50 dark:bg-zinc-100'),
    'loading state has light-mode background with a dark-mode variant (e.g. bg-white dark:bg-zinc-100)',
  );

  // tikzjax-container must carry its own light canvas background in the class string
  assert(
    src.includes('tikzjax-container flex justify-center overflow-x-auto bg-white dark:bg-zinc-100'),
    'tikzjax-container has light canvas and dark-mode variant in its class string',
  );

  // Container should have a border for delineation in both modes, within the container class string
  assert(
    src.includes('border-zinc-200 dark:border-zinc-300') || src.includes('border-zinc-200 dark:border-zinc-400'),
    'container class string has theme-aware border classes',
  );

  // Container should handle wide diagrams gracefully
  assert(
    src.includes('overflow-x-auto'),
    'tikzjax-container uses overflow-x-auto for wide diagrams',
  );
});

// --------------------------------------------------------------------------
// public/tikzjax.js presence check
// --------------------------------------------------------------------------
describe('public/tikzjax.js – asset presence', () => {
  const publicPath = resolve(__dirname, '../../../public/tikzjax.js');
  let exists = false;
  try {
    const stat = readFileSync(publicPath);
    exists = stat.length > 0;
  } catch (_) {
    exists = false;
  }
  assert(exists, 'tikzjax.js is present in public/ directory and non-empty');
});

// --------------------------------------------------------------------------
// index.html checks
// --------------------------------------------------------------------------
describe('index.html – script tag checks', () => {
  const html = readFileSync(resolve(__dirname, '../../../index.html'), 'utf8');
  assert(!html.includes('somethingorother'), 'broken CDN URL removed from index.html');
  assert(!html.includes('tikzjax-demo'), 'tikzjax-demo URL removed from index.html');
  assert(html.includes('tikzjax.com/v1/fonts.css'), 'fonts.css CDN is still present');
});

// --------------------------------------------------------------------------
// Summary
// --------------------------------------------------------------------------
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

