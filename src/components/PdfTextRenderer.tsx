import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2 } from 'lucide-react';

// Set worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

interface PdfTextRendererProps {
  url: string;
  rightAlign?: boolean;
}

export const PdfTextRenderer: React.FC<PdfTextRendererProps> = ({ url }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        // Subtract padding from container width
        const width = entries[0].contentRect.width;
        // The container has p-4 (1rem) or sm:p-8 (2rem)
        // We'll use a slightly safer margin
        setContainerWidth(width - (window.innerWidth < 640 ? 32 : 64));
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  return (
    <div ref={containerRef} className="flex flex-col items-center w-full max-w-4xl mx-auto">
      <div className="w-full flex flex-col items-center gap-6 p-4 sm:p-8 bg-zinc-950/30 rounded-[2.5rem] border border-zinc-800/50 shadow-inner">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex flex-col items-center p-24">
              <Loader2 className="w-10 h-10 animate-spin text-cyan-600 mb-4" />
              <span className="text-zinc-500 font-medium">טוען מסמך...</span>
            </div>
          }
          error={
            <div className="p-12 text-red-500 text-center bg-red-900/10 rounded-3xl border border-red-900/20">
              <p className="font-bold mb-2">שגיאה בטעינת הקובץ</p>
              <p className="text-sm opacity-80">וודא שהקישור תקין או נסה להוריד את הקובץ ישירות.</p>
            </div>
          }
          className="flex flex-col items-center justify-center gap-8 w-full"
        >
          {numPages && Array.from(new Array(numPages), (el, index) => (
            <div key={`page_${index + 1}`} className="shadow-2xl rounded-xl overflow-hidden border border-zinc-800 bg-white">
              <Page 
                pageNumber={index + 1} 
                width={containerWidth}
                renderAnnotationLayer={true}
                renderTextLayer={true}
                className="max-w-full"
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
};

