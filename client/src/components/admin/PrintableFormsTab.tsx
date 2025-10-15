import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup } from "@/components/ui/radio-group";
import { LoadingSpinner, EmptyState } from "@/components/ui/states";
import { Download, Eye, FileText } from "lucide-react";
import { format } from "date-fns";

interface PrintableFormSubmissionWithDetails {
  id: string;
  schoolId: string;
  submittedBy: string;
  formType: 'audit' | 'action_plan';
  filePath: string;
  originalFilename: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  school: {
    id: string;
    name: string;
    country: string;
  };
  submittedByUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export default function PrintableFormsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    status: 'all',
    formType: 'all',
    schoolSearch: '',
  });
  const [reviewingSubmission, setReviewingSubmission] = useState<PrintableFormSubmissionWithDetails | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'revision_requested'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');

  // Fetch submissions with filters
  const { data: submissions = [], isLoading } = useQuery<PrintableFormSubmissionWithDetails[]>({
    queryKey: ['/api/admin/printable-form-submissions', filters.status, filters.formType, filters.schoolSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.formType && filters.formType !== 'all') params.append('formType', filters.formType);
      if (filters.schoolSearch) params.append('schoolId', filters.schoolSearch);
      
      const response = await fetch(`/api/admin/printable-form-submissions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch submissions');
      return response.json();
    },
  });

  // Update submission status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, reviewNotes }: { id: string; status: string; reviewNotes?: string }) => {
      return apiRequest('PATCH', `/api/admin/printable-form-submissions/${id}/status`, { status, reviewNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/admin/printable-form-submissions'],
        refetchType: 'all'
      });
      toast({
        title: "Success",
        description: "Submission status updated successfully",
      });
      setReviewDialogOpen(false);
      setReviewingSubmission(null);
      setReviewNotes('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update submission status",
        variant: "destructive",
      });
    },
  });

  // Download submission
  const handleDownload = async (submission: PrintableFormSubmissionWithDetails) => {
    try {
      const response = await fetch(`/api/printable-form-submissions/${submission.id}/download`);
      if (!response.ok) throw new Error('Failed to get download URL');
      
      const { downloadUrl } = await response.json();
      window.open(downloadUrl, '_blank');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download submission",
        variant: "destructive",
      });
    }
  };

  // Handle review submission
  const handleReview = (submission: PrintableFormSubmissionWithDetails) => {
    setReviewingSubmission(submission);
    setReviewStatus('approved');
    setReviewNotes('');
    setReviewDialogOpen(true);
  };

  // Submit review
  const handleSubmitReview = () => {
    if (!reviewingSubmission) return;
    
    updateStatusMutation.mutate({
      id: reviewingSubmission.id,
      status: reviewStatus,
      reviewNotes: reviewNotes || undefined,
    });
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      revision_requested: 'bg-orange-100 text-orange-800',
    };
    
    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6" data-refactor-source="PrintableFormsTab">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-navy">
            Printable Forms Review
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Review and manage printable form submissions from schools
          </p>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger data-testid="select-filter-status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="revision_requested">Revision Requested</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Form Type
              </label>
              <Select value={filters.formType} onValueChange={(value) => setFilters({ ...filters, formType: value })}>
                <SelectTrigger data-testid="select-filter-form-type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="audit">Audit</SelectItem>
                  <SelectItem value="action_plan">Action Plan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                School Search
              </label>
              <Input
                type="text"
                placeholder="Search by school name..."
                value={filters.schoolSearch}
                onChange={(e) => setFilters({ ...filters, schoolSearch: e.target.value })}
                data-testid="input-search-school"
              />
            </div>
          </div>

          {/* Submissions Table */}
          {isLoading ? (
            <div className="py-8">
              <LoadingSpinner message="Loading submissions..." />
            </div>
          ) : submissions.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Submissions Found"
              description="No printable form submissions match your filters"
            />
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full" data-testid="table-printable-submissions">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">School</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">Form Type</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">Status</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">Submitted By</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">Upload Date</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <div className="font-medium text-gray-900">{submission.school.name}</div>
                          <div className="text-sm text-gray-500">{submission.school.country}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">
                          {submission.formType === 'audit' ? 'Audit' : 'Action Plan'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <StatusBadge status={submission.status} />
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          {submission.submittedByUser.firstName} {submission.submittedByUser.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{submission.submittedByUser.email}</div>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {format(new Date(submission.submittedAt), 'MMM d, yyyy')}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(submission)}
                            data-testid={`button-download-${submission.id}`}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          {(submission.status === 'pending' || submission.status === 'revision_requested') && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleReview(submission)}
                              data-testid={`button-review-${submission.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Status Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen} data-testid="dialog-update-status">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {reviewingSubmission && (
              <div className="bg-gray-50 p-3 rounded-md text-sm">
                <p><strong>School:</strong> {reviewingSubmission.school.name}</p>
                <p><strong>Form Type:</strong> {reviewingSubmission.formType === 'audit' ? 'Audit' : 'Action Plan'}</p>
                <p><strong>Submitted by:</strong> {reviewingSubmission.submittedByUser.firstName} {reviewingSubmission.submittedByUser.lastName}</p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <RadioGroup value={reviewStatus} onValueChange={(value: any) => setReviewStatus(value)}>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="approved"
                    value="approved"
                    checked={reviewStatus === 'approved'}
                    onChange={(e) => setReviewStatus('approved')}
                    className="h-4 w-4"
                    data-testid="radio-status-approved"
                  />
                  <label htmlFor="approved" className="text-sm cursor-pointer">Approved</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="rejected"
                    value="rejected"
                    checked={reviewStatus === 'rejected'}
                    onChange={(e) => setReviewStatus('rejected')}
                    className="h-4 w-4"
                    data-testid="radio-status-rejected"
                  />
                  <label htmlFor="rejected" className="text-sm cursor-pointer">Rejected</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="revision_requested"
                    value="revision_requested"
                    checked={reviewStatus === 'revision_requested'}
                    onChange={(e) => setReviewStatus('revision_requested')}
                    className="h-4 w-4"
                    data-testid="radio-status-revision-requested"
                  />
                  <label htmlFor="revision_requested" className="text-sm cursor-pointer">Revision Requested</label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Notes (Optional)
              </label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any notes about this review..."
                rows={4}
                data-testid="textarea-review-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={updateStatusMutation.isPending}
              data-testid="button-submit-status-update"
            >
              {updateStatusMutation.isPending ? 'Updating...' : 'Submit Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
