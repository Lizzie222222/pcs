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
import { SchoolCombobox } from "@/components/ui/school-combobox";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Award, Plus, Download, Search, FileText, AlertCircle, Upload, RotateCcw, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CertificateTemplate } from "@/components/CertificateTemplate";
import { LoadingSpinner, EmptyState, ErrorState } from "@/components/ui/states";
import type { Certificate, School } from "@shared/schema";
import { insertCertificateSchema } from "@shared/schema";
import { format } from "date-fns";

interface CertificatesSectionProps {
  activeTab: string;
}

// Form validation schema extending insertCertificateSchema
// Note: Stage is always 'act' since certificates are only issued for programme completion
const certificateFormSchema = insertCertificateSchema.extend({
  schoolId: z.string().min(1, "Please select a school"),
  completedDate: z.string().min(1, "Completion date is required"),
  title: z.string().min(1, "Certificate title is required"),
  description: z.string().optional(),
}).omit({
  certificateNumber: true,
  issuedBy: true,
  shareableUrl: true,
  isActive: true,
  metadata: true,
  stage: true, // Stage is always 'act' for programme completion
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
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize form with react-hook-form and zodResolver
  const form = useForm<CertificateFormData>({
    resolver: zodResolver(certificateFormSchema),
    defaultValues: {
      schoolId: '',
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

  // Fetch current certificate background
  const { data: backgroundData, isLoading: isLoadingBackground } = useQuery<{ url: string | null }>({
    queryKey: ['/api/admin/settings/certificate-background'],
    enabled: activeTab === 'certificates',
    retry: false,
  });

  // Create certificate mutation
  const createMutation = useMutation({
    mutationFn: async (data: CertificateFormData) => {
      const selectedSchool = schools.find(s => s.id === data.schoolId);
      const roundNumber = selectedSchool?.currentRound || 1;
      const certificateTitle = data.title || `Round ${roundNumber} Completion Certificate`;
      
      // Always use 'act' stage since certificates are only for programme completion
      return await apiRequest('POST', '/api/admin/certificates', {
        ...data,
        stage: 'act',
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

  // Upload certificate background mutation
  const uploadBackgroundMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/admin/settings/certificate-background', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload background');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Background Updated",
        description: "Certificate background has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/certificate-background'] });
      setBackgroundFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload background",
        variant: "destructive",
      });
    },
  });

  // Reset certificate background mutation
  const resetBackgroundMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', '/api/admin/settings/certificate-background', {});
    },
    onSuccess: () => {
      toast({
        title: "Background Reset",
        description: "Certificate background has been reset to default.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/certificate-background'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset background",
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

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file (.png, .jpg, .jpeg)",
          variant: "destructive",
        });
        return;
      }
      setBackgroundFile(file);
    }
  };

  // Handle upload
  const handleUpload = () => {
    if (backgroundFile) {
      uploadBackgroundMutation.mutate(backgroundFile);
    }
  };

  // Handle reset
  const handleReset = () => {
    resetBackgroundMutation.mutate();
  };

  return (
    <>
      {/* Certificate Background Settings Section */}
      <Card className="mb-6">
        <CardHeader className="p-3 sm:p-4 lg:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ImageIcon className="h-5 w-5" />
            Certificate Background Settings
          </CardTitle>
          <p className="text-sm text-gray-500 mt-2">
            Upload a custom background image for all certificates. This will replace the default background on all generated certificates.
          </p>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Preview Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Current Background</h3>
              <div className="border rounded-lg p-4 bg-gray-50">
                {isLoadingBackground ? (
                  <div className="h-48 flex items-center justify-center">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <div className="relative h-48 flex items-center justify-center bg-white rounded overflow-hidden">
                    {backgroundData?.url ? (
                      <img
                        src={backgroundData.url}
                        alt="Current certificate background"
                        className="w-full h-full object-cover"
                        data-testid="img-current-background"
                      />
                    ) : (
                      <div className="text-center text-gray-400">
                        <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                        <p className="text-sm">Using default background</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Upload Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Upload New Background</h3>
              <div className="space-y-4">
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                    onChange={handleFileChange}
                    className="hidden"
                    data-testid="input-background-file"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                    data-testid="button-select-file"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Select Image File
                  </Button>
                  {backgroundFile && (
                    <p className="text-sm text-gray-600 mt-2" data-testid="text-selected-file">
                      Selected: {backgroundFile.name}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleUpload}
                    disabled={!backgroundFile || uploadBackgroundMutation.isPending}
                    className="flex-1 bg-pcs_blue hover:bg-blue-600"
                    data-testid="button-upload-background"
                  >
                    {uploadBackgroundMutation.isPending ? (
                      <>
                        <LoadingSpinner />
                        <span className="ml-2">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Custom Background
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleReset}
                    disabled={!backgroundData?.url || resetBackgroundMutation.isPending}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-reset-background"
                  >
                    {resetBackgroundMutation.isPending ? (
                      <>
                        <LoadingSpinner />
                        <span className="ml-2">Resetting...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset to Default
                      </>
                    )}
                  </Button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> Accepted formats: PNG, JPG, JPEG. Recommended size: 1920x1080 pixels or larger for best quality.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificates List Section */}
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
                          {format(new Date(cert.completedDate), 'dd/MM/yyyy')}
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
                    <FormControl>
                      <SchoolCombobox
                        schools={schools}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Select a school..."
                        testId="select-school"
                      />
                    </FormControl>
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
                  backgroundUrl={backgroundData?.url || undefined}
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
