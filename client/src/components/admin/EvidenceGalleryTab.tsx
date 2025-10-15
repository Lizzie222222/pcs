import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Star,
  Eye,
  Globe,
  FileText,
  Building,
  Check,
  X
} from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import { EvidenceFilesGallery } from "@/components/EvidenceFilesGallery";
import { EvidenceVideoLinks } from "@/components/EvidenceVideoLinks";
import { PDFThumbnail } from "@/components/PDFThumbnail";
import type { EvidenceWithSchool } from "@shared/schema";

export default function EvidenceGalleryTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [filters, setFilters] = useState({
    status: '',
    stage: '',
    country: '',
    visibility: '',
  });
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceWithSchool | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [schoolHistoryDialogOpen, setSchoolHistoryDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<EvidenceWithSchool['school'] | null>(null);
  
  // Fetch all evidence with filters
  const { data: evidenceList = [], isLoading } = useQuery<EvidenceWithSchool[]>({
    queryKey: ['/api/admin/evidence', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.stage) params.append('stage', filters.stage);
      if (filters.country) params.append('country', filters.country);
      if (filters.visibility) params.append('visibility', filters.visibility);
      
      const response = await fetch(`/api/admin/evidence?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch evidence');
      return response.json();
    },
  });

  // Fetch school history when selected
  const { data: schoolHistory = [], isLoading: schoolHistoryLoading } = useQuery<EvidenceWithSchool[]>({
    queryKey: ['/api/admin/evidence', { schoolId: selectedSchool?.id }],
    queryFn: async () => {
      if (!selectedSchool?.id) return [];
      const params = new URLSearchParams({ schoolId: selectedSchool.id });
      const response = await fetch(`/api/admin/evidence?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch school history');
      return response.json();
    },
    enabled: !!selectedSchool?.id,
  });

  // Fetch countries for filter
  const { data: countries = [] } = useQuery<string[]>({
    queryKey: ['/api/countries'],
  });

  // Update evidence status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const response = await apiRequest('PATCH', `/api/admin/evidence/${id}/status`, { status });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence'] });
      toast({ title: "Success", description: "Evidence status updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update evidence status", variant: "destructive" });
    },
  });

  // Toggle featured mutation
  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, isFeatured }: { id: string; isFeatured: boolean }) => {
      const response = await apiRequest('PATCH', `/api/admin/evidence/${id}/featured`, { isFeatured: !isFeatured });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence'] });
      toast({ title: "Success", description: "Evidence featured status updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update featured status", variant: "destructive" });
    },
  });

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get stage badge color
  const getStageBadgeColor = (stage: string) => {
    switch (stage) {
      case 'inspire': return 'bg-purple-100 text-purple-800';
      case 'investigate': return 'bg-blue-100 text-blue-800';
      case 'act': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get file for thumbnail (image or PDF)
  const getFileForThumbnail = (evidence: EvidenceWithSchool) => {
    const files = evidence.files as any[] || [];
    
    // First try to find an image
    const imageFile = files.find((f: any) => 
      f.mimeType?.startsWith('image/') || f.type?.startsWith('image/')
    );
    if (imageFile) return { type: 'image', url: imageFile.url };
    
    // Then try PDF
    const pdfFile = files.find((f: any) => 
      f.mimeType?.includes('pdf') || f.type?.includes('pdf')
    );
    if (pdfFile) return { type: 'pdf', url: pdfFile.url };
    
    return null;
  };

  return (
    <div className="space-y-6" data-refactor-source="EvidenceGalleryTab">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-navy">Evidence Gallery</h2>
          <p className="text-gray-600 text-sm mt-1">Browse and manage all evidence submissions</p>
        </div>
        <div className="text-sm text-gray-600">
          {evidenceList.length} {evidenceList.length === 1 ? 'submission' : 'submissions'}
        </div>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
              <Select 
                value={filters.stage || 'all'} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, stage: value === 'all' ? '' : value }))}
              >
                <SelectTrigger data-testid="select-stage-filter">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="inspire">Inspire</SelectItem>
                  <SelectItem value="investigate">Investigate</SelectItem>
                  <SelectItem value="act">Act</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <Select 
                value={filters.country || 'all'} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, country: value === 'all' ? '' : value }))}
              >
                <SelectTrigger data-testid="select-country-filter">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map((country: string) => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <Select 
                value={filters.status || 'all'} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'all' ? '' : value }))}
              >
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
              <Select 
                value={filters.visibility || 'all'} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, visibility: value === 'all' ? '' : value }))}
              >
                <SelectTrigger data-testid="select-visibility-filter">
                  <SelectValue placeholder="All Visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Visibility</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => setFilters({ status: '', stage: '', country: '', visibility: '' })}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Evidence Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200" />
              <CardContent className="pt-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : evidenceList.length === 0 ? (
        <EmptyState 
          icon={FileText}
          title="No evidence submissions yet"
          description="Evidence submissions will appear here once schools start uploading"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {evidenceList.map((evidence: any) => (
            <Card key={evidence.id} className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`card-evidence-${evidence.id}`}>
              {/* Thumbnail */}
              <div className="h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
                {(() => {
                  const file = getFileForThumbnail(evidence);
                  if (file?.type === 'image') {
                    return (
                      <img 
                        src={file.url} 
                        alt={evidence.title}
                        className="w-full h-full object-cover"
                      />
                    );
                  } else if (file?.type === 'pdf') {
                    return (
                      <PDFThumbnail 
                        url={file.url}
                        className="w-full h-full"
                      />
                    );
                  } else {
                    return <FileText className="h-24 w-24 text-gray-400" />;
                  }
                })()}
              </div>
              
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {/* Title */}
                  <h3 className="font-semibold text-sm line-clamp-2" title={evidence.title}>
                    {evidence.title}
                  </h3>
                  
                  {/* School Info */}
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Building className="h-3 w-3" />
                    <button
                      onClick={() => {
                        setSelectedSchool(evidence.school);
                        setSchoolHistoryDialogOpen(true);
                      }}
                      className="hover:underline truncate"
                      data-testid={`button-school-history-${evidence.id}`}
                    >
                      {evidence.school?.name || 'Unknown School'}
                    </button>
                  </div>
                  
                  {/* Country */}
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Globe className="h-3 w-3" />
                    <span>{evidence.school?.country || 'Unknown'}</span>
                  </div>
                  
                  {/* Badges */}
                  <div className="flex flex-wrap gap-1">
                    <Badge className={getStageBadgeColor(evidence.stage)}>
                      {evidence.stage}
                    </Badge>
                    <Badge className={getStatusBadgeColor(evidence.status)}>
                      {evidence.status}
                    </Badge>
                    {evidence.visibility === 'public' && (
                      <Badge variant="outline" className="text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        Public
                      </Badge>
                    )}
                    {evidence.isFeatured && (
                      <Badge className="bg-amber-100 text-amber-800">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedEvidence(evidence);
                        setDetailsDialogOpen(true);
                      }}
                      data-testid={`button-view-evidence-${evidence.id}`}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    {evidence.status === 'pending' && (
                      <>
                        <Button 
                          size="sm" 
                          className="bg-green-500 hover:bg-green-600"
                          onClick={() => updateStatusMutation.mutate({ id: evidence.id, status: 'approved' })}
                          data-testid={`button-approve-evidence-${evidence.id}`}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => updateStatusMutation.mutate({ id: evidence.id, status: 'rejected' })}
                          data-testid={`button-reject-evidence-${evidence.id}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    <Button 
                      size="sm" 
                      variant={evidence.isFeatured ? "default" : "outline"}
                      onClick={() => toggleFeaturedMutation.mutate({ id: evidence.id, isFeatured: evidence.isFeatured })}
                      data-testid={`button-feature-evidence-${evidence.id}`}
                    >
                      <Star className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Evidence Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-evidence-details">
          <DialogHeader>
            <DialogTitle>Evidence Details</DialogTitle>
          </DialogHeader>
          {selectedEvidence && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Title</label>
                <p className="text-sm mt-1">{selectedEvidence.title}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <p className="text-sm mt-1">{selectedEvidence.description || 'No description'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">School</label>
                  <p className="text-sm mt-1">{selectedEvidence.school?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Country</label>
                  <p className="text-sm mt-1">{selectedEvidence.school?.country}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Stage</label>
                  <Badge className={getStageBadgeColor(selectedEvidence.stage)}>
                    {selectedEvidence.stage}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <Badge className={getStatusBadgeColor(selectedEvidence.status || 'pending')}>
                    {selectedEvidence.status || 'pending'}
                  </Badge>
                </div>
              </div>
              {selectedEvidence.files && Array.isArray(selectedEvidence.files) && selectedEvidence.files.length > 0 ? (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Files ({selectedEvidence.files.length})</label>
                  <EvidenceFilesGallery files={selectedEvidence.files} />
                </div>
              ) : null}
              {selectedEvidence.videoLinks && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Video Links</label>
                  <EvidenceVideoLinks videoLinks={selectedEvidence.videoLinks as string} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* School History Dialog */}
      <Dialog open={schoolHistoryDialogOpen} onOpenChange={setSchoolHistoryDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" data-testid="dialog-school-history">
          <DialogHeader>
            <DialogTitle>
              {selectedSchool?.name} - All Submissions ({schoolHistory.length})
            </DialogTitle>
          </DialogHeader>
          {schoolHistoryLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-pcs_blue border-t-transparent rounded-full" />
            </div>
          ) : schoolHistory.length === 0 ? (
            <EmptyState 
              icon={FileText}
              title="No submissions yet"
              description="This school hasn't submitted any evidence yet"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schoolHistory.map((evidence: any) => (
                <Card key={evidence.id} className="overflow-hidden" data-testid={`card-school-evidence-${evidence.id}`}>
                  <div className="h-32 bg-gray-100 flex items-center justify-center overflow-hidden">
                    {(() => {
                      const file = getFileForThumbnail(evidence);
                      if (file?.type === 'image') {
                        return (
                          <img 
                            src={file.url} 
                            alt={evidence.title}
                            className="w-full h-full object-cover"
                          />
                        );
                      } else if (file?.type === 'pdf') {
                        return (
                          <PDFThumbnail 
                            url={file.url}
                            className="w-full h-full"
                          />
                        );
                      } else {
                        return <FileText className="h-16 w-16 text-gray-400" />;
                      }
                    })()}
                  </div>
                  <CardContent className="pt-3">
                    <h4 className="font-medium text-sm line-clamp-2">{evidence.title}</h4>
                    <div className="flex gap-1 mt-2">
                      <Badge className={getStageBadgeColor(evidence.stage)} variant="outline">
                        {evidence.stage}
                      </Badge>
                      <Badge className={getStatusBadgeColor(evidence.status)}>
                        {evidence.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(evidence.submittedAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
