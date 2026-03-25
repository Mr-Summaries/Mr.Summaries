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

  // Loading state must have a light-mode background and a dark-mode variant that is dark (zinc-800+)
  assert(
    src.includes('bg-white dark:bg-zinc-800') || src.includes('bg-zinc-50 dark:bg-zinc-800'),
    'loading state has white light-mode background and proper dark-mode variant (dark:bg-zinc-800)',
  );

  // tikzjax-container must carry a white canvas in light mode and a dark canvas in dark mode
  assert(
    src.includes('tikzjax-container flex justify-center overflow-x-auto bg-white dark:bg-zinc-800'),
    'tikzjax-container has white light-mode canvas and dark dark-mode canvas in its class string',
  );

  // Container border should be subtle in light mode and dark-appropriate in dark mode
  assert(
    src.includes('border-zinc-200 dark:border-zinc-700') || src.includes('border-zinc-200 dark:border-zinc-600'),
    'container class string has theme-aware border classes (dark border for dark mode)',
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
// remarkMark plugin – ==...== highlight syntax
// --------------------------------------------------------------------------
// Dynamic import so the ESM module resolves correctly under tsx.
async function runRemarkMarkTests() {
  const { unified } = await import('unified');
  const { default: remarkParse } = await import('remark-parse');
  const { default: remarkMath } = await import('remark-math');
  const { default: remarkGfm } = await import('remark-gfm');
  const { default: remarkMark } = await import('../remarkMark.js');

  function findNodes(node: any, type: string, results: any[] = []): any[] {
    if (node.type === type) results.push(node);
    if (node.children) node.children.forEach((c: any) => findNodes(c, type, results));
    return results;
  }

  function parse(markdown: string) {
    return unified().use(remarkParse).use(remarkGfm).use(remarkMath).use(remarkMark).parse(markdown);
  }

  describe('remarkMark – This is ==highlight== text.', () => {
    const marks = findNodes(parse('This is ==highlight== text.'), 'mark');
    assert(marks.length === 1, 'one mark node');
    assert(marks[0]?.children?.[0]?.value === 'highlight', 'mark contains correct text');
  });

  describe('remarkMark – ==one== and ==two==', () => {
    const marks = findNodes(parse('==one== and ==two=='), 'mark');
    assert(marks.length === 2, 'two mark nodes');
    assert(marks[0]?.children?.[0]?.value === 'one', 'first mark is "one"');
    assert(marks[1]?.children?.[0]?.value === 'two', 'second mark is "two"');
  });

  describe('remarkMark – no ==...== produces no mark nodes', () => {
    const marks = findNodes(parse('regular text without highlights'), 'mark');
    assert(marks.length === 0, 'no mark nodes for plain text');
  });

  describe('remarkMark – **==bold highlight==** (emphasis + mark)', () => {
    const tree = parse('**==bold highlight==**');
    const marks = findNodes(tree, 'mark');
    const strongs = findNodes(tree, 'strong');
    assert(marks.length === 1, 'one mark node');
    assert(strongs.length === 1, 'one strong node');
    // mark is nested inside strong
    assert(strongs[0]?.children?.[0]?.type === 'mark', 'mark is child of strong');
    assert(marks[0]?.children?.[0]?.value === 'bold highlight', 'mark text is "bold highlight"');
  });

  describe('remarkMark – math inside highlight ==text $U$ more==', () => {
    // The micromark extension handles this: inlineMath is a child of mark
    const marks = findNodes(parse('==text $U$ more=='), 'mark');
    assert(marks.length === 1, 'one mark node even with inline math inside');
    const childTypes = marks[0]?.children?.map((c: any) => c.type) ?? [];
    assert(childTypes.includes('inlineMath'), 'mark contains inlineMath child');
  });

  describe('remarkMark – Hebrew text with math ==נדגיש כי $U$ הוא==', () => {
    const marks = findNodes(parse('==נדגיש כי $U$ הוא=='), 'mark');
    assert(marks.length === 1, 'one mark node for Hebrew text with math');
    const childTypes = marks[0]?.children?.map((c: any) => c.type) ?? [];
    assert(childTypes.includes('text'), 'mark contains text child');
    assert(childTypes.includes('inlineMath'), 'mark contains inlineMath child');
  });

  describe('remarkMark – does not break regular markdown features', () => {
    const tree = parse('**bold** and *italic* and `code` and ==mark==');
    assert(findNodes(tree, 'strong').length === 1, 'strong still works');
    assert(findNodes(tree, 'emphasis').length === 1, 'emphasis still works');
    assert(findNodes(tree, 'inlineCode').length === 1, 'inlineCode still works');
    assert(findNodes(tree, 'mark').length === 1, 'mark works alongside other features');
  });

  describe('remarkMark – source file exports markHandler', () => {
    const src = readFileSync(resolve(__dirname, '../remarkMark.ts'), 'utf8');
    assert(src.includes('export function markHandler'), 'markHandler is exported from remarkMark.ts');
    assert(src.includes("tagName: 'mark'"), 'markHandler uses <mark> tag');
  });
}

// Run async tests and defer summary
const asyncTestsDone = runRemarkMarkTests().catch((e) => {
  console.error('\nremarkMark async tests failed to load:', e);
  failed++;
});

// --------------------------------------------------------------------------
// Summary (after async tests)
// --------------------------------------------------------------------------
asyncTestsDone.then(() => {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
});

