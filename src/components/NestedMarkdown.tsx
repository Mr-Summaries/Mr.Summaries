import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'motion/react';

interface SectionNode {
  id: string;
  content: string;
  level: number;
  children: SectionNode[];
}

const parseSections = (text: string): SectionNode[] => {
  const rawSections = (text || '').split(/(?=^#{1,6}\s)/m).filter(s => s.trim().length > 0);
  const rootNodes: SectionNode[] = [];
  const stack: SectionNode[] = [];

  rawSections.forEach((content, idx) => {
    const match = content.match(/^(#{1,6})\s/);
    const level = match ? match[1].length : 6;
    
    const node: SectionNode = { id: `sec-${idx}`, content, level, children: [] };

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

const proseClasses = "prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-indigo-700 dark:prose-h1:text-indigo-400 prose-h2:text-teal-700 dark:prose-h2:text-teal-400 prose-h3:text-rose-600 dark:prose-h3:text-rose-400 prose-h4:text-amber-600 dark:prose-h4:text-amber-400 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-emerald-700 dark:prose-strong:text-emerald-400 prose-code:text-pink-600 dark:prose-code:text-pink-400 prose-code:bg-pink-50 dark:prose-code:bg-pink-900/20 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-pre:bg-slate-800 dark:prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700 prose-blockquote:border-s-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50 dark:prose-blockquote:bg-indigo-900/20 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-e-lg prose-blockquote:text-indigo-900 dark:prose-blockquote:text-indigo-200 prose-li:marker:text-indigo-500 prose-img:rounded-xl prose-img:shadow-md";

const SectionRenderer = React.memo(({ node, index }: { node: SectionNode, index: number }) => {
  let containerClasses = '';
  if (node.level === 1) {
    containerClasses = 'p-6 sm:p-8 rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-700/50 shadow-sm mb-8 backdrop-blur-xl';
  } else if (node.level === 2) {
    containerClasses = 'p-5 sm:p-6 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-600/50 shadow-sm mt-6 backdrop-blur-lg';
  } else if (node.level === 3) {
    containerClasses = 'p-4 sm:p-5 rounded-xl bg-white/40 dark:bg-slate-700/40 border border-slate-200/50 dark:border-slate-500/50 shadow-sm mt-4 backdrop-blur-md';
  } else {
    containerClasses = 'p-3 sm:p-4 rounded-lg bg-white/30 dark:bg-slate-600/30 border border-slate-200/50 dark:border-slate-400/50 shadow-sm mt-4 backdrop-blur-sm';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className={containerClasses}
    >
      <div className={proseClasses}>
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]} 
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

export const NestedMarkdown = React.memo(({ content, rightAlign = false }: { content: string, rightAlign?: boolean }) => {
  const rootNodes = useMemo(() => parseSections(content), [content]);
  
  return (
    <div className={`pb-12 ${rightAlign ? 'text-right' : 'text-left'}`} dir={rightAlign ? 'rtl' : 'ltr'}>
      {rootNodes.map((node, idx) => (
        <SectionRenderer key={node.id} node={node} index={idx} />
      ))}
    </div>
  );
});
