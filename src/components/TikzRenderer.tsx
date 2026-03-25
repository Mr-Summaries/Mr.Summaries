import React, { useEffect, useRef, useState } from 'react';

export const TikzRenderer = ({ children }: { children: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if the script is already in the document
    const existingScript = document.querySelector('script[src="https://tikzjax-demo.think.somethingorotherwhatever.com/tikzjax.js"]');
    if (existingScript) {
      // It might be loading or loaded
      existingScript.addEventListener('load', () => setIsLoaded(true));
      // If it's already loaded, window.process_tikz will be set
      if (typeof (window as any).process_tikz === 'function') {
        setIsLoaded(true);
      }
    } else {
      const script = document.createElement('script');
      script.src = 'https://tikzjax-demo.think.somethingorotherwhatever.com/tikzjax.js';
      script.onload = () => setIsLoaded(true);
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && containerRef.current) {
      // Clear previous content
      containerRef.current.innerHTML = '';
      
      const script = document.createElement('script');
      script.type = 'text/tikz';
      script.textContent = children;
      containerRef.current.appendChild(script);

      if (typeof (window as any).process_tikz === 'function') {
        try {
          (window as any).process_tikz(script);
        } catch (e) {
          console.error("TikZJax error:", e);
        }
      }
    }
  }, [isLoaded, children]);

  if (!isLoaded) {
    return (
      <div className="p-4 bg-zinc-800 text-zinc-300 rounded-lg">
        TikZJax library is loading...
      </div>
    );
  }

  return <div ref={containerRef} className="tikzjax-container" />;
};
