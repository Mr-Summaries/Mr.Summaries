import React, { useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { motion } from 'motion/react';
import 'katex/dist/katex.min.css';
import remarkMergeSvg from './remarkMergeSvg';

interface SectionNode {
  id: string;
  title: string;
  content: string;
  level: number;
  children: SectionNode[];
}

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\u0590-\u05fe\w-]+/g, '') // Remove all non-word chars (keep Hebrew)
    .replace(/--+/g, '-');    // Replace multiple - with single -
};

const parseSections = (text: string): SectionNode[] => {
  const rawSections = (text || '').split(/(?=^#{1,6}\s)/m).filter(s => s.trim().length > 0);
  const rootNodes: SectionNode[] = [];
  const stack: SectionNode[] = [];

  const usedIds = new Set<string>();

  rawSections.forEach((content, idx) => {
    const match = content.match(/^(#{1,6})\s+(.*)/);
    const level = match ? match[1].length : 6;
    const title = match ? match[2].trim() : `Section ${idx + 1}`;
    let baseId = slugify(title) || `sec-${idx}`;
    let id = baseId;
    let counter = 1;
    
    while (usedIds.has(id)) {
      id = `${baseId}-${counter}`;
      counter++;
    }
    usedIds.add(id);
    
    const node: SectionNode = { id, title, content, level, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      rootNodes.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  });

  return rootNodes;
};

import { Mermaid } from './Mermaid';
import remarkMark, { markHandler } from './remarkMark';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const proseClasses = "prose prose-zinc prose-invert max-w-none prose-headings:font-bold prose-h1:text-cyan-400 prose-h2:text-teal-400 prose-h3:text-emerald-400 prose-h4:text-amber-400 prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-emerald-400 prose-code:text-pink-400 prose-code:bg-pink-900/20 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-700 prose-blockquote:border-s-4 prose-blockquote:border-cyan-500 prose-blockquote:bg-cyan-900/20 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-e-lg prose-blockquote:text-cyan-200 prose-li:marker:text-cyan-500 prose-img:rounded-xl prose-img:shadow-md";

const markdownComponents = {
  pre({ children, node, ...props }: any) {
    // For mermaid and svg blocks the `code` component returns its own
    // styled component; bypass the `<pre>` wrapper so its
    // prose-pre dark background doesn't bleed through.
    const codeClass: string =
      node?.children?.[0]?.properties?.className?.[0] ?? '';
    if (/^language-(mermaid|svg)$/.test(codeClass)) {
      return <>{children}</>;
    }
    if (codeClass.startsWith('language-')) {
      return <>{children}</>;
    }
    return <pre {...props}>{children}</pre>;
  },
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    if (!inline && match && match[1] === 'mermaid') {
      return <Mermaid chart={String(children).replace(/\n$/, '')} />;
    }
    if (!inline && match && match[1] === 'svg') {
      return <span dangerouslySetInnerHTML={{ __html: String(children).replace(/\n$/, '') }} className="svg-renderer" />;
    }
    if (!inline && match) {
      return (
        <SyntaxHighlighter
          {...props}
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          CodeTag="span"
          className="rounded-md !my-4 !bg-zinc-900 border border-zinc-700"
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      );
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }
};

const SectionRenderer = React.memo(({ node, index }: { node: SectionNode, index: number }) => {
  let containerClasses = '';
  if (node.level === 1) {
    containerClasses = 'p-6 sm:p-8 rounded-3xl bg-zinc-900/60 border border-zinc-700/50 shadow-sm mb-8 backdrop-blur-xl scroll-mt-24';
  } else if (node.level === 2) {
    containerClasses = 'p-5 sm:p-6 rounded-2xl bg-zinc-800/50 border border-zinc-600/50 shadow-sm mt-6 backdrop-blur-lg scroll-mt-24';
  } else if (node.level === 3) {
    containerClasses = 'p-4 sm:p-5 rounded-xl bg-zinc-700/40 border border-zinc-500/50 shadow-sm mt-4 backdrop-blur-md scroll-mt-24';
  } else {
    containerClasses = 'p-3 sm:p-4 rounded-lg bg-zinc-600/30 border border-zinc-400/50 shadow-sm mt-4 backdrop-blur-sm scroll-mt-24';
  }

  return (
    <motion.div
      id={node.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className={containerClasses}
      data-section-title={node.title}
    >
      <div className={proseClasses}>
        <ReactMarkdown 
          remarkPlugins={[remarkGfm, remarkMath, remarkBreaks, remarkMark, remarkMergeSvg]} 
          rehypePlugins={[
            rehypeRaw,
            [rehypeKatex, { strict: false }]
          ]}
          remarkRehypeOptions={{ handlers: { mark: markHandler } as Record<string, unknown> }}
          components={markdownComponents}
        >
          {node.content}
        </ReactMarkdown>
      </div>
      
      {node.children.length > 0 && (
        <div className="mt-2">
          {node.children.map((child, idx) => (
            <SectionRenderer key={child.id} node={child} index={idx} />
          ))}
        </div>
      )}
    </motion.div>
  );
});

export const NestedMarkdown = React.memo(({ content, rightAlign = false, onTOCChange }: { content: string, rightAlign?: boolean, onTOCChange?: (toc: { id: string, title: string, level: number }[]) => void }) => {
  const rootNodes = useMemo(() => parseSections(content), [content]);
  
  useEffect(() => {
    if (onTOCChange) {
      const toc: { id: string, title: string, level: number }[] = [];
      const flatten = (nodes: SectionNode[]) => {
        nodes.forEach(node => {
          toc.push({ id: node.id, title: node.title, level: node.level });
          flatten(node.children);
        });
      };
      flatten(rootNodes);
      onTOCChange(toc);
    }
  }, [rootNodes, onTOCChange]);

  return (
    <div className={`pb-12 ${rightAlign ? 'text-right' : 'text-left'}`} dir={rightAlign ? 'rtl' : 'ltr'}>
      {rootNodes.map((node, idx) => (
        <SectionRenderer key={node.id} node={node} index={idx} />
      ))}
    </div>
  );
});
