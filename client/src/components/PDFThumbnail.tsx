import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

interface PDFThumbnailProps {
  url: string;
  className?: string;
}

export function PDFThumbnail({ url, className = '' }: PDFThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadPdf = async () => {
      if (!canvasRef.current) return;

      try {
        setLoading(true);
        setError(false);

        const loadingTask = pdfjsLib.getDocument({
          url,
        });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) {
          setError(true);
          setLoading(false);
          return;
        }

        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(
          300 / viewport.width,
          300 / viewport.height
        );

        const scaledViewport = page.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
          canvas: canvas,
        }).promise;

        setLoading(false);
      } catch (err) {
        console.error('PDF Loading Error Details:', {
          error: err,
          message: (err as Error).message,
          url: url,
          stack: (err as Error).stack
        });
        setError(true);
        setLoading(false);
      }
    };

    loadPdf();
  }, [url]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400 text-xs">PDF Preview Error</div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="text-gray-500 dark:text-gray-400 text-xs">Loading...</div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-contain ${loading ? 'opacity-0' : 'opacity-100'}`}
        width={300}
        height={300}
      />
    </div>
  );
}
