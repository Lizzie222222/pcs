import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner, ErrorState } from "@/components/ui/states";
import { Download, FileText, Video, Image as ImageIcon, BookOpen, ZoomIn, ZoomOut, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

// Helper function to convert GCS URLs to proxy URLs for CORS support
function getProxyUrl(url: string | null): string {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    // Decode pathname to handle URL-encoded paths from GCS
    const pathname = decodeURIComponent(urlObj.pathname);
    
    // Extract object path from GCS URL
    const privateUploadsMatch = pathname.match(/\/.private\/uploads\/(.+)$/);
    if (privateUploadsMatch) {
      return `/objects/uploads/${privateUploadsMatch[1]}`;
    }
    
    const publicMatch = pathname.match(/\/public\/(.+)$/);
    if (publicMatch) {
      return `/objects/public/${publicMatch[1]}`;
    }
    
    // If already a proxy URL, return as is
    if (url.startsWith('/objects/')) {
      return url;
    }
    
    return url; // Fallback to original URL
  } catch {
    return url; // Invalid URL, return original
  }
}

interface Resource {
  id: string;
  title: string;
  description: string;
  stage: 'inspire' | 'investigate' | 'act';
  ageRange: string;
  language: string;
  languages?: string[];
  country: string;
  resourceType?: string;
  theme?: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  downloadCount: number;
  visibility: 'public' | 'registered';
  createdAt: string;
}

