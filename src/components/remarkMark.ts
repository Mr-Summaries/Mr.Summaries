/**
 * Remark plugin that adds ==...== mark/highlight syntax.
 *
 * Uses micromark-extension-mark (a proper micromark tokeniser) so that
 * `==...==` can contain inline constructs such as bold, italic, and
 * inline-math (e.g. `==text $x$ more==`) without those being split across
 * separate text nodes.
 *
 * The resulting `mark` MDAST nodes must be converted to `<mark>` HAST
 * elements by passing a handler in `remarkRehypeOptions`:
 *
 * ```tsx
 * import remarkMark, { markHandler } from './remarkMark';
 *
 * <ReactMarkdown
 *   remarkPlugins={[remarkMark]}
 *   remarkRehypeOptions={{ handlers: { mark: markHandler } }}
 * />
 * ```
 */
import type { Plugin } from 'unified';
import type { Root } from 'mdast';
import type { State } from 'mdast-util-to-hast';
import { pandocMark } from 'micromark-extension-mark';

/**
 * Minimal fromMarkdown extension that converts the `mark` micromark tokens
 * produced by pandocMark() into `mark` MDAST nodes.
 * This is equivalent to `pandocMarkFromMarkdown` from mdast-util-mark but is
 * inlined here to avoid that package's TypeScript source errors.
 */
const markFromMarkdown = {
  canContainEols: ['mark'],
  enter: {
    mark(this: any, token: any) {
      this.enter({ type: 'mark', children: [] }, token);
    },
  },
  exit: {
    mark(this: any, token: any) {
      this.exit(token);
    },
  },
};

/** Remark transformer plugin: registers ==...== as a mark/highlight syntax. */
const remarkMark: Plugin<[], Root> = function () {
  const data = this.data() as {
    micromarkExtensions?: unknown[];
    fromMarkdownExtensions?: unknown[];
  };

  (data.micromarkExtensions ??= []).push(pandocMark());
  (data.fromMarkdownExtensions ??= []).push(markFromMarkdown);
};

/**
 * remark-rehype handler that converts a `mark` MDAST node into a
 * `<mark>` HAST element.  Pass this via `remarkRehypeOptions.handlers`.
 */
export function markHandler(state: State, node: { children?: unknown[] }) {
  return {
    type: 'element' as const,
    tagName: 'mark' as const,
    properties: {},
    children: state.all(node as Parameters<typeof state.all>[0]),
  };
}

export default remarkMark;
