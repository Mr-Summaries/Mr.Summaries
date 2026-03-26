/**
 * Unit tests for SVG support (SvgRenderer helpers and markdown pipeline).
 *
 * These run in Node.js (no browser required) and validate the parts that are
 * safe to test without a DOM.  Browser-specific behaviour (SVG rendering in the
 * DOM) must be verified manually.
 *
 * There is currently no test runner (Jest/Vitest) configured in the project.
 * This file uses a minimal inline harness so it can be run directly with
 * `npx tsx src/components/__tests__/svgRenderer.test.ts`.
 * When a test runner is added, the harness can be replaced with the runner's
 * describe/it/expect API without changing the test logic.
 *
 * Run:  npx tsx src/components/__tests__/svgRenderer.test.ts
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { sanitizeSvg, isSafeSvg, rewriteSvgRoot } from '../svgUtils';

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
// sanitizeSvg – basic pass-through
// --------------------------------------------------------------------------
describe('sanitizeSvg – valid SVG is returned unchanged (safe content)', () => {
  const input = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>';
  const result = sanitizeSvg(input);
  assert(result.includes('<svg'), 'output contains <svg');
  assert(result.includes('<circle'), 'output preserves <circle>');
  assert(result.length > 0, 'output is non-empty');
});

describe('sanitizeSvg – returns empty string for non-SVG input', () => {
  assert(sanitizeSvg('') === '', 'empty string returns empty string');
  assert(sanitizeSvg('<div>hello</div>') === '', 'non-svg HTML returns empty string');
  assert(sanitizeSvg('just text') === '', 'plain text returns empty string');
});

// --------------------------------------------------------------------------
// sanitizeSvg – script removal
// --------------------------------------------------------------------------
describe('sanitizeSvg – removes <script> blocks', () => {
  const input = '<svg><script>alert("xss")</script><circle cx="50" cy="50" r="40"/></svg>';
  const result = sanitizeSvg(input);
  assert(!result.includes('<script'), 'script tag is removed');
  assert(!result.includes('alert'), 'script content is removed');
  assert(result.includes('<circle'), 'safe content is preserved');
});

describe('sanitizeSvg – removes multi-line <script> blocks', () => {
  const input = '<svg>\n<script type="text/javascript">\nvar x = 1;\nalert(x);\n</script>\n<rect/>\n</svg>';
  const result = sanitizeSvg(input);
  assert(!result.includes('<script'), 'multiline script tag is removed');
  assert(!result.includes('alert'), 'script content is removed');
  assert(result.includes('<rect'), 'safe rect element is preserved');
});

describe('sanitizeSvg – removes self-closing <script/> tags', () => {
  const input = '<svg><script src="evil.js"/><text>hello</text></svg>';
  const result = sanitizeSvg(input);
  assert(!result.includes('<script'), 'self-closing script tag is removed');
  assert(result.includes('<text'), 'text element is preserved');
});

// --------------------------------------------------------------------------
// sanitizeSvg – foreignObject removal
// --------------------------------------------------------------------------
describe('sanitizeSvg – removes <foreignObject> blocks', () => {
  const input = '<svg><foreignObject><div>xss via html</div></foreignObject><circle r="5"/></svg>';
  const result = sanitizeSvg(input);
  assert(!result.includes('foreignObject'), 'foreignObject is removed');
  assert(!result.includes('<div'), 'embedded HTML inside foreignObject is removed');
  assert(result.includes('<circle'), 'safe content is preserved');
});

describe('sanitizeSvg – removes self-closing <foreignObject/>', () => {
  const input = '<svg><foreignObject width="100" height="100"/><text>ok</text></svg>';
  const result = sanitizeSvg(input);
  assert(!result.includes('foreignObject'), 'self-closing foreignObject is removed');
  assert(result.includes('<text'), 'text element is preserved');
});

// --------------------------------------------------------------------------
// sanitizeSvg – event handler removal
// --------------------------------------------------------------------------
describe('sanitizeSvg – removes on* event handler attributes', () => {
  const input = '<svg><circle cx="50" cy="50" r="40" onload="alert(1)" onclick="evil()"/></svg>';
  const result = sanitizeSvg(input);
  assert(!result.includes('onload'), 'onload attribute is removed');
  assert(!result.includes('onclick'), 'onclick attribute is removed');
  assert(!result.includes('alert'), 'event handler content is removed');
  assert(result.includes('<circle'), 'circle element is preserved');
});

describe('sanitizeSvg – removes onmouseover and other on* handlers', () => {
  const input = '<svg><rect onmouseover="alert(2)" onfocus="evil()" width="100" height="100"/></svg>';
  const result = sanitizeSvg(input);
  assert(!result.includes('onmouseover'), 'onmouseover removed');
  assert(!result.includes('onfocus'), 'onfocus removed');
  assert(result.includes('<rect'), 'rect element is preserved');
});

// --------------------------------------------------------------------------
// sanitizeSvg – javascript: URI removal
// --------------------------------------------------------------------------
describe('sanitizeSvg – removes javascript: URIs from href', () => {
  const input = '<svg><a href="javascript:alert(1)"><text>click me</text></a></svg>';
  const result = sanitizeSvg(input);
  assert(!result.includes('javascript:'), 'javascript: URI is removed');
  assert(result.includes('<text'), 'text element is preserved');
});

describe('sanitizeSvg – removes javascript: URIs from xlink:href', () => {
  const input = '<svg><use xlink:href="javascript:void(0)"/></svg>';
  const result = sanitizeSvg(input);
  assert(!result.includes('javascript:'), 'javascript: xlink:href is removed');
});

// --------------------------------------------------------------------------
// sanitizeSvg – safe attributes preserved
// --------------------------------------------------------------------------
describe('sanitizeSvg – preserves safe SVG attributes', () => {
  const input = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect x="10" y="10" width="80" height="80" fill="blue" stroke="black"/></svg>';
  const result = sanitizeSvg(input);
  assert(result.includes('viewBox'), 'viewBox is preserved');
  assert(result.includes('fill="blue"'), 'fill attribute is preserved');
  assert(result.includes('stroke="black"'), 'stroke attribute is preserved');
  assert(result.includes('xmlns'), 'xmlns namespace is preserved');
});

// --------------------------------------------------------------------------
// sanitizeSvg – marker / defs preservation (regression for arrow diagrams)
// --------------------------------------------------------------------------
describe('sanitizeSvg – preserves <defs> and <marker> elements', () => {
  const input =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100">' +
    '<defs>' +
    '<marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto">' +
    '<path d="M 0 0 L 10 5 L 0 10 z" fill="#333"/>' +
    '</marker>' +
    '</defs>' +
    '<line x1="30" y1="60" x2="270" y2="60" stroke="#333" marker-end="url(#arr)"/>' +
    '</svg>';
  const result = sanitizeSvg(input);
  assert(result.includes('<defs>'), '<defs> element is preserved');
  assert(result.includes('<marker'), '<marker> element is preserved');
  assert(result.includes('<path'), '<path> inside marker is preserved');
  assert(result.includes('marker-end="url(#arr)"'), 'marker-end url(#id) reference is preserved');
});

describe('sanitizeSvg – preserves marker-start and marker-end attributes', () => {
  const input =
    '<svg xmlns="http://www.w3.org/2000/svg">' +
    '<line x1="0" y1="0" x2="100" y2="0" marker-start="url(#s)" marker-end="url(#e)"/>' +
    '</svg>';
  const result = sanitizeSvg(input);
  assert(result.includes('marker-start="url(#s)"'), 'marker-start attribute is preserved');
  assert(result.includes('marker-end="url(#e)"'), 'marker-end attribute is preserved');
});

describe('sanitizeSvg – preserves complete arrow-diagram SVG (regression)', () => {
  const arrowSvg =
    '<svg width="300" height="100" viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg">' +
    '<defs>' +
    '<marker id="arrow-black-start" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">' +
    '<path d="M 10 0 L 0 5 L 10 10 z" fill="#333333"/>' +
    '</marker>' +
    '<marker id="arrow-black-end" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto">' +
    '<path d="M 0 0 L 10 5 L 0 10 z" fill="#333333"/>' +
    '</marker>' +
    '</defs>' +
    '<line x1="30" y1="60" x2="270" y2="60" stroke="#333333" marker-start="url(#arrow-black-start)" marker-end="url(#arrow-black-end)"/>' +
    '<circle cx="90" cy="60" r="4.5" fill="#ffffff" stroke="#0055cc" stroke-width="2"/>' +
    '<text x="150" y="38" text-anchor="middle">(a, b)</text>' +
    '</svg>';
  const result = sanitizeSvg(arrowSvg);
  assert(result.includes('<defs>'), '<defs> preserved in full diagram');
  assert(result.includes('id="arrow-black-start"'), 'marker id preserved');
  assert(result.includes('id="arrow-black-end"'), 'marker id preserved');
  assert(result.includes('orient="auto-start-reverse"'), 'orient attribute preserved');
  assert(result.includes('marker-start="url(#arrow-black-start)"'), 'marker-start url(#id) preserved');
  assert(result.includes('marker-end="url(#arrow-black-end)"'), 'marker-end url(#id) preserved');
  assert(result.includes('<circle'), 'circle element preserved');
  assert(result.includes('<text'), 'text element preserved');
  assert(!result.includes('<script'), 'no script injection');
});

// --------------------------------------------------------------------------
// rewriteSvgRoot – runtime transformation tests
// --------------------------------------------------------------------------
describe('rewriteSvgRoot – sets width="100%" on the svg tag', () => {
  const input = '<svg width="300" height="100"><circle r="5"/></svg>';
  const result = rewriteSvgRoot(input);
  assert(result.includes('width="100%"'), 'width is set to 100%');
  assert(!result.includes('width="300"'), 'original pixel width is removed');
});

describe('rewriteSvgRoot – injects style="height:auto" when viewBox is present', () => {
  const input = '<svg width="300" height="100" viewBox="0 0 300 100"><rect/></svg>';
  const result = rewriteSvgRoot(input);
  assert(result.includes('width="100%"'), 'width is 100%');
  assert(!result.includes('height="100"'), 'explicit height attribute is removed');
  assert(result.includes('height:auto'), 'style="height:auto" is injected');
});

describe('rewriteSvgRoot – preserves height when no viewBox is present', () => {
  const input = '<svg width="300" height="150"><rect/></svg>';
  const result = rewriteSvgRoot(input);
  assert(result.includes('width="100%"'), 'width is 100%');
  assert(result.includes('height="150"'), 'height is preserved when no viewBox');
  assert(!result.includes('height:auto'), 'no style="height:auto" without viewBox');
});

describe('rewriteSvgRoot – merges height:auto into existing style attribute', () => {
  const input = '<svg width="200" height="100" viewBox="0 0 200 100" style="display:block"><rect/></svg>';
  const result = rewriteSvgRoot(input);
  assert(result.includes('height:auto'), 'height:auto is added');
  assert(result.includes('display:block'), 'existing style property is preserved');
  // Must not produce a double semicolon
  assert(!result.includes(';;'), 'no double semicolons in style attribute');
});

describe('rewriteSvgRoot – existing style with trailing semicolon does not produce double semicolon', () => {
  const input = '<svg width="200" height="100" viewBox="0 0 200 100" style="display:block;"><rect/></svg>';
  const result = rewriteSvgRoot(input);
  assert(result.includes('height:auto'), 'height:auto is added');
  assert(!result.includes(';;'), 'no double semicolons when existing style ends with ;');
});

describe('rewriteSvgRoot – full arrow-diagram SVG renders with correct attributes', () => {
  const input =
    '<svg width="300" height="100" viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg">' +
    '<defs>' +
    '<marker id="arrow-black-start" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">' +
    '<path d="M 10 0 L 0 5 L 10 10 z" fill="#333333"/>' +
    '</marker>' +
    '</defs>' +
    '<line x1="30" y1="60" x2="270" y2="60" stroke="#333333" marker-start="url(#arrow-black-start)" marker-end="url(#arrow-black-end)"/>' +
    '</svg>';
  const result = rewriteSvgRoot(input);
  assert(result.includes('width="100%"'), 'width is 100%');
  assert(result.includes('height:auto'), 'height:auto is injected');
  assert(!result.includes('height="100"'), 'explicit height removed');
  assert(result.includes('viewBox="0 0 300 100"'), 'viewBox preserved');
  assert(result.includes('<defs>'), '<defs> preserved');
  assert(result.includes('marker-start="url(#arrow-black-start)"'), 'marker-start preserved');
  assert(result.includes('marker-end="url(#arrow-black-end)"'), 'marker-end preserved');
});

// --------------------------------------------------------------------------
// isSafeSvg
// --------------------------------------------------------------------------
describe('isSafeSvg – returns true for valid SVG', () => {
  assert(isSafeSvg('<svg viewBox="0 0 10 10"><circle r="5"/></svg>'), 'valid SVG returns true');
});

describe('isSafeSvg – returns false for non-SVG', () => {
  assert(!isSafeSvg(''), 'empty string returns false');
  assert(!isSafeSvg('<div>not svg</div>'), 'non-SVG HTML returns false');
});

// --------------------------------------------------------------------------
// SvgRenderer.tsx – structural requirements
// --------------------------------------------------------------------------
describe('SvgRenderer.tsx – structural requirements', () => {
  const src = readFileSync(resolve(__dirname, '../SvgRenderer.tsx'), 'utf8');

  assert(src.includes('sanitizeSvg'), 'uses sanitizeSvg for sanitization');
  assert(src.includes('dangerouslySetInnerHTML'), 'renders via dangerouslySetInnerHTML after sanitization');
  assert(src.includes('useMemo'), 'uses useMemo to avoid re-sanitizing on every render');
  assert(src.includes('width="100%"'), 'sets responsive width="100%"');
  assert(
    src.includes('height:auto'),
    'injects style="height:auto" when viewBox is present to prevent 150px intrinsic-height fallback',
  );
  assert(src.includes('dir="ltr"'), 'pins dir="ltr" to prevent RTL parent from distorting diagram');
  assert(src.includes('overflow-x-auto'), 'uses overflow-x-auto for wide SVGs');
  assert(
    src.includes('Invalid SVG') || src.includes('invalid svg') || src.includes('invalid SVG'),
    'shows error message for invalid/empty SVG input',
  );
  assert(
    src.includes('not-prose'),
    'adds not-prose class to opt SVG content out of Tailwind Typography prose styles',
  );
});

// --------------------------------------------------------------------------
// index.css – SVG text rendering fix
// --------------------------------------------------------------------------
describe('index.css – SVG <text> display fix prevents prose context from breaking SVG rendering', () => {
  const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');

  assert(
    css.includes('display: inline') || css.includes('display:inline'),
    'explicitly sets display:inline on SVG text elements to keep them in SVG coordinate-based layout',
  );
  assert(
    css.includes('svg text') && (css.includes('.svg-renderer') || css.includes('svg-renderer')),
    'the display:inline rule is scoped to .svg-renderer svg text (not global)',
  );
  assert(
    css.includes('svg tspan'),
    'covers tspan elements in addition to text',
  );
});

// --------------------------------------------------------------------------
// NestedMarkdown.tsx – SVG routing
// --------------------------------------------------------------------------
describe('NestedMarkdown.tsx – routes language-svg code blocks to SvgRenderer', () => {
  const src = readFileSync(resolve(__dirname, '../NestedMarkdown.tsx'), 'utf8');

  assert(src.includes("match[1] === 'svg'"), 'detects language-svg code blocks');
  assert(src.includes('SvgRenderer'), 'routes svg blocks to SvgRenderer');
  assert(!src.includes('TikzRenderer'), 'no TikzRenderer reference');
  assert(!src.includes('tikzUtils'), 'no tikzUtils reference');
  assert(!src.includes("match[1] === 'tikz'"), 'no tikz language routing');
});

// --------------------------------------------------------------------------
// index.html checks – no TikZJax references
// --------------------------------------------------------------------------
describe('index.html – no TikZJax references', () => {
  const html = readFileSync(resolve(__dirname, '../../../index.html'), 'utf8');
  assert(!html.includes('tikzjax'), 'no tikzjax reference in index.html');
  assert(!html.includes('fonts.css'), 'no tikzjax fonts.css link in index.html');
});

// --------------------------------------------------------------------------
// public/ directory – tikzjax.js removed
// --------------------------------------------------------------------------
describe('public/ – tikzjax.js asset is removed', () => {
  let exists = false;
  try {
    const content = readFileSync(resolve(__dirname, '../../../public/tikzjax.js'));
    exists = content.length > 0;
  } catch (_) {
    exists = false;
  }
  assert(!exists, 'tikzjax.js is no longer present in public/ directory');
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
    assert(strongs[0]?.children?.[0]?.type === 'mark', 'mark is child of strong');
    assert(marks[0]?.children?.[0]?.value === 'bold highlight', 'mark text is "bold highlight"');
  });

  describe('remarkMark – math inside highlight ==text $U$ more==', () => {
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

// --------------------------------------------------------------------------
// Math rendering tests
// --------------------------------------------------------------------------
async function runMathRenderingTests() {
  const { unified } = await import('unified');
  const { default: remarkParse } = await import('remark-parse');
  const { default: remarkMath } = await import('remark-math');
  const { default: remarkGfm } = await import('remark-gfm');
  const { default: remarkRehype } = await import('remark-rehype');
  const { default: rehypeKatex } = await import('rehype-katex');
  const { default: rehypeStringify } = await import('rehype-stringify');
  const { default: rehypeRaw } = await import('rehype-raw');

  /** Run the exact same pipeline as NestedMarkdown (no custom macros). */
  async function renderMd(markdown: string): Promise<string> {
    const file = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype)
      .use(rehypeRaw)
      .use(rehypeKatex, { strict: false })
      .use(rehypeStringify)
      .process(markdown);
    return String(file);
  }

  // ── Test 1: basic inline math still renders ──
  describe('math – basic inline expression $x^2$ renders without error', async () => {
    const html = await renderMd('inline $x^2$ math');
    assert(!html.includes('katex-error'), 'no katex-error for simple x^2');
    assert(html.includes('katex'), 'KaTeX output present');
  });

  // ── Test 2: ==highlight== still works alongside math ──
  describe('math – ==highlight== + math co-exist', async () => {
    const { default: remarkMark } = await import('../remarkMark.js');
    const { markHandler } = await import('../remarkMark.js');
    const { default: remarkRehype2 } = await import('remark-rehype');
    const file = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkMark)
      .use(remarkRehype2, { handlers: { mark: markHandler } as Record<string, unknown> })
      .use(rehypeRaw)
      .use(rehypeKatex, { strict: false })
      .use(rehypeStringify)
      .process('==marked== and $x^2$');
    const html = String(file);
    assert(html.includes('<mark>'), '==...== produces <mark> tag');
    assert(!html.includes('katex-error'), 'no katex-error with highlight+math');
  });

  // ── Test 3: svg fenced block is detected ──
  describe('math – svg fenced block has language-svg class', async () => {
    const md = '```svg\n<svg viewBox="0 0 10 10"><circle r="5"/></svg>\n```';
    const html = await renderMd(md);
    assert(html.includes('language-svg'), 'svg fenced code block has language-svg class');
    assert(!html.includes('katex-error'), 'svg block does not produce katex-error');
  });
}

