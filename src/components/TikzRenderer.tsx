import React, { useEffect, useState } from 'react';

export const TikzRenderer = ({ children }: { children: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if ((window as any).tikzjax) {
      setIsLoaded(true);
    } else {
      const script = document.createElement('script');
      script.src = 'https://tikzjax.com/v1/tikzjax.js';
      script.onload = () => setIsLoaded(true);
      document.head.appendChild(script);
    }
  }, []);

  if (!isLoaded) {
    return (
      <div className="p-4 bg-zinc-800 text-zinc-300 rounded-lg">
        TikZJax library is loading...
      </div>
    );
  }

  // Use a unique ID for each TikZ element
  const id = `tikz-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div id={id}>
      <script type="text/tikz">
        {children}
      </script>
    </div>
  );
};