export default function ResourceView() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation('resources');
  const { isAuthenticated } = useAuth();
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [pdfPages, setPdfPages] = useState<number>(0);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedPagesRef = useRef<Set<number>>(new Set());

  // Fetch resource details
  const { data: resource, isLoading, error } = useQuery<Resource>({
    queryKey: ['/api/resources', id],
    enabled: !!id,
  });

  // Set page title and meta description
  useEffect(() => {
    if (resource) {
      document.title = `${resource.title} - Resources | Plastic Clever Schools`;
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', 
          resource.description || `Download ${resource.title} - A ${resource.stage} stage resource for Plastic Clever Schools`
        );
      }
      
      // Update Open Graph tags
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', `${resource.title} - Plastic Clever Schools`);
      }
      
      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        ogDescription.setAttribute('content', resource.description || `Download ${resource.title}`);
      }
    }
  }, [resource]);

  // Load PDF document
  useEffect(() => {
    const loadPdf = async () => {
      if (!resource?.fileUrl || !resource.fileType?.includes('pdf')) {
        setPdfLoading(false);
        return;
      }

      try {
        setPdfLoading(true);
        setPdfError(false);
        setPdfDocument(null);
        setPdfPages(0);
        renderedPagesRef.current.clear();

        // Use proxy URL for GCS files to avoid CORS issues
        const pdfUrl = getProxyUrl(resource.fileUrl);

        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          httpHeaders: {
            'Accept': 'application/pdf',
          },
          withCredentials: true,
        });
        
        const pdf = await loadingTask.promise;
        setPdfDocument(pdf);
        setPdfPages(pdf.numPages);
        setPdfLoading(false);
      } catch (err) {
        console.error('PDF Loading Error:', err);
        setPdfError(true);
        setPdfLoading(false);
      }
    };

    if (resource?.fileType?.includes('pdf')) {
      loadPdf();
    }
  }, [resource]);

  // Render a specific PDF page to a canvas
  const renderPdfPage = useCallback(async (pageNum: number, canvas: HTMLCanvasElement) => {
    if (!pdfDocument || !canvas || renderedPagesRef.current.has(pageNum)) {
      return;
    }

    try {
      const page = await pdfDocument.getPage(pageNum);
      const context = canvas.getContext('2d');
      if (!context) return;

      const viewport = page.getViewport({ scale: zoom });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }).promise;

      renderedPagesRef.current.add(pageNum);
    } catch (err) {
      console.error(`Error rendering page ${pageNum}:`, err);
    }
  }, [pdfDocument, zoom]);

  // Re-render all pages when zoom changes
  useEffect(() => {
    if (!pdfDocument) return;

    // Clear rendered pages tracking
    renderedPagesRef.current.clear();

    // Find all canvas elements and re-render them
    const canvasElements = containerRef.current?.querySelectorAll('canvas');
    if (canvasElements) {
      canvasElements.forEach((canvas, index) => {
        const pageNum = index + 1;
        renderPdfPage(pageNum, canvas as HTMLCanvasElement);
      });
    }
  }, [zoom, pdfDocument]);

  const handleDownload = async () => {
    if (!resource) return;

    // Require authentication for registered-only resources
    if (resource.visibility === 'registered' && !isAuthenticated) {
      alert(t('register_to_access') || 'Please register or log in to access this resource');
      navigate('/login');
      return;
    }

    try {
      // Track download
      await fetch(`/api/resources/${resource.id}/download`, { method: 'GET' });
      
      // Trigger download - add ?download=true for object storage files
      const downloadUrl = resource.fileUrl.startsWith('/objects/') 
        ? `${resource.fileUrl}?download=true` 
        : resource.fileUrl;
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = resource.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'inspire': return 'bg-pcs_blue text-white';
      case 'investigate': return 'bg-teal text-white';
      case 'act': return 'bg-coral text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType?.includes('pdf')) return <FileText className="h-5 w-5" />;
    if (fileType?.includes('video')) return <Video className="h-5 w-5" />;
    if (fileType?.includes('image')) return <ImageIcon className="h-5 w-5" />;
    return <BookOpen className="h-5 w-5" />;
  };

  const getAgeRangeLabel = (ageRange: string) => {
    const ageRangeMap: { [key: string]: string } = {
      '5-7 years': t('age_ranges.5_7'),
      '8-11 years': t('age_ranges.8_11'),
      '12-16 years': t('age_ranges.12_16'),
      '17+ years': t('age_ranges.17_plus'),
    };
    return ageRangeMap[ageRange] || ageRange;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return `0 ${t('units.bytes')}`;
    const k = 1024;
    const sizes = ['bytes', 'kb', 'mb', 'gb'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const formattedNumber = new Intl.NumberFormat(i18n.language, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    }).format(bytes / Math.pow(k, i));
    return `${formattedNumber} ${t(`units.${sizes[i]}`)}`;
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3.0));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20">
        <div className="flex justify-center items-center min-h-[60vh]">
          <LoadingSpinner size="xl" message="Loading resource..." />
        </div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorState 
            title="Resource Not Found"
            description="The resource you're looking for doesn't exist or has been removed."
            showHome={true}
            onGoHome={() => navigate('/resources')}
          />
        </div>
      </div>
    );
  }

  const isPdf = resource.fileType?.includes('pdf');
  const isLocked = resource.visibility === 'registered' && !isAuthenticated;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3 mb-4">
            <Badge className={`${getStageColor(resource.stage)} shadow-sm`} data-testid="badge-stage">
              {t(`stages.${resource.stage}`)}
            </Badge>
            {resource.ageRange && (
              <Badge variant="outline" data-testid="badge-age-range">
                {getAgeRangeLabel(resource.ageRange)}
              </Badge>
            )}
            {resource.resourceType && (
              <Badge variant="outline" data-testid="badge-resource-type">
                {resource.resourceType.replace(/_/g, ' ').toUpperCase()}
              </Badge>
            )}
            {resource.theme && (
              <Badge variant="outline" data-testid="badge-theme">
                {resource.theme.replace(/_/g, ' ').toUpperCase()}
              </Badge>
            )}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-navy mb-4 tracking-tight" data-testid="text-resource-title">
            {resource.title}
          </h1>

          {resource.description && (
            <p className="text-lg text-gray-600 mb-6 leading-relaxed max-w-4xl" data-testid="text-resource-description">
              {resource.description}
            </p>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {resource.country && (
              <div className="flex flex-col" data-testid="text-country">
                <span className="text-sm text-gray-500">Country</span>
                <span className="font-medium text-navy">{resource.country}</span>
              </div>
            )}
            {resource.language && (
              <div className="flex flex-col" data-testid="text-language">
                <span className="text-sm text-gray-500">Language</span>
                <span className="font-medium text-navy">{resource.language}</span>
              </div>
            )}
            <div className="flex flex-col" data-testid="text-file-type">
              <span className="text-sm text-gray-500">File Type</span>
              <span className="font-medium text-navy flex items-center gap-2">
                {getFileIcon(resource.fileType)}
                {resource.fileType?.split('/')[1]?.toUpperCase() || 'FILE'}
              </span>
            </div>
            <div className="flex flex-col" data-testid="text-file-size">
              <span className="text-sm text-gray-500">File Size</span>
              <span className="font-medium text-navy">{formatFileSize(resource.fileSize || 0)}</span>
            </div>
          </div>

          {/* Download Button */}
          <div className="flex gap-3">
            {isLocked ? (
              <Button
                size="lg"
                variant="outline"
                className="bg-gray-100 text-gray-600 hover:bg-gray-200"
                onClick={handleDownload}
                data-testid="button-download-locked"
              >
                <Lock className="h-5 w-5 mr-2" />
                {t('register_to_access', { defaultValue: 'Register to Access' })}
              </Button>
            ) : (
              <Button
                size="lg"
                className="bg-[#faf657] hover:bg-[#e5e14d] text-navy shadow-md"
                onClick={handleDownload}
                data-testid="button-download"
              >
                <Download className="h-5 w-5 mr-2" />
                Download Resource
              </Button>
            )}
            
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/resources')}
              data-testid="button-back-resources"
            >
              Back to Resources
            </Button>
          </div>
        </div>

        {/* PDF Viewer or File Preview */}
        {isPdf ? (
          <Card className="shadow-xl" data-testid="card-pdf-viewer">
            <CardHeader className="border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  PDF Preview
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.5}
                    data-testid="button-zoom-out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium px-2" data-testid="text-zoom-level">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleZoomIn}
                    disabled={zoom >= 3.0}
                    data-testid="button-zoom-in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {pdfLoading && (
                <div className="flex justify-center items-center py-20">
                  <LoadingSpinner message="Loading PDF..." />
                </div>
              )}
              {pdfError && (
                <div className="p-8">
                  <ErrorState
                    title="PDF Loading Failed"
                    description="Unable to load the PDF file. Please try downloading it instead."
                    showRetry={false}
                  />
                </div>
              )}
              {!pdfLoading && !pdfError && (
                <div 
                  ref={containerRef} 
                  className="overflow-auto max-h-[800px] bg-gray-100 p-4"
                  data-testid="container-pdf-pages"
                >
                  {Array.from({ length: pdfPages }, (_, i) => i + 1).map((pageNum) => (
                    <div key={pageNum} className="mb-4 bg-white shadow-lg">
                      <canvas
                        ref={(el) => {
                          if (el && pdfDocument) {
                            renderPdfPage(pageNum, el);
                          }
                        }}
                        className="w-full"
                        data-testid={`canvas-pdf-page-${pageNum}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-xl" data-testid="card-file-preview">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-6">
                <div className="p-6 bg-gray-100 rounded-full">
                  {getFileIcon(resource.fileType)}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-navy mb-2">
                    {resource.fileType?.split('/')[1]?.toUpperCase() || 'FILE'} Preview Not Available
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Click the download button above to view this file
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
