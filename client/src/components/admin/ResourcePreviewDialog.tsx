import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, FileText, File as FileIcon, Image as ImageIcon, FileType, Sheet } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/states";

interface ResourcePreviewDialogProps {
  fileUrl: string;
  fileName: string;
  fileType: string;
  onClose: () => void;
}

export function ResourcePreviewDialog({
  fileUrl,
  fileName,
  fileType,
  onClose,
}: ResourcePreviewDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
  }, [fileUrl]);

  const getFileIcon = () => {
    const type = fileType.toLowerCase();
    
    if (type.includes('pdf')) return <FileText className="w-12 h-12 text-red-500" />;
    if (type.includes('image')) return <ImageIcon className="w-12 h-12 text-blue-500" />;
    if (type.includes('word') || type.includes('doc')) return <FileType className="w-12 h-12 text-blue-600" />;
    if (type.includes('sheet') || type.includes('excel') || type.includes('xls')) return <Sheet className="w-12 h-12 text-green-600" />;
    if (type.includes('presentation') || type.includes('powerpoint') || type.includes('ppt')) return <FileType className="w-12 h-12 text-orange-500" />;
    
    return <FileIcon className="w-12 h-12 text-gray-500" />;
  };

  const isPDF = () => {
    return fileType.toLowerCase().includes('pdf');
  };

  const isImage = () => {
    const type = fileType.toLowerCase();
    return type.includes('image') || type.includes('jpg') || type.includes('jpeg') || type.includes('png') || type.includes('gif') || type.includes('webp');
  };

  const isPreviewable = () => {
    return isPDF() || isImage();
  };

  const handleDownload = () => {
    window.open(`${fileUrl}?download=true`, '_blank');
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-[90vh] p-0">
        <div className="relative w-full h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-white">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-navy truncate" data-testid="text-preview-file-name">
                {fileName}
              </h3>
              <p className="text-sm text-gray-500" data-testid="text-preview-file-type">
                {fileType}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                data-testid="button-download-preview"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                data-testid="button-close-preview"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center bg-gray-100 relative overflow-hidden">
            {error ? (
              <div className="text-center p-8">
                <div className="text-red-500 mb-4">
                  {getFileIcon()}
                </div>
                <p className="text-red-600 font-medium mb-2">Failed to load preview</p>
                <p className="text-gray-600 text-sm mb-4">{error}</p>
                <Button onClick={handleDownload} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download File Instead
                </Button>
              </div>
            ) : !isPreviewable() ? (
              <div className="text-center p-8">
                <div className="mb-4 flex justify-center">
                  {getFileIcon()}
                </div>
                <p className="text-gray-700 font-medium mb-2">{fileName}</p>
                <p className="text-gray-500 text-sm mb-4">
                  Preview not available for this file type
                </p>
                <Button onClick={handleDownload} className="bg-pcs_blue hover:bg-blue-600">
                  <Download className="w-4 h-4 mr-2" />
                  Download File
                </Button>
              </div>
            ) : (
              <>
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                    <LoadingSpinner message="Loading preview..." />
                  </div>
                )}
                
                {isImage() ? (
                  <img
                    src={fileUrl}
                    alt={fileName}
                    className="max-w-full max-h-full object-contain"
                    data-testid="img-resource-preview"
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                      setIsLoading(false);
                      setError('Failed to load image');
                    }}
                  />
                ) : isPDF() ? (
                  <iframe
                    src={fileUrl}
                    className="w-full h-full"
                    title={fileName}
                    data-testid="iframe-pdf-preview"
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                      setIsLoading(false);
                      setError('Failed to load PDF. The file may not support preview or CORS restrictions may apply.');
                    }}
                  />
                ) : null}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
