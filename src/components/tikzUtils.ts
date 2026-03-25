/**
 * Pure utility helpers for TikzRenderer.
 * Kept in a separate file so they can be imported by unit tests
 * without pulling in React or any DOM dependencies.
 */

/**
 * Ensures TikZ content is wrapped in \begin{document}…\end{document} as
 * required by tikzjax.  If the wrapper is already present the content is
 * returned unchanged (after trimming leading/trailing whitespace).
 */
export function normalizeTikz(raw: string): string {
  const trimmed = raw.trim();
  return /\\begin\s*\{document\}/.test(trimmed)
    ? trimmed
    : `\\begin{document}\n${trimmed}\n\\end{document}`;
}
