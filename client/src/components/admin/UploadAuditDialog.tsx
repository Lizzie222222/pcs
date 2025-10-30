import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface UploadAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
}

export function UploadAuditDialog({
  open,
  onOpenChange,
  schoolId,
}: UploadAuditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [notes, setNotes] = useState("");

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Create a minimal audit record that's already approved
      return await apiRequest("POST", "/api/audits", {
        schoolId,
        status: "submitted", // Will be auto-approved by backend for admin
        part1Data: {},
        part2Data: {},
        part3Data: {},
        part4Data: {},
        notes: notes || "Audit completed by admin",
      });
    },
    onSuccess: () => {
      toast({
        title: "Audit submitted",
        description: "Audit has been submitted and approved for this school",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/audits/school", schoolId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/schools", schoolId] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message || "Failed to submit audit",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Audit</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this audit..."
              rows={4}
              data-testid="textarea-notes"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This will create an approved audit record for the school. 
              Admin submissions are automatically approved and do not require review.
            </p>
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
              disabled={submitMutation.isPending}
              data-testid="button-submit"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit & Approve"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
