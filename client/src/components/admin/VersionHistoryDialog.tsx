import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, RotateCcw, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface VersionHistoryDialogProps {
  caseStudyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore?: () => void;
}

interface VersionsResponse {
  success: boolean;
  versions: Array<{
    id: string;
    versionNumber: number;
    createdAt: string;
    createdBy: string;
  }>;
}

export function VersionHistoryDialog({ caseStudyId, open, onOpenChange, onRestore }: VersionHistoryDialogProps) {
  const { toast } = useToast();
  const [restoreVersionId, setRestoreVersionId] = useState<string | null>(null);
  
  const { data: versionsData, isLoading, error } = useQuery<VersionsResponse>({
    queryKey: ["/api/admin/case-studies", caseStudyId, "versions"],
    enabled: open && !!caseStudyId,
  });
  
  const restoreMutation = useMutation({
    mutationFn: async (versionId: string) => {
      return apiRequest("POST", `/api/admin/case-studies/${caseStudyId}/versions/${versionId}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/case-studies", caseStudyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/case-studies"] });
      setRestoreVersionId(null);
      onOpenChange(false);
      toast({
        title: "Version Restored",
        description: "The case study has been restored to the selected version successfully.",
      });
      if (onRestore) onRestore();
    },
    onError: (error: any) => {
      toast({
        title: "Restore Failed",
        description: error.message || "Failed to restore version. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl" data-testid="dialog-version-history">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              View and restore previous versions of this case study.
            </DialogDescription>
          </DialogHeader>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-versions" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive" data-testid="text-versions-error">
              Failed to load versions. Please try again.
            </div>
          ) : versionsData?.success && versionsData.versions.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {versionsData.versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
                  data-testid={`version-item-${version.versionNumber}`}
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      Version {version.versionNumber}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRestoreVersionId(version.id)}
                    disabled={restoreMutation.isPending}
                    data-testid={`button-restore-version-${version.versionNumber}`}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-versions">
              No versions found. Versions are created automatically when you publish a case study.
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!restoreVersionId} onOpenChange={() => setRestoreVersionId(null)}>
        <AlertDialogContent data-testid="dialog-restore-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the current case study content with the selected version. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-restore">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => restoreVersionId && restoreMutation.mutate(restoreVersionId)}
              data-testid="button-confirm-restore"
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                "Restore Version"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
