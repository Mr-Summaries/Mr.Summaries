import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2 } from 'lucide-react';

const workerVersion = typeof pdfjs.version === 'string' ? pdfjs.version : '3.11.174';
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${workerVersion}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ url }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const [emptyPages, setEmptyPages] = useState<Set<number>>(new Set());
  const [pageHeights, setPageHeights] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContainerWidth(entries[0].contentRect.width);
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

  const handleRenderSuccess = (pageIndex: number) => {
    const canvas = canvasRefs.current.get(pageIndex);
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const { width, height } = canvas;
    if (width === 0 || height === 0) return;

    // Calculate CSS height based on aspect ratio and container width
    const cssHeight = (height / width) * containerWidth;
    setPageHeights(prev => {
      const next = new Map(prev);
      next.set(pageIndex, cssHeight);
      return next;
    });

    // Check pixels in the middle 94% to see if the page is blank
    // This ignores headers and footers (page numbers)
    const cropRatio = 0.03;
    const startY = Math.floor(height * cropRatio);
    const endY = Math.floor(height * (1 - cropRatio));
    
    const imageData = ctx.getImageData(0, startY, width, endY - startY);
    const data = imageData.data;
    let isEmpty = true;

    // Check pixels to see if the page is blank (white or transparent)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a > 0 && (r < 250 || g < 250 || b < 250)) {
        isEmpty = false;
        break;
      }
    }

    if (isEmpty) {
      setEmptyPages(prev => {
        const next = new Set(prev);
        next.add(pageIndex);
        return next;
      });
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col items-center w-full bg-zinc-100 dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
      {loading && (
        <div className="flex items-center justify-center p-12 text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-3">טוען מסמך...</span>
        </div>
      )}
      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        className="w-full flex flex-col items-center"
        loading={null}
      >
        {numPages && Array.from(new Array(numPages), (el, index) => {
          const pageHeight = pageHeights.get(index);
          const cropRatio = 0.03; // Crop 3% from top and bottom to remove page numbers
          
          // Assume standard A4 aspect ratio (1:1.414) for initial render to prevent layout shift
          const assumedHeight = containerWidth * 1.414;
          const currentHeight = pageHeight || assumedHeight;
          
          const safeCurrentHeight = typeof currentHeight === 'number' && !isNaN(currentHeight) ? currentHeight : 1000;
          const wrapperHeight = Number(safeCurrentHeight * (1 - cropRatio * 2)).toFixed(2);
          const marginTop = Number(-(safeCurrentHeight * cropRatio)).toFixed(2);

          return (
            <div 
              key={`page_wrapper_${index}`} 
              style={{ 
                display: emptyPages.has(index) ? 'none' : 'block', 
                width: '100%',
                height: `${wrapperHeight}px`,
                overflow: 'hidden',
                opacity: pageHeight ? 1 : 0,
                transition: 'opacity 0.2s ease-in-out'
              }}
            >
              <div style={{ marginTop: `${marginTop}px`, width: '100%', display: 'flex', justifyContent: 'center' }}>
                <Page
                  pageNumber={index + 1}
                  canvasRef={(ref) => {
                    if (ref) canvasRefs.current.set(index, ref);
                    else canvasRefs.current.delete(index);
                  }}
                  onRenderSuccess={() => handleRenderSuccess(index)}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="mb-0"
                  width={containerWidth} // Responsive width
                />
              </div>
            </div>
          );
        })}
      </Document>
    </div>
  );
};
