import { type ReactNode, useState, useEffect, createContext, useContext } from "react";

interface PreviewContainerProps {
  children: ReactNode;
  preview: ReactNode;
  showPreview?: boolean;
  onPreviewToggle?: (show: boolean) => void;
}

interface PreviewContextValue {
  isPreviewOpen: boolean;
  togglePreview: () => void;
  isMobile: boolean;
}

const PreviewContext = createContext<PreviewContextValue | null>(null);

export function usePreviewContext() {
  const context = useContext(PreviewContext);
  return context;
}

export function PreviewContainer({
  children,
  preview,
  showPreview: externalShowPreview,
  onPreviewToggle
}: PreviewContainerProps) {
  const [internalShowPreview, setInternalShowPreview] = useState(() => {
    if (externalShowPreview === undefined) {
      const stored = localStorage.getItem('caseStudyPreviewOpen');
      return stored === 'true';
    }
    return externalShowPreview;
  });

  const isPreviewOpen = externalShowPreview !== undefined ? externalShowPreview : internalShowPreview;

  const handleToggle = () => {
    const newValue = !isPreviewOpen;
    if (externalShowPreview === undefined) {
      setInternalShowPreview(newValue);
      localStorage.setItem('caseStudyPreviewOpen', String(newValue));
    }
    onPreviewToggle?.(newValue);
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <PreviewContext.Provider value={{ isPreviewOpen, togglePreview: handleToggle, isMobile }}>
      <div className="relative flex h-full min-h-screen">
        {/* Main Form Panel */}
        <div 
          className={`flex-1 transition-all duration-300 ${
            isPreviewOpen && !isMobile ? 'lg:w-[60%]' : 'w-full'
          }`}
        >
          {children}
        </div>

        {/* Preview Panel */}
        {isPreviewOpen && !isMobile && (
          <div 
            id="case-study-preview-panel"
            role="region"
            aria-labelledby="preview-heading"
            className="lg:w-[40%] border-l bg-muted/30 overflow-y-auto"
            data-testid="panel-preview"
          >
            {/* Preview Header */}
            <div className="sticky top-0 z-10 bg-background border-b p-4">
              <h3 id="preview-heading" className="text-lg font-semibold" data-testid="text-preview-heading">
                Live Preview
              </h3>
            </div>

            {/* Preview Content */}
            <div className="p-6 bg-white">
              {preview}
            </div>
          </div>
        )}

        {/* Mobile Message */}
        {isMobile && (
          <div 
            className="fixed bottom-4 right-4 bg-muted border rounded-lg p-3 text-sm text-muted-foreground shadow-lg z-50"
            data-testid="message-mobile-preview"
          >
            💡 Preview available on larger screens (1024px+)
          </div>
        )}
      </div>
    </PreviewContext.Provider>
  );
}

// Helper component for toggle button to be used in the header
export function PreviewToggleButton() {
  const previewContext = usePreviewContext();
  
  if (!previewContext) {
    return null;
  }
  
  const { isPreviewOpen, togglePreview } = previewContext;
  
  return (
    <button
      type="button"
      onClick={togglePreview}
      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
      aria-label={isPreviewOpen ? "Hide preview panel" : "Show preview panel"}
      aria-expanded={isPreviewOpen}
      aria-controls="case-study-preview-panel"
      data-testid="button-toggle-preview"
    >
      {isPreviewOpen ? (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" x2="22" y1="2" y2="22" />
          </svg>
          Hide Preview
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Show Preview
        </>
      )}
    </button>
  );
}