// --------------------------------------------------------------------------
// remark-breaks – soft line breaks become <br>
// --------------------------------------------------------------------------
async function runRemarkBreaksTests() {
  const { unified } = await import('unified');
  const { default: remarkParse } = await import('remark-parse');
  const { default: remarkGfm } = await import('remark-gfm');
  const { default: remarkMath } = await import('remark-math');
  const { default: remarkBreaks } = await import('remark-breaks');
  const { default: remarkMark } = await import('../remarkMark.js');
  const { markHandler } = await import('../remarkMark.js');
  const { default: remarkRehype } = await import('remark-rehype');
  const { default: rehypeKatex } = await import('rehype-katex');
  const { default: rehypeStringify } = await import('rehype-stringify');
  const { default: rehypeRaw } = await import('rehype-raw');

  /** Same pipeline as NestedMarkdown (with remark-breaks, remark-math, remark-gfm, and remarkMark). */
  async function renderMd(markdown: string): Promise<string> {
    const file = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkBreaks)
      .use(remarkMark)
      .use(remarkRehype, { handlers: { mark: markHandler } as Record<string, unknown> })
      .use(rehypeRaw)
      .use(rehypeKatex, { strict: false })
      .use(rehypeStringify)
      .process(markdown);
    return String(file);
  }

  // ── Test 1: single newline produces <br> ──
  describe('remark-breaks – single newline becomes <br>', async () => {
    const html = await renderMd('line one\nline two');
    assert(html.includes('<br'), 'single \\n produces <br> element');
  });

  // ── Test 2: math still renders alongside line breaks ──
  describe('remark-breaks – math renders correctly with line breaks', async () => {
    const html = await renderMd('first line\n$x^2$ second line');
    assert(html.includes('<br'), 'line break present');
    assert(html.includes('katex'), 'KaTeX output present');
    assert(!html.includes('katex-error'), 'no katex-error');
  });

  // ── Test 3: ==highlight== still works with remark-breaks ──
  describe('remark-breaks – ==highlight== still produces <mark>', async () => {
    const html = await renderMd('first line\n==highlighted== text');
    assert(html.includes('<br'), 'line break present');
    assert(html.includes('<mark>'), '==...== produces <mark> tag');
  });

  // ── Test 4: svg fenced block is not broken by remark-breaks ──
  describe('remark-breaks – svg fenced block unaffected by remark-breaks', async () => {
    const md = '```svg\n<svg viewBox="0 0 10 10"><circle r="5"/></svg>\n```';
    const html = await renderMd(md);
    assert(html.includes('language-svg'), 'svg fenced code block has language-svg class');
    assert(!html.includes('katex-error'), 'no katex-error in svg block');
  });
}

// Run async tests and defer summary
const asyncTestsDone = Promise.all([
  runRemarkMarkTests().catch((e) => {
    console.error('\nremarkMark async tests failed to load:', e);
    failed++;
  }),
  runMathRenderingTests().catch((e) => {
    console.error('\nmath rendering async tests failed to load:', e);
    failed++;
  }),
  runRemarkBreaksTests().catch((e) => {
    console.error('\nremarkBreaks async tests failed to load:', e);
    failed++;
  }),
]);

// --------------------------------------------------------------------------
// Summary (after async tests)
// --------------------------------------------------------------------------
asyncTestsDone.then(() => {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
});
