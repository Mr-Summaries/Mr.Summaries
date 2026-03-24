import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

interface MermaidProps {
  chart: string;
}

export const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      mermaid.render(`mermaid-${Math.random().toString(36).substring(7)}`, chart).then((result) => {
        if (ref.current) {
          ref.current.innerHTML = result.svg;
        }
      }).catch((e) => {
        console.error('Mermaid rendering error:', e);
        if (ref.current) {
          ref.current.innerHTML = `<pre class="text-red-500 text-sm overflow-auto p-4 bg-red-50 dark:bg-red-900/20 rounded-md">Error rendering diagram: ${e.message}</pre>`;
        }
      });
    }
  }, [chart]);

  return <div ref={ref} className="flex justify-center my-6 overflow-auto" />;
};
