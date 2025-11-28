import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, X, Trash2, Image, FileText } from "lucide-react";

interface TeacherEvidenceEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evidence: {
    id: string;
    schoolId: string;
    title: string;
    description: string;
    stage: string;
    visibility: string;
    files: any[];
    videoLinks: string | null;
    status: string;
  } | null;
  onDeleted?: () => void;
}

interface EvidenceFile {
  id?: string;
  name?: string;
  originalName?: string;
  url: string;
  size: number;
  type?: string;
  mimeType?: string;
  storagePath?: string;
}

export function TeacherEvidenceEditDialog({
  open,
  onOpenChange,
  evidence,
  onDeleted,
}: TeacherEvidenceEditDialogProps) {
  const { t } = useTranslation(['forms', 'common', 'dashboard']);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Track which evidence ID we've initialized for to prevent resetting on re-renders
  const initializedForRef = useRef<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [videoLinks, setVideoLinks] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<EvidenceFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Only initialize form when dialog opens with new evidence
  // Don't reset if already initialized for this evidence ID
  useEffect(() => {
    if (open && evidence && initializedForRef.current !== evidence.id) {
      setTitle(evidence.title || "");
      setDescription(evidence.description || "");
      setVisibility(evidence.visibility as "public" | "private");
      setVideoLinks(evidence.videoLinks || "");
      setUploadedFiles(evidence.files || []);
      initializedForRef.current = evidence.id;
    }
    
    // Reset tracker when dialog closes
    if (!open) {
      initializedForRef.current = null;
    }
  }, [open, evidence]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of files) {
        if (file.size > 157286400) {
          toast({
            title: t('forms:evidence_submission.file_too_large', 'File too large'),
            description: t('forms:evidence_submission.file_size_limit', { name: file.name, limit: '150MB' }),
            variant: "destructive",
          });
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("visibility", visibility);

        const uploadResponse = await fetch("/api/evidence-files/upload-compressed", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file");
        }

        const { objectPath } = await uploadResponse.json();

        setUploadedFiles((prev) => [
          ...prev,
          {
            originalName: file.name,
            name: file.name,
            url: objectPath,
            size: file.size,
            type: file.type,
            mimeType: file.type,
            storagePath: objectPath,
          },
        ]);
      }

      toast({
        title: t('forms:evidence_submission.upload_success', 'Upload successful'),
        description: t('forms:evidence_submission.files_uploaded', { count: files.length }),
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: t('forms:evidence_submission.upload_failed', 'Upload failed'),
        description: t('forms:evidence_submission.upload_error_message', 'Failed to upload files'),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileName = (file: EvidenceFile): string => {
    return file.name || file.originalName || 'File';
  };

  const getFileType = (file: EvidenceFile): string => {
    return file.type || file.mimeType || '';
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!evidence) return;
      
      const normalizedFiles = uploadedFiles.map(f => {
        const fileName = f.name || f.originalName || 'file';
        const fileType = f.type || f.mimeType || 'application/octet-stream';
        const fileUrl = f.url || '';
        const fileSize = typeof f.size === 'number' ? f.size : parseInt(String(f.size)) || 0;
        const filePath = f.storagePath || fileUrl;
        
        return {
          id: f.id,
          originalName: fileName,
          url: fileUrl,
          size: fileSize,
          mimeType: fileType,
          storagePath: filePath,
        };
      });
      
      return await apiRequest("PATCH", `/api/evidence/${evidence.id}`, {
        title,
        description,
        visibility,
        files: normalizedFiles,
        videoLinks: videoLinks || null,
      });
    },
    onSuccess: () => {
      toast({
        title: t('dashboard:evidence.edit_success_title', 'Evidence updated'),
        description: t('dashboard:evidence.edit_success_message', 'Your evidence has been updated successfully'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/evidence"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('dashboard:evidence.edit_error_title', 'Update failed'),
        description: error.message || t('dashboard:evidence.edit_error_message', 'Failed to update evidence'),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!evidence) return;
      return await apiRequest("DELETE", `/api/evidence/${evidence.id}`);
    },
    onSuccess: () => {
      toast({
        title: t('dashboard:evidence.delete_success_title', 'Evidence deleted'),
        description: t('dashboard:evidence.delete_success_message', 'Your evidence has been deleted successfully'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/evidence"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setShowDeleteConfirm(false);
      onOpenChange(false);
      onDeleted?.();
    },
    onError: (error: Error) => {
      toast({
        title: t('dashboard:evidence.delete_error_title', 'Delete failed'),
        description: error.message || t('dashboard:evidence.delete_error_message', 'Failed to delete evidence'),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        title: t('forms:validation.required', 'Required'),
        description: t('forms:evidence_submission.title_required', 'Please enter a title'),
        variant: "destructive",
      });
      return;
    }
    if (!description.trim() || description.length < 10) {
      toast({
        title: t('forms:validation.required', 'Required'),
        description: t('forms:evidence_submission.description_min_length', 'Description must be at least 10 characters'),
        variant: "destructive",
      });
      return;
    }
    // Validate at least one file is present
    if (uploadedFiles.length === 0) {
      toast({
        title: t('forms:validation.required', 'Required'),
        description: t('forms:evidence_submission.files_required', 'Please upload at least one file'),
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate();
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  if (!evidence) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-evidence">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {t('dashboard:evidence.edit_title', 'Edit Evidence')}
            </DialogTitle>
            <DialogDescription>
              {t('dashboard:evidence.edit_description', 'Update your evidence submission. You can add more files or change details.')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">{t('forms:evidence_submission.title', 'Title')}</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  data-testid="input-title"
                />
              </div>

              <div>
                <Label htmlFor="description">{t('forms:evidence_submission.description', 'Description')}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  data-testid="input-description"
                />
              </div>

              <div>
                <Label htmlFor="videoLinks">{t('forms:evidence_submission.video_links', 'Video Links')}</Label>
                <Textarea
                  id="videoLinks"
                  value={videoLinks}
                  onChange={(e) => setVideoLinks(e.target.value)}
                  placeholder={t('forms:evidence_submission.video_links_placeholder', 'Enter video URLs, one per line')}
                  rows={2}
                  data-testid="input-video-links"
                />
              </div>

              <div>
                <Label htmlFor="visibility">{t('forms:evidence_submission.visibility', 'Visibility')}</Label>
                <Select value={visibility} onValueChange={(v: "public" | "private") => setVisibility(v)}>
                  <SelectTrigger data-testid="select-visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">{t('forms:evidence_submission.private', 'Private')}</SelectItem>
                    <SelectItem value="public">{t('forms:evidence_submission.public', 'Public')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('forms:evidence_submission.files', 'Files')}</Label>
                <div className="mt-2 space-y-3">
                  {uploadedFiles.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {uploadedFiles.map((file, index) => {
                        const fileType = getFileType(file);
                        const isImage = fileType.startsWith('image/');
                        return (
                          <div
                            key={index}
                            className="relative group border rounded-lg p-2 flex items-center gap-2"
                            data-testid={`file-item-${index}`}
                          >
                            {isImage ? (
                              <Image className="h-8 w-8 text-blue-500 flex-shrink-0" />
                            ) : (
                              <FileText className="h-8 w-8 text-gray-500 flex-shrink-0" />
                            )}
                            <span className="text-sm truncate flex-1">{getFileName(file)}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                              onClick={() => removeFile(index)}
                              data-testid={`button-remove-file-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleFileSelect}
                    data-testid="input-file"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    data-testid="button-add-files"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('forms:evidence_submission.uploading', 'Uploading...')}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {t('forms:evidence_submission.add_files', 'Add Files')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={updateMutation.isPending || deleteMutation.isPending}
                className="sm:mr-auto"
                data-testid="button-delete"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common:actions.delete', 'Delete')}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateMutation.isPending}
                data-testid="button-cancel"
              >
                {t('common:actions.cancel', 'Cancel')}
              </Button>
              
              <Button
                type="submit"
                disabled={updateMutation.isPending || isUploading}
                data-testid="button-save"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common:actions.saving', 'Saving...')}
                  </>
                ) : (
                  t('common:actions.save', 'Save Changes')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('dashboard:evidence.delete_confirm_title', 'Delete Evidence?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard:evidence.delete_confirm_message', 'This action cannot be undone. This will permanently delete your evidence submission.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              {t('common:actions.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common:actions.deleting', 'Deleting...')}
                </>
              ) : (
                t('common:actions.delete', 'Delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
