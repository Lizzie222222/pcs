import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, ChevronLeft, ChevronRight, FileText, Film, Image as ImageIcon } from "lucide-react";

interface EvidenceFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

interface EvidenceFilesGalleryProps {
  files: EvidenceFile[];
  className?: string;
}

export function EvidenceFilesGallery({ files, className = "" }: EvidenceFilesGalleryProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openFile = (index: number) => {
    setSelectedFileIndex(index);
    setIsOpen(true);
  };

  const closeFile = () => {
    setIsOpen(false);
    setSelectedFileIndex(null);
  };

  const goToPrevious = () => {
    if (selectedFileIndex !== null && selectedFileIndex > 0) {
      setSelectedFileIndex(selectedFileIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedFileIndex !== null && selectedFileIndex < files.length - 1) {
      setSelectedFileIndex(selectedFileIndex + 1);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon className="w-6 h-6" />;
    if (type.includes('video')) return <Film className="w-6 h-6" />;
    if (type.includes('pdf')) return <FileText className="w-6 h-6" />;
    return <FileText className="w-6 h-6" />;
  };

  const isImage = (type: string) => type.includes('image');
  const isVideo = (type: string) => type.includes('video');

  if (!files || files.length === 0) {
    return null;
  }

  const selectedFile = selectedFileIndex !== null ? files[selectedFileIndex] : null;

  return (
    <>
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 ${className}`}>
        {files.map((file, index) => (
          <button
            key={index}
            onClick={() => openFile(index)}
            className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-pcs_blue transition-all group"
            data-testid={`thumbnail-${index}`}
          >
            {isImage(file.type) ? (
              <img
                src={file.url}
                alt={file.name}
                className="w-full h-full object-cover"
              />
            ) : isVideo(file.type) ? (
              <video
                src={file.url}
                preload="metadata"
                className="w-full h-full object-cover"
                muted
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">{file.type.split('/')[1]?.toUpperCase() || 'File'}</p>
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-white rounded-full p-2">
                  {getFileIcon(file.type)}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-6xl w-full h-[90vh] p-0">
          <div className="relative w-full h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex-1">
                <h3 className="font-semibold text-navy truncate" data-testid="text-file-name">
                  {selectedFile?.name}
                </h3>
                <p className="text-sm text-gray-500" data-testid="text-file-info">
                  {selectedFileIndex !== null && `${selectedFileIndex + 1} of ${files.length}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedFile && (
                  <a
                    href={`${selectedFile.url}?download=true`}
                    download={selectedFile.name}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" data-testid="button-download">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeFile}
                  data-testid="button-close"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center bg-gray-100 relative overflow-hidden">
              {selectedFile && (
                <>
                  {isImage(selectedFile.type) ? (
                    <img
                      src={selectedFile.url}
                      alt={selectedFile.name}
                      className="max-w-full max-h-full object-contain"
                      data-testid="img-preview"
                    />
                  ) : isVideo(selectedFile.type) ? (
                    <video
                      src={selectedFile.url}
                      controls
                      className="max-w-full max-h-full"
                      data-testid="video-preview"
                    />
                  ) : (
                    <div className="text-center p-8">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                      <a
                        href={`${selectedFile.url}?download=true`}
                        download={selectedFile.name}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button data-testid="button-download-file">
                          <Download className="w-4 h-4 mr-2" />
                          Download File
                        </Button>
                      </a>
                    </div>
                  )}

                  {/* Navigation Arrows */}
                  {files.length > 1 && (
                    <>
                      <button
                        onClick={goToPrevious}
                        disabled={selectedFileIndex === 0}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                        data-testid="button-previous"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={goToNext}
                        disabled={selectedFileIndex === files.length - 1}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                        data-testid="button-next"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
