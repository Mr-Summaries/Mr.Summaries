import React from 'react';
import { motion } from 'motion/react';

export const InteractiveBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      {/* Blob 1 */}
      <motion.div
        className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-300/30 dark:bg-indigo-900/20 blur-[100px]"
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Blob 2 */}
      <motion.div
        className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-teal-300/30 dark:bg-teal-900/20 blur-[120px]"
        animate={{
          x: [0, -120, 0],
          y: [0, -80, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
      />

      {/* Blob 3 */}
      <motion.div
        className="absolute top-[20%] right-[20%] w-[30vw] h-[30vw] rounded-full bg-rose-300/20 dark:bg-rose-900/10 blur-[90px]"
        animate={{
          x: [0, -50, 50, 0],
          y: [0, 100, -50, 0],
          scale: [1, 1.3, 0.9, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5
        }}
      />
      
      {/* Grid Overlay for texture */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMTI4LCAxMjgsIDEyOCwgMC4xKSIvPjwvc3ZnPg==')] [mask-image:linear-gradient(to_bottom,white,transparent)]" />
    </div>
  );
};
