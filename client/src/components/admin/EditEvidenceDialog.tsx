import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Loader2, Upload, X } from "lucide-react";

interface EditEvidenceDialogProps {
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
  } | null;
}

interface EvidenceFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

export function EditEvidenceDialog({
  open,
  onOpenChange,
  evidence,
}: EditEvidenceDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState<"inspire" | "investigate" | "act">("inspire");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [videoLinks, setVideoLinks] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<EvidenceFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (evidence) {
      setTitle(evidence.title || "");
      setDescription(evidence.description || "");
      setStage(evidence.stage as any);
      setVisibility(evidence.visibility as any);
      setVideoLinks(evidence.videoLinks || "");
      setUploadedFiles(evidence.files || []);
    }
  }, [evidence]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of files) {
        if (file.size > 157286400) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds the 150MB limit`,
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
            name: file.name,
            url: objectPath,
            size: file.size,
            type: file.type,
          },
        ]);
      }

      toast({
        title: "Upload successful",
        description: `${files.length} file(s) uploaded successfully`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload files",
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

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!evidence) return;
      
      return await apiRequest("PATCH", `/api/admin/evidence/${evidence.id}`, {
        title,
        description,
        stage,
        visibility,
        files: uploadedFiles,
        videoLinks: videoLinks || null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Evidence updated",
        description: "Evidence has been successfully updated",
      });
      // Invalidate both evidence list and school data to update progress
      queryClient.invalidateQueries({ queryKey: ["/api/admin/schools", evidence?.schoolId, "evidence"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/schools", evidence?.schoolId] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update evidence",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for the evidence",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate();
  };

  if (!evidence) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Evidence</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter evidence title"
              required
              data-testid="input-title"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter evidence description"
              rows={4}
              data-testid="textarea-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stage">Stage *</Label>
              <Select value={stage} onValueChange={(value: any) => setStage(value)}>
                <SelectTrigger id="stage" data-testid="select-stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inspire">Inspire</SelectItem>
                  <SelectItem value="investigate">Investigate</SelectItem>
                  <SelectItem value="act">Act</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="visibility">Visibility *</Label>
              <Select value={visibility} onValueChange={(value: any) => setVisibility(value)}>
                <SelectTrigger id="visibility" data-testid="select-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="videoLinks">Video Links (YouTube, Vimeo, etc.)</Label>
            <Textarea
              id="videoLinks"
              value={videoLinks}
              onChange={(e) => setVideoLinks(e.target.value)}
              placeholder="Enter video URLs, one per line"
              rows={2}
              data-testid="textarea-video-links"
            />
          </div>

          <div>
            <Label>Files</Label>
            <div className="mt-2 space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full"
                data-testid="button-upload-files"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Add More Files
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                multiple
                accept="image/*,video/*,.pdf"
              />

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                      data-testid={`uploaded-file-${index}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {file.size ? (file.size / 1024 / 1024).toFixed(2) + " MB" : "Unknown size"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        data-testid={`button-remove-file-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending || isUploading}
              data-testid="button-submit"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Evidence"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
