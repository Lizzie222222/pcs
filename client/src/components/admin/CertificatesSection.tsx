import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Award, Plus, Download, Search, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CertificateTemplate } from "@/components/CertificateTemplate";
import { LoadingSpinner, EmptyState, ErrorState } from "@/components/ui/states";
import type { Certificate, School } from "@shared/schema";
import { insertCertificateSchema } from "@shared/schema";

interface CertificatesSectionProps {
  activeTab: string;
}

// Form validation schema extending insertCertificateSchema
const certificateFormSchema = insertCertificateSchema.extend({
  schoolId: z.string().min(1, "Please select a school"),
  stage: z.enum(['inspire', 'investigate', 'act']),
  completedDate: z.string().min(1, "Completion date is required"),
  title: z.string().min(1, "Certificate title is required"),
  description: z.string().optional(),
}).omit({
  certificateNumber: true,
  issuedBy: true,
  shareableUrl: true,
  isActive: true,
  metadata: true,
});

type CertificateFormData = z.infer<typeof certificateFormSchema>;

export default function CertificatesSection({ activeTab }: CertificatesSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<(Certificate & { school: School }) | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);
  
  // Initialize form with react-hook-form and zodResolver
  const form = useForm<CertificateFormData>({
    resolver: zodResolver(certificateFormSchema),
    defaultValues: {
      schoolId: '',
      stage: 'act',
      completedDate: new Date().toISOString().split('T')[0],
      title: '',
      description: '',
    },
  });

  // Fetch all certificates with error handling
  const { data: certificates = [], isLoading, isError, error } = useQuery<Array<Certificate & { school: School }>>({
    queryKey: ['/api/admin/certificates'],
    enabled: activeTab === 'certificates',
    retry: false,
  });

  // Fetch all schools for the dropdown
  const { data: schools = [] } = useQuery<School[]>({
    queryKey: ['/api/admin/schools', { limit: 1000 }],
    enabled: createDialogOpen,
    retry: false,
  });

  // Create certificate mutation
  const createMutation = useMutation({
    mutationFn: async (data: CertificateFormData) => {
      const selectedSchool = schools.find(s => s.id === data.schoolId);
      const roundNumber = selectedSchool?.currentRound || 1;
      const certificateTitle = data.title || `Round ${roundNumber} Completion Certificate`;
      
      return await apiRequest('POST', '/api/admin/certificates', {
        ...data,
        title: certificateTitle,
      });
    },
    onSuccess: () => {
      toast({
        title: "Certificate Created",
        description: "The certificate has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/certificates'] });
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create certificate",
        variant: "destructive",
      });
    },
  });

  // Filter certificates by search query
  const filteredCertificates = certificates.filter((cert) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      cert.school.name.toLowerCase().includes(searchLower) ||
      cert.certificateNumber.toLowerCase().includes(searchLower) ||
      cert.title.toLowerCase().includes(searchLower)
    );
  });

  const handleDownloadCertificate = async () => {
    if (!certificateRef.current || !selectedCertificate) return;

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      
      const options = {
        margin: 0,
        filename: `certificate-${selectedCertificate.certificateNumber}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
      };

      await html2pdf().set(options).from(certificateRef.current).save();
      
      toast({
        title: "Downloaded",
        description: "Certificate PDF downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast({
        title: "Error",
        description: "Failed to download certificate",
        variant: "destructive",
      });
    }
  };

  // Form submission handler using react-hook-form
  const onSubmit = (data: CertificateFormData) => {
    createMutation.mutate(data);
  };

  return (
    <>
      <Card>
        <CardHeader className="p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Award className="h-5 w-5" />
                Certificates
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({filteredCertificates.length} total)
                </span>
              </CardTitle>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-pcs_blue hover:bg-blue-600 min-h-11 px-3 sm:px-4"
                data-testid="button-create-certificate"
              >
                <Plus className="h-4 w-4 mr-2" />
                Issue Certificate
              </Button>
            </div>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by school name, certificate number, or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full min-h-11"
                data-testid="input-search-certificates"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-4 lg:p-6">
          {isLoading ? (
            <LoadingSpinner />
          ) : isError ? (
            <ErrorState
              icon={AlertCircle}
              title="Failed to load certificates"
              description={error instanceof Error ? error.message : "An error occurred while fetching certificates"}
              actionLabel="Try Again"
              onAction={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/certificates'] })}
            />
          ) : filteredCertificates.length === 0 ? (
            <EmptyState
              icon={Award}
              title="No certificates found"
              description={searchQuery ? "Try adjusting your search" : "No certificates have been issued yet"}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-semibold">School</th>
                    <th className="text-left p-3 text-sm font-semibold">Certificate #</th>
                    <th className="text-left p-3 text-sm font-semibold">Title</th>
                    <th className="text-left p-3 text-sm font-semibold">Round</th>
                    <th className="text-left p-3 text-sm font-semibold">Stage</th>
                    <th className="text-left p-3 text-sm font-semibold">Completed</th>
                    <th className="text-left p-3 text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCertificates.map((cert) => {
                    const metadata = cert.metadata as any || {};
                    const round = metadata.round || 1;
                    
                    return (
                      <tr key={cert.id} className="border-b hover:bg-gray-50" data-testid={`row-certificate-${cert.id}`}>
                        <td className="p-3">
                          <div>
                            <div className="font-medium text-sm">{cert.school.name}</div>
                            <div className="text-xs text-gray-500">{cert.school.country}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {cert.certificateNumber}
                          </code>
                        </td>
                        <td className="p-3 text-sm">{cert.title}</td>
                        <td className="p-3">
                          <Badge variant="outline">Round {round}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge className={
                            cert.stage === 'inspire' ? 'bg-blue-100 text-blue-700' :
                            cert.stage === 'investigate' ? 'bg-teal-100 text-teal-700' :
                            'bg-coral-100 text-coral-700'
                          }>
                            {cert.stage}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {new Date(cert.completedDate).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCertificate(cert);
                              setPreviewDialogOpen(true);
                            }}
                            data-testid={`button-view-certificate-${cert.id}`}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Certificate Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Issue Manual Certificate</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="schoolId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-school">
                          <SelectValue placeholder="Select a school" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {schools.map((school) => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.name} ({school.country})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-stage">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="inspire">Inspire</SelectItem>
                        <SelectItem value="investigate">Investigate</SelectItem>
                        <SelectItem value="act">Act (Full Round)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="completedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Completion Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-completed-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certificate Title *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Round 1 Completion Certificate"
                        {...field}
                        data-testid="input-certificate-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes or achievements"
                        {...field}
                        data-testid="input-certificate-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-pcs_blue hover:bg-blue-600"
                  data-testid="button-confirm-create"
                >
                  {createMutation.isPending ? "Creating..." : "Issue Certificate"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Certificate Preview & Download Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Certificate Preview</DialogTitle>
          </DialogHeader>
          
          {selectedCertificate && (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden bg-white">
                <CertificateTemplate
                  ref={certificateRef}
                  certificate={selectedCertificate}
                  showBorder={false}
                />
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPreviewDialogOpen(false)}
                  data-testid="button-close-preview"
                >
                  Close
                </Button>
                <Button
                  onClick={handleDownloadCertificate}
                  className="bg-pcs_blue hover:bg-blue-600"
                  data-testid="button-download-certificate"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
