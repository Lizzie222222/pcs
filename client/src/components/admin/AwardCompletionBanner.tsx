import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { School } from "@shared/schema";

interface AwardCompletionBannerProps {
  activeTab: string;
}

export default function AwardCompletionBanner({ activeTab }: AwardCompletionBannerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);

  // Fetch schools ready for award completion
  const { data: readyData, isLoading } = useQuery<{ count: number; schools: School[] }>({
    queryKey: ['/api/admin/schools/award-completion-ready'],
    enabled: activeTab === 'schools',
    refetchInterval: 60000, // Refetch every minute
  });

  // Mutation to process bulk award completion
  const processAwardsMutation = useMutation({
    mutationFn: async (schoolIds: string[]) => {
      // Use fetch directly instead of apiRequest to handle both success and error responses
      const res = await fetch('/api/admin/schools/bulk-award-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ schoolIds }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Server returned error - throw with the full response body
        throw {
          message: data.message || 'Failed to process awards',
          failed: data.results?.failed || [],
          status: res.status
        };
      }

      return data as {
        message: string;
        results: {
          success: Array<{ id: string; schoolName: string; certificateId: string }>;
          failed: Array<{ id: string; schoolName: string; reason: string }>;
        };
      };
    },
    onSuccess: (data) => {
      const successCount = data.results.success.length;
      const failedCount = data.results.failed.length;

      if (failedCount === 0) {
        // All succeeded - show success message and close dialog
        toast({
          title: "Success!",
          description: `${successCount} school${successCount !== 1 ? 's' : ''} processed successfully. Certificates generated and schools moved to Round 2.`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/schools/award-completion-ready'] });
        queryClient.invalidateQueries({ queryKey: ['/api/schools'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/certificates'] });
        setPreviewDialogOpen(false);
        setConfirmDialogOpen(false);
        setSelectedSchools([]);
      } else {
        // Some failed - keep dialog open and show detailed error
        toast({
          title: "Processing Failed",
          description: `${failedCount} school${failedCount !== 1 ? 's' : ''} could not be processed. Transaction rolled back. No changes were made.`,
          variant: "destructive",
        });
        
        console.error('Failed schools:', data.results.failed);
      }
    },
    onError: (error: any) => {
      // Check if error has failed schools array
      if (error.failed && Array.isArray(error.failed) && error.failed.length > 0) {
        const failedList = error.failed
          .map((f: any) => `• ${f.schoolName}: ${f.reason}`)
          .join('\n');
        
        toast({
          title: "Processing Failed",
          description: `${error.failed.length} school${error.failed.length !== 1 ? 's' : ''} could not be processed. Transaction rolled back.\n\n${failedList}`,
          variant: "destructive",
        });
        
        console.error('Failed schools:', error.failed);
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to process awards. No changes were made.",
          variant: "destructive",
        });
      }
    },
  });

  const handleProcessAll = () => {
    if (readyData?.schools) {
      setSelectedSchools(readyData.schools.map(s => s.id));
      setConfirmDialogOpen(true);
    }
  };

  const handleProcessSelected = () => {
    if (selectedSchools.length > 0) {
      setConfirmDialogOpen(true);
    }
  };

  const handleConfirmProcess = () => {
    processAwardsMutation.mutate(selectedSchools);
  };

  const toggleSchoolSelection = (schoolId: string) => {
    setSelectedSchools(prev =>
      prev.includes(schoolId)
        ? prev.filter(id => id !== schoolId)
        : [...prev, schoolId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSchools.length === readyData?.schools.length) {
      setSelectedSchools([]);
    } else {
      setSelectedSchools(readyData?.schools.map(s => s.id) || []);
    }
  };

  // Don't show banner if loading or no schools ready
  if (isLoading || !readyData || readyData.count === 0) {
    return null;
  }

  return (
    <>
      <Alert className="border-pcs_blue bg-blue-50 mb-4" data-testid="alert-award-completion">
        <Trophy className="h-5 w-5 text-pcs_blue" />
        <AlertTitle className="text-pcs_blue font-bold flex items-center gap-2">
          Round 1 Completion Ready
          <Badge variant="secondary" className="bg-pcs_blue text-white">
            {readyData.count} {readyData.count === 1 ? 'school' : 'schools'}
          </Badge>
        </AlertTitle>
        <AlertDescription className="mt-2 text-gray-700">
          <p className="mb-3">
            {readyData.count} {readyData.count === 1 ? 'school has' : 'schools have'} completed all three stages (Inspire, Investigate, Act) in Round 1. 
            You can now generate their certificates and move them to Round 2.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => setPreviewDialogOpen(true)}
              className="bg-pcs_blue hover:bg-blue-600"
              data-testid="button-view-ready-schools"
            >
              <Award className="h-4 w-4 mr-2" />
              View & Process Schools
            </Button>
            <Button
              onClick={handleProcessAll}
              variant="outline"
              className="border-pcs_blue text-pcs_blue hover:bg-blue-50"
              data-testid="button-process-all-schools"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Process All {readyData.count}
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-pcs_blue" />
              Schools Ready for Round 1 Completion
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-pcs_blue rounded-lg p-4">
              <h4 className="font-semibold text-navy mb-2 flex items-center gap-2">
                <Award className="h-4 w-4" />
                What will happen:
              </h4>
              <ul className="space-y-1 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Generate Round 1 completion certificates for selected schools</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Move schools to Round 2 with fresh progress tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Reset stage completion flags (Inspire, Investigate, Act) to start Round 2</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedSchools.length === readyData?.schools.length}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300"
                  data-testid="checkbox-select-all-ready-schools"
                />
                <label className="text-sm font-medium">
                  Select All ({readyData?.schools.length || 0} schools)
                </label>
              </div>
              <Badge variant="secondary">
                {selectedSchools.length} selected
              </Badge>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-semibold text-navy w-12">Select</th>
                    <th className="text-left p-3 font-semibold text-navy">School Name</th>
                    <th className="text-left p-3 font-semibold text-navy">Country</th>
                    <th className="text-left p-3 font-semibold text-navy">Current Round</th>
                    <th className="text-left p-3 font-semibold text-navy">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {readyData?.schools.map((school) => (
                    <tr key={school.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedSchools.includes(school.id)}
                          onChange={() => toggleSchoolSelection(school.id)}
                          className="rounded border-gray-300"
                          data-testid={`checkbox-school-${school.id}`}
                        />
                      </td>
                      <td className="p-3 font-medium">{school.name}</td>
                      <td className="p-3">{school.country}</td>
                      <td className="p-3">
                        <Badge variant="outline">Round {school.currentRound}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge className="bg-green-100 text-green-800">
                          All Stages Complete
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setPreviewDialogOpen(false)}
              data-testid="button-cancel-award-process"
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcessSelected}
              disabled={selectedSchools.length === 0}
              className="bg-pcs_blue hover:bg-blue-600"
              data-testid="button-confirm-process-selected"
            >
              <Award className="h-4 w-4 mr-2" />
              Process {selectedSchools.length} School{selectedSchools.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Confirm Award Processing
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to process <strong>{selectedSchools.length} school{selectedSchools.length !== 1 ? 's' : ''}</strong> for Round 1 completion.
              </p>
              <p className="font-semibold">This will:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Generate Round 1 completion certificates</li>
                <li>Move schools to Round 2</li>
                <li>Reset their progress to start fresh in Round 2</li>
              </ul>
              <p className="text-amber-600 font-medium">
                This action cannot be undone. Are you sure you want to continue?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-confirmation">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmProcess}
              disabled={processAwardsMutation.isPending}
              className="bg-pcs_blue hover:bg-blue-600"
              data-testid="button-execute-award-process"
            >
              {processAwardsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Yes, Process Awards
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
