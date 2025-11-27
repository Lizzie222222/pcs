import { useToast } from "@/hooks/use-toast";
import { useState, useCallback } from "react";

interface DownloadOptions {
  filename?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface DownloadState {
  isLoading: boolean;
  error: string | null;
}

export function usePdfDownload() {
  const { toast } = useToast();
  const [downloadStates, setDownloadStates] = useState<Record<string, DownloadState>>({});

  const downloadPdf = useCallback(async (
    url: string,
    options: DownloadOptions = {}
  ): Promise<boolean> => {
    const stateKey = url;
    
    setDownloadStates(prev => ({
      ...prev,
      [stateKey]: { isLoading: true, error: null }
    }));

    try {
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to download PDF. Please try again.';
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
          }
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/pdf')) {
        throw new Error('Unable to generate PDF at this time. Please try again later.');
      }

      const blob = await response.blob();
      
      let filename = options.filename;
      if (!filename) {
        const contentDisposition = response.headers.get('content-disposition');
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1].replace(/['"]/g, '');
          }
        }
      }
      if (!filename) {
        filename = `download-${Date.now()}.pdf`;
      }

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setDownloadStates(prev => ({
        ...prev,
        [stateKey]: { isLoading: false, error: null }
      }));

      options.onSuccess?.();
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to download PDF';
      
      setDownloadStates(prev => ({
        ...prev,
        [stateKey]: { isLoading: false, error: errorMessage }
      }));

      toast({
        title: "Download Failed",
        description: errorMessage + ". Please try again.",
        variant: "destructive",
      });

      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
      return false;
    }
  }, [toast]);

  const getDownloadState = useCallback((url: string): DownloadState => {
    return downloadStates[url] || { isLoading: false, error: null };
  }, [downloadStates]);

  const isDownloading = useCallback((url: string): boolean => {
    return downloadStates[url]?.isLoading || false;
  }, [downloadStates]);

  return {
    downloadPdf,
    getDownloadState,
    isDownloading,
  };
}

export async function downloadPdfSimple(
  url: string,
  filename?: string
): Promise<boolean> {
  try {
    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to download PDF');
    }

    const blob = await response.blob();
    
    let resolvedFilename = filename;
    if (!resolvedFilename) {
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          resolvedFilename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
    }
    if (!resolvedFilename) {
      resolvedFilename = `download-${Date.now()}.pdf`;
    }

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = resolvedFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);

    return true;
  } catch (error) {
    console.error('PDF download error:', error);
    return false;
  }
}
