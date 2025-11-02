import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, Eye, Globe, Image as ImageIcon, X, ChevronDown, ChevronUp, Users, Send, Loader2, CheckCircle2, Search, Filter } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface EmailManagementSectionProps {
  emailForm: any;
  setEmailForm: any;
  handleSendBulkEmail: () => Promise<void>;
  schoolFilters: any;
  setSchoolFilters: any;
  countryOptions: any[];
  translations: Record<string, { subject: string; preheader: string; title: string; preTitle: string; messageContent: string; }>;
  setTranslations: (translations: Record<string, any>) => void;
  selectedPreviewLanguages: string[];
  setSelectedPreviewLanguages: (languages: string[]) => void;
  currentViewingLanguage: string;
  setCurrentViewingLanguage: (language: string) => void;
  isGeneratingTranslations: boolean;
  setIsGeneratingTranslations: (generating: boolean) => void;
}

interface MigratedUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  preferredLanguage: string;
  welcomeEmailSentAt: string | null;
  isMigrated: boolean;
  needsPasswordReset: boolean;
}

export default function EmailManagementSection({ 
  emailForm, 
  setEmailForm, 
  handleSendBulkEmail,
  schoolFilters,
  setSchoolFilters,
  countryOptions,
  translations,
  setTranslations,
  selectedPreviewLanguages,
  setSelectedPreviewLanguages,
  currentViewingLanguage,
  setCurrentViewingLanguage,
  isGeneratingTranslations,
  setIsGeneratingTranslations
}: EmailManagementSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { success: boolean; message: string } | null>>({});
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [bulkEmailConfirmOpen, setBulkEmailConfirmOpen] = useState(false);
  const [selectedEmailType, setSelectedEmailType] = useState('welcome');
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imageSearch, setImageSearch] = useState('');
  
  // Migrated users state
  const [migratedSectionOpen, setMigratedSectionOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [migratedTestEmail, setMigratedTestEmail] = useState('');
  const [migratedUserSearch, setMigratedUserSearch] = useState('');
  const [migratedLanguageFilter, setMigratedLanguageFilter] = useState('all');
  const [migratedSentFilter, setMigratedSentFilter] = useState('all');
  const [confirmMigratedSendOpen, setConfirmMigratedSendOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    welcome: { recipientEmail: '', schoolName: 'Test School' },
    invitation: { recipientEmail: '', schoolName: 'Test School', inviterName: 'John Doe', expiresInDays: 7 },
    joinRequest: { recipientEmail: '', schoolName: 'Test School', requesterName: 'Jane Smith', requesterEmail: 'jane@example.com', evidence: 'I am a teacher at this school.' },
    joinApproved: { recipientEmail: '', schoolName: 'Test School', reviewerName: 'Head Teacher', reviewNotes: '' },
    evidenceSubmitted: { recipientEmail: '', schoolName: 'Test School', evidenceTitle: 'Recycling Program', stage: 'Stage 1' },
    evidenceApproved: { recipientEmail: '', schoolName: 'Test School', evidenceTitle: 'Recycling Program' },
    evidenceRevision: { recipientEmail: '', schoolName: 'Test School', evidenceTitle: 'Recycling Program', feedback: 'Please add more details about student participation.' },
    newEvidence: { recipientEmail: '', schoolName: 'Test School', evidenceTitle: 'Recycling Program', stage: 'Stage 1', submitterName: 'Jane Smith' },
  });

  const handleSendEmail = async (type: string, endpoint: string, data: any) => {
    if (!data.recipientEmail) {
      toast({
        title: "Email Required",
        description: "Please enter a recipient email address.",
        variant: "destructive",
      });
      return;
    }

    setLoadingStates(prev => ({ ...prev, [type]: true }));
    setResults(prev => ({ ...prev, [type]: null }));

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setResults(prev => ({ ...prev, [type]: { success: true, message: `Email sent successfully to ${data.recipientEmail}` } }));
        toast({
          title: "Test Email Sent",
          description: result.message || `Email sent to ${data.recipientEmail}`,
        });
      } else {
        setResults(prev => ({ ...prev, [type]: { success: false, message: result.message || 'Failed to send email' } }));
        toast({
          title: "Failed to Send Email",
          description: result.message || 'An error occurred while sending the email.',
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setResults(prev => ({ ...prev, [type]: { success: false, message: errorMsg } }));
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [type]: false }));
    }
  };

  const updateFormData = (type: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [type]: { ...prev[type as keyof typeof prev], [field]: value }
    }));
  };

  const handleSendTestEmail = async () => {
    if (!testEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter a test email address.",
        variant: "destructive",
      });
      return;
    }

    setTestEmailSending(true);
    try {
      let contentToSend = {
        subject: emailForm.subject,
        preheader: emailForm.preheader,
        title: emailForm.title,
        preTitle: emailForm.preTitle,
        messageContent: emailForm.messageContent,
      };

      if (currentViewingLanguage !== 'en' && translations[currentViewingLanguage]) {
        contentToSend = translations[currentViewingLanguage];
      }

      const response = await fetch('/api/admin/bulk-email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...contentToSend,
          testEmail: testEmail,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send test email');
      }

      const langNames: Record<string, string> = {
        en: 'English', es: 'Spanish', fr: 'French', de: 'German',
        it: 'Italian', pt: 'Portuguese', nl: 'Dutch', ru: 'Russian',
        zh: 'Chinese', ko: 'Korean', ar: 'Arabic', id: 'Indonesian',
        el: 'Greek', cy: 'Welsh'
      };
      const languageName = langNames[currentViewingLanguage] || 'English';

      toast({
        title: "Test Email Sent",
        description: `Test email sent successfully to ${testEmail} in ${languageName}`,
      });
      setTestEmail('');
    } catch (error: any) {
      toast({
        title: "Failed to Send Test Email",
        description: error.message || "There was an error sending the test email.",
        variant: "destructive",
      });
    } finally {
      setTestEmailSending(false);
    }
  };

  const { data: mediaImages = [] } = useQuery({
    queryKey: ['/api/admin/media-assets', { mediaType: 'image', search: imageSearch }],
    enabled: imagePickerOpen,
    queryFn: async () => {
      const params = new URLSearchParams({ mediaType: 'image' });
      if (imageSearch) params.append('search', imageSearch);
      const response = await fetch(`/api/admin/media-assets?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch images');
      return response.json();
    },
  });

  // Fetch migrated users
  const { data: migratedUsers = [], isLoading: migratedUsersLoading } = useQuery<MigratedUser[]>({
    queryKey: ['/api/admin/users'],
    select: (data: any) => {
      // Handle multiple response formats:
      // 1. Array of {user, schools} objects (default non-paginated)
      // 2. {users: [...], pagination: {...}} (paginated)
      // 3. Array of raw user objects (role=admin filter)
      let usersArray: any[];
      
      if (Array.isArray(data)) {
        // Check if array contains {user, schools} objects or raw user objects
        usersArray = data.map(item => item.user || item);
      } else if (data.users) {
        // Paginated response
        usersArray = data.users.map((item: any) => item.user || item);
      } else {
        usersArray = [];
      }
      
      return usersArray.filter((user: MigratedUser) => 
        user && user.isMigrated && user.needsPasswordReset
      );
    },
  });

  // Filter migrated users based on search and filters
  const filteredMigratedUsers = migratedUsers.filter(user => {
    const searchTerm = migratedUserSearch.toLowerCase();
    const matchesSearch = !searchTerm || 
      user.email.toLowerCase().includes(searchTerm) ||
      user.firstName?.toLowerCase().includes(searchTerm) ||
      user.lastName?.toLowerCase().includes(searchTerm);
    
    const matchesLanguage = migratedLanguageFilter === 'all' || user.preferredLanguage === migratedLanguageFilter;
    const matchesSent = migratedSentFilter === 'all' || 
      (migratedSentFilter === 'sent' && user.welcomeEmailSentAt) ||
      (migratedSentFilter === 'not_sent' && !user.welcomeEmailSentAt);
    
    return matchesSearch && matchesLanguage && matchesSent;
  });

  // Send test migrated email mutation
  const sendMigratedTestEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest('POST', '/api/admin/send-test-migrated-email', { testEmail: email });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test Email Sent",
        description: `Check your inbox at ${migratedTestEmail} to preview the welcome email.`,
      });
      setMigratedTestEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Test Email",
        description: error.message || "An error occurred while sending the test email.",
        variant: "destructive",
      });
    },
  });

  // Send migrated user emails mutation
  const sendMigratedEmailsMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const response = await apiRequest('POST', '/api/admin/send-migrated-user-emails', { userIds });
      return response.json();
    },
    onSuccess: (data: any) => {
      const { sent, failed, totalMigratedUsers } = data.results || {};
      toast({
        title: "Welcome Emails Sent",
        description: `Successfully sent ${sent} out of ${totalMigratedUsers} emails. ${failed > 0 ? `${failed} failed.` : ''}`,
        variant: sent === totalMigratedUsers ? "default" : "destructive",
      });
      setConfirmMigratedSendOpen(false);
      setSelectedUserIds([]);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Emails",
        description: error.message || "An error occurred while sending welcome emails.",
        variant: "destructive",
      });
    },
  });

  const handleImageInsert = (image: any) => {
    const imgTag = `<img src="${image.signedUrl}" alt="${image.altText || image.filename}" style="max-width: 100%; height: auto;" />`;
    
    setEmailForm((prev: any) => ({
      ...prev,
      messageContent: prev.messageContent + '\n' + imgTag
    }));
    
    toast({
      title: "Image Inserted",
      description: `${image.filename} has been added to your email content`,
    });
    
    setImagePickerOpen(false);
  };

  const ResultMessage = ({ type }: { type: string }) => {
    const result = results[type];
    if (!result) return null;
    
    return (
      <div className={`p-3 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`} data-testid={`result-${type}`}>
        <p className={`text-sm font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
          {result.success ? '✅ Success' : '❌ Error'}
        </p>
        <p className={`text-sm mt-1 ${result.success ? 'text-green-800' : 'text-red-800'}`}>
          {result.message}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6" data-refactor-source="EmailManagementSection">
      {/* Test Email Forms */}
      <Card>
        <CardHeader className="p-3 sm:p-4 lg:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Mail className="h-5 w-5" />
            Test Email Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6">
          <div className="w-full">
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Select Email Type</label>
              <Select value={selectedEmailType} onValueChange={setSelectedEmailType}>
                <SelectTrigger data-testid="select-email-type">
                  <SelectValue placeholder="Select email type to test" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="welcome">Welcome Email</SelectItem>
                  <SelectItem value="invitation">Teacher Invitation</SelectItem>
                  <SelectItem value="joinRequest">Join Request</SelectItem>
                  <SelectItem value="joinApproved">Join Request Approved</SelectItem>
                  <SelectItem value="evidenceSubmitted">Evidence Submitted</SelectItem>
                  <SelectItem value="evidenceApproved">Evidence Approved</SelectItem>
                  <SelectItem value="evidenceRevision">Evidence Needs Revision</SelectItem>
                  <SelectItem value="newEvidence">New Evidence for Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Welcome Email */}
            {selectedEmailType === 'welcome' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-base sm:text-lg">Welcome Email</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipient Email *</label>
                  <Input
                    type="email"
                    placeholder="teacher@example.com"
                    value={formData.welcome.recipientEmail}
                    onChange={(e) => updateFormData('welcome', 'recipientEmail', e.target.value)}
                    data-testid="input-welcome-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">School Name *</label>
                  <Input
                    type="text"
                    placeholder="Test School"
                    value={formData.welcome.schoolName}
                    onChange={(e) => updateFormData('welcome', 'schoolName', e.target.value)}
                    data-testid="input-welcome-school"
                  />
                </div>
              </div>
              <Button
                onClick={() => handleSendEmail('welcome', '/api/admin/test-email', {
                  recipientEmail: formData.welcome.recipientEmail,
                  email: formData.welcome.recipientEmail,
                  schoolName: formData.welcome.schoolName
                })}
                disabled={loadingStates.welcome}
                className="min-h-11 px-3 sm:px-4"
                data-testid="button-send-welcome"
              >
                {loadingStates.welcome ? 'Sending...' : 'Send Welcome Email'}
              </Button>
              <ResultMessage type="welcome" />
            </div>
            )}

            {/* Teacher Invitation */}
            {selectedEmailType === 'invitation' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Teacher Invitation</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipient Email *</label>
                  <Input
                    type="email"
                    value={formData.invitation.recipientEmail}
                    onChange={(e) => updateFormData('invitation', 'recipientEmail', e.target.value)}
                    data-testid="input-invitation-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">School Name *</label>
                  <Input
                    value={formData.invitation.schoolName}
                    onChange={(e) => updateFormData('invitation', 'schoolName', e.target.value)}
                    data-testid="input-invitation-school"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Inviter Name *</label>
                  <Input
                    value={formData.invitation.inviterName}
                    onChange={(e) => updateFormData('invitation', 'inviterName', e.target.value)}
                    data-testid="input-invitation-inviter"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Expires In Days</label>
                  <Input
                    type="number"
                    value={formData.invitation.expiresInDays}
                    onChange={(e) => updateFormData('invitation', 'expiresInDays', parseInt(e.target.value))}
                    data-testid="input-invitation-expires"
                  />
                </div>
              </div>
              <Button
                onClick={() => handleSendEmail('invitation', '/api/admin/test-email/teacher-invitation', formData.invitation)}
                disabled={loadingStates.invitation}
                data-testid="button-send-invitation"
              >
                {loadingStates.invitation ? 'Sending...' : 'Send Invitation'}
              </Button>
              <ResultMessage type="invitation" />
            </div>
            )}

            {/* Join Request */}
            {selectedEmailType === 'joinRequest' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Join Request (to Head Teacher)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipient Email (Head Teacher) *</label>
                  <Input
                    type="email"
                    value={formData.joinRequest.recipientEmail}
                    onChange={(e) => updateFormData('joinRequest', 'recipientEmail', e.target.value)}
                    data-testid="input-join-request-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">School Name *</label>
                  <Input
                    value={formData.joinRequest.schoolName}
                    onChange={(e) => updateFormData('joinRequest', 'schoolName', e.target.value)}
                    data-testid="input-join-request-school"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Requester Name *</label>
                  <Input
                    value={formData.joinRequest.requesterName}
                    onChange={(e) => updateFormData('joinRequest', 'requesterName', e.target.value)}
                    data-testid="input-join-request-requester"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Requester Email *</label>
                  <Input
                    type="email"
                    value={formData.joinRequest.requesterEmail}
                    onChange={(e) => updateFormData('joinRequest', 'requesterEmail', e.target.value)}
                    data-testid="input-join-request-requester-email"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Evidence *</label>
                <Textarea
                  value={formData.joinRequest.evidence}
                  onChange={(e) => updateFormData('joinRequest', 'evidence', e.target.value)}
                  rows={3}
                  data-testid="textarea-join-request-evidence"
                />
              </div>
              <Button
                onClick={() => handleSendEmail('joinRequest', '/api/admin/test-email/join-request', formData.joinRequest)}
                disabled={loadingStates.joinRequest}
                data-testid="button-send-join-request"
              >
                {loadingStates.joinRequest ? 'Sending...' : 'Send Join Request'}
              </Button>
              <ResultMessage type="joinRequest" />
            </div>
            )}

            {/* Join Approved */}
            {selectedEmailType === 'joinApproved' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Join Request Approved</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipient Email *</label>
                  <Input
                    type="email"
                    value={formData.joinApproved.recipientEmail}
                    onChange={(e) => updateFormData('joinApproved', 'recipientEmail', e.target.value)}
                    data-testid="input-join-approved-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">School Name *</label>
                  <Input
                    value={formData.joinApproved.schoolName}
                    onChange={(e) => updateFormData('joinApproved', 'schoolName', e.target.value)}
                    data-testid="input-join-approved-school"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Reviewer Name *</label>
                  <Input
                    value={formData.joinApproved.reviewerName}
                    onChange={(e) => updateFormData('joinApproved', 'reviewerName', e.target.value)}
                    data-testid="input-join-approved-reviewer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Review Notes (Optional)</label>
                <Textarea
                  value={formData.joinApproved.reviewNotes}
                  onChange={(e) => updateFormData('joinApproved', 'reviewNotes', e.target.value)}
                  rows={3}
                  data-testid="textarea-join-approved-notes"
                />
              </div>
              <Button
                onClick={() => handleSendEmail('joinApproved', '/api/admin/test-email/join-approved', formData.joinApproved)}
                disabled={loadingStates.joinApproved}
                data-testid="button-send-join-approved"
              >
                {loadingStates.joinApproved ? 'Sending...' : 'Send Approval Email'}
              </Button>
              <ResultMessage type="joinApproved" />
            </div>
            )}

            {/* Evidence Submitted */}
            {selectedEmailType === 'evidenceSubmitted' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Evidence Submitted</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipient Email *</label>
                  <Input
                    type="email"
                    value={formData.evidenceSubmitted.recipientEmail}
                    onChange={(e) => updateFormData('evidenceSubmitted', 'recipientEmail', e.target.value)}
                    data-testid="input-evidence-submitted-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">School Name *</label>
                  <Input
                    value={formData.evidenceSubmitted.schoolName}
                    onChange={(e) => updateFormData('evidenceSubmitted', 'schoolName', e.target.value)}
                    data-testid="input-evidence-submitted-school"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Evidence Title *</label>
                  <Input
                    value={formData.evidenceSubmitted.evidenceTitle}
                    onChange={(e) => updateFormData('evidenceSubmitted', 'evidenceTitle', e.target.value)}
                    data-testid="input-evidence-submitted-title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Stage *</label>
                  <Select
                    value={formData.evidenceSubmitted.stage}
                    onValueChange={(value) => updateFormData('evidenceSubmitted', 'stage', value)}
                  >
                    <SelectTrigger data-testid="select-evidence-submitted-stage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Stage 1">Stage 1</SelectItem>
                      <SelectItem value="Stage 2">Stage 2</SelectItem>
                      <SelectItem value="Stage 3">Stage 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={() => handleSendEmail('evidenceSubmitted', '/api/admin/test-email/evidence-submitted', formData.evidenceSubmitted)}
                disabled={loadingStates.evidenceSubmitted}
                data-testid="button-send-evidence-submitted"
              >
                {loadingStates.evidenceSubmitted ? 'Sending...' : 'Send Submission Confirmation'}
              </Button>
              <ResultMessage type="evidenceSubmitted" />
            </div>
            )}

            {/* Evidence Approved */}
            {selectedEmailType === 'evidenceApproved' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Evidence Approved</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipient Email *</label>
                  <Input
                    type="email"
                    value={formData.evidenceApproved.recipientEmail}
                    onChange={(e) => updateFormData('evidenceApproved', 'recipientEmail', e.target.value)}
                    data-testid="input-evidence-approved-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">School Name *</label>
                  <Input
                    value={formData.evidenceApproved.schoolName}
                    onChange={(e) => updateFormData('evidenceApproved', 'schoolName', e.target.value)}
                    data-testid="input-evidence-approved-school"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Evidence Title *</label>
                  <Input
                    value={formData.evidenceApproved.evidenceTitle}
                    onChange={(e) => updateFormData('evidenceApproved', 'evidenceTitle', e.target.value)}
                    data-testid="input-evidence-approved-title"
                  />
                </div>
              </div>
              <Button
                onClick={() => handleSendEmail('evidenceApproved', '/api/admin/test-email/evidence-approved', formData.evidenceApproved)}
                disabled={loadingStates.evidenceApproved}
                data-testid="button-send-evidence-approved"
              >
                {loadingStates.evidenceApproved ? 'Sending...' : 'Send Approval Email'}
              </Button>
              <ResultMessage type="evidenceApproved" />
            </div>
            )}

            {/* Evidence Revision */}
            {selectedEmailType === 'evidenceRevision' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Evidence Needs Revision</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipient Email *</label>
                  <Input
                    type="email"
                    value={formData.evidenceRevision.recipientEmail}
                    onChange={(e) => updateFormData('evidenceRevision', 'recipientEmail', e.target.value)}
                    data-testid="input-evidence-revision-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">School Name *</label>
                  <Input
                    value={formData.evidenceRevision.schoolName}
                    onChange={(e) => updateFormData('evidenceRevision', 'schoolName', e.target.value)}
                    data-testid="input-evidence-revision-school"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Evidence Title *</label>
                  <Input
                    value={formData.evidenceRevision.evidenceTitle}
                    onChange={(e) => updateFormData('evidenceRevision', 'evidenceTitle', e.target.value)}
                    data-testid="input-evidence-revision-title"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Feedback *</label>
                <Textarea
                  value={formData.evidenceRevision.feedback}
                  onChange={(e) => updateFormData('evidenceRevision', 'feedback', e.target.value)}
                  rows={3}
                  data-testid="textarea-evidence-revision-feedback"
                />
              </div>
              <Button
                onClick={() => handleSendEmail('evidenceRevision', '/api/admin/test-email/evidence-revision', formData.evidenceRevision)}
                disabled={loadingStates.evidenceRevision}
                data-testid="button-send-evidence-revision"
              >
                {loadingStates.evidenceRevision ? 'Sending...' : 'Send Revision Request'}
              </Button>
              <ResultMessage type="evidenceRevision" />
            </div>
            )}

            {/* New Evidence for Admin */}
            {selectedEmailType === 'newEvidence' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">New Evidence for Admin</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipient Email (Admin) *</label>
                  <Input
                    type="email"
                    value={formData.newEvidence.recipientEmail}
                    onChange={(e) => updateFormData('newEvidence', 'recipientEmail', e.target.value)}
                    data-testid="input-new-evidence-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">School Name *</label>
                  <Input
                    value={formData.newEvidence.schoolName}
                    onChange={(e) => updateFormData('newEvidence', 'schoolName', e.target.value)}
                    data-testid="input-new-evidence-school"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Evidence Title *</label>
                  <Input
                    value={formData.newEvidence.evidenceTitle}
                    onChange={(e) => updateFormData('newEvidence', 'evidenceTitle', e.target.value)}
                    data-testid="input-new-evidence-title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Stage *</label>
                  <Select
                    value={formData.newEvidence.stage}
                    onValueChange={(value) => updateFormData('newEvidence', 'stage', value)}
                  >
                    <SelectTrigger data-testid="select-new-evidence-stage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Stage 1">Stage 1</SelectItem>
                      <SelectItem value="Stage 2">Stage 2</SelectItem>
                      <SelectItem value="Stage 3">Stage 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Submitter Name *</label>
                  <Input
                    value={formData.newEvidence.submitterName}
                    onChange={(e) => updateFormData('newEvidence', 'submitterName', e.target.value)}
                    data-testid="input-new-evidence-submitter"
                  />
                </div>
              </div>
              <Button
                onClick={() => handleSendEmail('newEvidence', '/api/admin/test-email/new-evidence', formData.newEvidence)}
                disabled={loadingStates.newEvidence}
                data-testid="button-send-new-evidence"
              >
                {loadingStates.newEvidence ? 'Sending...' : 'Send Admin Notification'}
              </Button>
              <ResultMessage type="newEvidence" />
            </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Email Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Bulk Emails
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recipient Selection */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700">Recipient Selection</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Recipients *</label>
                <Select 
                  value={emailForm.recipientType} 
                  onValueChange={(value) => setEmailForm((prev: any) => ({ ...prev, recipientType: value }))}
                >
                  <SelectTrigger data-testid="select-recipient-type">
                    <SelectValue placeholder="Select recipients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_teachers">All Teachers</SelectItem>
                    <SelectItem value="schools">Schools (with current filters)</SelectItem>
                    <SelectItem value="custom">Custom List</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Email Template</label>
                <Select 
                  value={emailForm.template} 
                  onValueChange={(value) => setEmailForm((prev: any) => ({ ...prev, template: value }))}
                >
                  <SelectTrigger data-testid="select-email-template">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="invitation">Invitation</SelectItem>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {emailForm.recipientType === 'schools' && (
              <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700">School Filters</h4>
                <p className="text-xs text-gray-600">
                  Configure filters to target specific schools. Emails will be sent to all teachers at filtered schools.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Search Schools</label>
                    <Input
                      placeholder="Search by name..."
                      value={schoolFilters.search}
                      onChange={(e) => setSchoolFilters((prev: any) => ({ ...prev, search: e.target.value }))}
                      data-testid="input-school-filter-search"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
                    <Select
                      value={schoolFilters.country}
                      onValueChange={(value) => setSchoolFilters((prev: any) => ({ ...prev, country: value }))}
                    >
                      <SelectTrigger className="h-9" data-testid="select-school-filter-country">
                        <SelectValue placeholder="All countries" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Countries</SelectItem>
                        {countryOptions.map((country: any) => (
                          <SelectItem key={country.value} value={country.value}>
                            {country.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Stage</label>
                    <Select
                      value={schoolFilters.stage}
                      onValueChange={(value) => setSchoolFilters((prev: any) => ({ ...prev, stage: value }))}
                    >
                      <SelectTrigger className="h-9" data-testid="select-school-filter-stage">
                        <SelectValue placeholder="All stages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stages</SelectItem>
                        <SelectItem value="Stage 1">Stage 1</SelectItem>
                        <SelectItem value="Stage 2">Stage 2</SelectItem>
                        <SelectItem value="Stage 3">Stage 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Language</label>
                    <Select
                      value={schoolFilters.language}
                      onValueChange={(value) => setSchoolFilters((prev: any) => ({ ...prev, language: value }))}
                    >
                      <SelectTrigger className="h-9" data-testid="select-school-filter-language">
                        <SelectValue placeholder="All languages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Languages</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="it">Italian</SelectItem>
                        <SelectItem value="pt">Portuguese</SelectItem>
                        <SelectItem value="nl">Dutch</SelectItem>
                        <SelectItem value="ru">Russian</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                        <SelectItem value="ko">Korean</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                        <SelectItem value="id">Indonesian</SelectItem>
                        <SelectItem value="el">Greek</SelectItem>
                        <SelectItem value="cy">Welsh</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {emailForm.recipientType === 'custom' && (
              <div>
                <label className="block text-sm font-medium mb-2">Email Addresses *</label>
                <Textarea
                  placeholder="Enter email addresses (one per line or comma separated)"
                  value={emailForm.recipients}
                  onChange={(e) => setEmailForm((prev: any) => ({ ...prev, recipients: e.target.value }))}
                  rows={4}
                  data-testid="textarea-custom-recipients"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {emailForm.recipients.split(/[,\n]/).filter((e: string) => e.trim()).length} email(s)
                </p>
              </div>
            )}
          </div>

          {/* Email Content */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Email Content</h3>
            <p className="text-xs text-gray-500">
              These fields will be passed to your SendGrid template. Make sure your template is set up with the corresponding variables.
            </p>
            
            {/* Auto-translate toggle */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <label className="text-sm font-medium text-gray-900">Auto-translate to recipient's language</label>
                <p className="text-xs text-gray-600 mt-1">
                  Automatically translate email content to each recipient's preferred school language using AI
                </p>
              </div>
              <Switch
                checked={emailForm.autoTranslate || false}
                onCheckedChange={(checked) => {
                  setEmailForm((prev: any) => ({ ...prev, autoTranslate: checked }));
                  if (!checked) {
                    setTranslations({});
                    setSelectedPreviewLanguages([]);
                    setCurrentViewingLanguage('en');
                  }
                }}
                data-testid="switch-auto-translate"
              />
            </div>
            
            {/* Translation Preview Section */}
            {emailForm.autoTranslate && (
              <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">Translation Preview & Editing</h4>
                    <p className="text-xs text-gray-600">
                      Select languages to preview translations. You can edit each translation before sending.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Select Languages to Preview</label>
                    <Select
                      value={selectedPreviewLanguages.length > 0 ? selectedPreviewLanguages[selectedPreviewLanguages.length - 1] : ''}
                      onValueChange={(value) => {
                        if (!selectedPreviewLanguages.includes(value)) {
                          setSelectedPreviewLanguages([...selectedPreviewLanguages, value]);
                        }
                      }}
                    >
                      <SelectTrigger className="h-9" data-testid="select-preview-language">
                        <SelectValue placeholder="Add language..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="it">Italian</SelectItem>
                        <SelectItem value="pt">Portuguese</SelectItem>
                        <SelectItem value="nl">Dutch</SelectItem>
                        <SelectItem value="ru">Russian</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                        <SelectItem value="ko">Korean</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                        <SelectItem value="id">Indonesian</SelectItem>
                        <SelectItem value="el">Greek</SelectItem>
                        <SelectItem value="cy">Welsh</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-end">
                    <Button
                      variant="default"
                      onClick={async () => {
                        if (selectedPreviewLanguages.length === 0) {
                          toast({
                            title: "No Languages Selected",
                            description: "Please select at least one language to preview.",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        setIsGeneratingTranslations(true);
                        try {
                          const languagesToGenerate = selectedPreviewLanguages.filter(lang => !translations[lang]);
                          
                          if (languagesToGenerate.length === 0) {
                            toast({
                              title: "Translations Already Available",
                              description: "All selected languages already have translations. You can edit them directly in the form fields.",
                            });
                            setIsGeneratingTranslations(false);
                            return;
                          }
                          
                          const response = await fetch('/api/admin/bulk-email/translate-preview', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                              subject: emailForm.subject,
                              preheader: emailForm.preheader,
                              title: emailForm.title,
                              preTitle: emailForm.preTitle,
                              messageContent: emailForm.messageContent,
                              languages: languagesToGenerate,
                            }),
                          });
                          
                          if (!response.ok) throw new Error('Failed to generate translations');
                          
                          const data = await response.json();
                          setTranslations((prev: Record<string, any>) => ({ ...prev, ...data.translations }));
                          toast({
                            title: "Translations Generated",
                            description: `Successfully generated translations for ${languagesToGenerate.length} language(s).`,
                          });
                        } catch (error) {
                          toast({
                            title: "Translation Failed",
                            description: "Failed to generate translations. Please try again.",
                            variant: "destructive",
                          });
                        } finally {
                          setIsGeneratingTranslations(false);
                        }
                      }}
                      disabled={!emailForm.subject || !emailForm.title || !emailForm.messageContent || selectedPreviewLanguages.length === 0 || isGeneratingTranslations}
                      className="bg-pcs_blue hover:bg-blue-600 h-9"
                      data-testid="button-generate-translations"
                    >
                      {isGeneratingTranslations ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Globe className="h-4 w-4 mr-2" />
                          Preview Translations
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Selected Languages Pills */}
                {selectedPreviewLanguages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedPreviewLanguages.map(lang => {
                      const langNames: Record<string, string> = {
                        en: 'English', es: 'Spanish', fr: 'French', de: 'German',
                        it: 'Italian', pt: 'Portuguese', nl: 'Dutch', ru: 'Russian',
                        zh: 'Chinese', ko: 'Korean', ar: 'Arabic', id: 'Indonesian',
                        el: 'Greek', cy: 'Welsh'
                      };
                      return (
                        <Badge key={lang} variant="secondary" className="flex items-center gap-1">
                          {langNames[lang]}
                          <button
                            onClick={() => {
                              setSelectedPreviewLanguages(selectedPreviewLanguages.filter(l => l !== lang));
                              if (currentViewingLanguage === lang) {
                                setCurrentViewingLanguage('en');
                              }
                            }}
                            className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                            data-testid={`remove-language-${lang}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
                
                {/* Language Switcher */}
                {Object.keys(translations).length > 0 && (
                  <div className="border-t pt-3">
                    <label className="block text-xs font-medium text-gray-700 mb-2">View/Edit Translation</label>
                    <Select
                      value={currentViewingLanguage}
                      onValueChange={setCurrentViewingLanguage}
                    >
                      <SelectTrigger className="h-9" data-testid="select-viewing-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English (Original)</SelectItem>
                        {Object.keys(translations).filter(lang => lang !== 'en').map(lang => {
                          const langNames: Record<string, string> = {
                            es: 'Spanish', fr: 'French', de: 'German',
                            it: 'Italian', pt: 'Portuguese', nl: 'Dutch', ru: 'Russian',
                            zh: 'Chinese', ko: 'Korean', ar: 'Arabic', id: 'Indonesian',
                            el: 'Greek', cy: 'Welsh'
                          };
                          return (
                            <SelectItem key={lang} value={lang}>
                              {langNames[lang]}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Subject * {currentViewingLanguage !== 'en' && translations[currentViewingLanguage] && (
                  <Badge variant="outline" className="ml-2 text-xs">Editing Translation</Badge>
                )}
              </label>
              <Input
                placeholder="Email subject line"
                value={currentViewingLanguage === 'en' || !translations[currentViewingLanguage] 
                  ? emailForm.subject 
                  : translations[currentViewingLanguage].subject}
                onChange={(e) => {
                  if (currentViewingLanguage === 'en' || !translations[currentViewingLanguage]) {
                    setEmailForm((prev: any) => ({ ...prev, subject: e.target.value }));
                  } else {
                    setTranslations({
                      ...translations,
                      [currentViewingLanguage]: {
                        ...translations[currentViewingLanguage],
                        subject: e.target.value
                      }
                    });
                  }
                }}
                data-testid="input-email-subject"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                {(currentViewingLanguage === 'en' || !translations[currentViewingLanguage] 
                  ? emailForm.subject 
                  : translations[currentViewingLanguage].subject).length}/200 characters • The main subject line for the email
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Preheader {currentViewingLanguage !== 'en' && translations[currentViewingLanguage] && (
                  <Badge variant="outline" className="ml-2 text-xs">Editing Translation</Badge>
                )}
              </label>
              <Input
                placeholder="Preview text shown in email clients (optional)"
                value={currentViewingLanguage === 'en' || !translations[currentViewingLanguage] 
                  ? emailForm.preheader 
                  : translations[currentViewingLanguage].preheader}
                onChange={(e) => {
                  if (currentViewingLanguage === 'en' || !translations[currentViewingLanguage]) {
                    setEmailForm((prev: any) => ({ ...prev, preheader: e.target.value }));
                  } else {
                    setTranslations({
                      ...translations,
                      [currentViewingLanguage]: {
                        ...translations[currentViewingLanguage],
                        preheader: e.target.value
                      }
                    });
                  }
                }}
                data-testid="input-email-preheader"
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">
                {(currentViewingLanguage === 'en' || !translations[currentViewingLanguage] 
                  ? emailForm.preheader 
                  : translations[currentViewingLanguage].preheader).length}/100 characters • Optional preview text that appears in email inbox
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Title * {currentViewingLanguage !== 'en' && translations[currentViewingLanguage] && (
                  <Badge variant="outline" className="ml-2 text-xs">Editing Translation</Badge>
                )}
              </label>
              <Input
                placeholder="Large heading inside the email"
                value={currentViewingLanguage === 'en' || !translations[currentViewingLanguage] 
                  ? emailForm.title 
                  : translations[currentViewingLanguage].title}
                onChange={(e) => {
                  if (currentViewingLanguage === 'en' || !translations[currentViewingLanguage]) {
                    setEmailForm((prev: any) => ({ ...prev, title: e.target.value }));
                  } else {
                    setTranslations({
                      ...translations,
                      [currentViewingLanguage]: {
                        ...translations[currentViewingLanguage],
                        title: e.target.value
                      }
                    });
                  }
                }}
                data-testid="input-email-title"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                {(currentViewingLanguage === 'en' || !translations[currentViewingLanguage] 
                  ? emailForm.title 
                  : translations[currentViewingLanguage].title).length}/200 characters • The main heading displayed in the email body
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Pre-title (Subtitle) {currentViewingLanguage !== 'en' && translations[currentViewingLanguage] && (
                  <Badge variant="outline" className="ml-2 text-xs">Editing Translation</Badge>
                )}
              </label>
              <Input
                placeholder="Subtitle under the title (optional)"
                value={currentViewingLanguage === 'en' || !translations[currentViewingLanguage] 
                  ? emailForm.preTitle 
                  : translations[currentViewingLanguage].preTitle}
                onChange={(e) => {
                  if (currentViewingLanguage === 'en' || !translations[currentViewingLanguage]) {
                    setEmailForm((prev: any) => ({ ...prev, preTitle: e.target.value }));
                  } else {
                    setTranslations({
                      ...translations,
                      [currentViewingLanguage]: {
                        ...translations[currentViewingLanguage],
                        preTitle: e.target.value
                      }
                    });
                  }
                }}
                data-testid="input-email-pretitle"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                {(currentViewingLanguage === 'en' || !translations[currentViewingLanguage] 
                  ? emailForm.preTitle 
                  : translations[currentViewingLanguage].preTitle).length}/200 characters • Optional subtitle text below the title
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">
                  Message Content * {currentViewingLanguage !== 'en' && translations[currentViewingLanguage] && (
                    <Badge variant="outline" className="ml-2 text-xs">Editing Translation</Badge>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setImagePickerOpen(true)}
                    data-testid="button-insert-image"
                  >
                    <ImageIcon className="h-4 w-4 mr-1" />
                    Insert Image
                  </Button>
                  <span className="text-xs text-gray-500">Supports HTML formatting</span>
                </div>
              </div>
              <Textarea
                placeholder="Enter the main message content. HTML tags are supported for formatting."
                value={currentViewingLanguage === 'en' || !translations[currentViewingLanguage] 
                  ? emailForm.messageContent 
                  : translations[currentViewingLanguage].messageContent}
                onChange={(e) => {
                  if (currentViewingLanguage === 'en' || !translations[currentViewingLanguage]) {
                    setEmailForm((prev: any) => ({ ...prev, messageContent: e.target.value }));
                  } else {
                    setTranslations({
                      ...translations,
                      [currentViewingLanguage]: {
                        ...translations[currentViewingLanguage],
                        messageContent: e.target.value
                      }
                    });
                  }
                }}
                rows={10}
                data-testid="textarea-email-content"
                className="font-mono text-sm"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">
                  {(currentViewingLanguage === 'en' || !translations[currentViewingLanguage] 
                    ? emailForm.messageContent 
                    : translations[currentViewingLanguage].messageContent).length}/10,000 characters
                </p>
                <p className="text-xs text-gray-500">
                  ~{Math.ceil((currentViewingLanguage === 'en' || !translations[currentViewingLanguage] 
                    ? emailForm.messageContent 
                    : translations[currentViewingLanguage].messageContent).split(/\s+/).filter((w: string) => w).length / 200)} min read
                </p>
              </div>
            </div>
          </div>

          {/* Preview and Test Section */}
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-gray-700">Preview & Test</h3>
            
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => setPreviewDialogOpen(true)}
                disabled={!emailForm.subject || !emailForm.title || !emailForm.messageContent}
                data-testid="button-preview-email"
                className="flex-1 min-w-[150px]"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Email
              </Button>
              
              <div className="flex-1 min-w-[300px] flex gap-2">
                <Input
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  data-testid="input-test-email"
                  type="email"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleSendTestEmail}
                  disabled={!emailForm.subject || !emailForm.title || !emailForm.messageContent || !testEmail.trim() || testEmailSending}
                  data-testid="button-send-test-email"
                >
                  {testEmailSending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Test
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Send Bulk Email Button */}
          <Button
            onClick={() => setBulkEmailConfirmOpen(true)}
            disabled={!emailForm.subject || !emailForm.title || !emailForm.messageContent || 
              (emailForm.recipientType === 'custom' && !emailForm.recipients.trim())}
            className="w-full bg-coral hover:bg-coral/90 h-12 text-base"
            data-testid="button-send-bulk-email"
          >
            <Mail className="h-5 w-5 mr-2" />
            Send Bulk Email to {emailForm.recipientType === 'all_teachers' ? 'All Teachers' : 
              emailForm.recipientType === 'schools' ? 'Filtered Schools' : 'Custom Recipients'}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-email-preview">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Email Preview
              {currentViewingLanguage !== 'en' && translations[currentViewingLanguage] && (
                <Badge variant="outline" className="ml-2">
                  {(() => {
                    const langNames: Record<string, string> = {
                      es: 'Spanish', fr: 'French', de: 'German',
                      it: 'Italian', pt: 'Portuguese', nl: 'Dutch', ru: 'Russian',
                      zh: 'Chinese', ko: 'Korean', ar: 'Arabic', id: 'Indonesian',
                      el: 'Greek', cy: 'Welsh'
                    };
                    return langNames[currentViewingLanguage] || currentViewingLanguage;
                  })()}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-b pb-3">
              <p className="text-xs text-gray-500 mb-1">Subject:</p>
              <p className="text-lg font-semibold" data-testid="text-preview-subject">
                {currentViewingLanguage !== 'en' && translations[currentViewingLanguage]
                  ? translations[currentViewingLanguage].subject
                  : emailForm.subject}
              </p>
            </div>
            {(currentViewingLanguage !== 'en' && translations[currentViewingLanguage]
              ? translations[currentViewingLanguage].preheader
              : emailForm.preheader) && (
              <div className="border-b pb-3">
                <p className="text-xs text-gray-500 mb-1">Preheader:</p>
                <p className="text-sm text-gray-600" data-testid="text-preview-preheader">
                  {currentViewingLanguage !== 'en' && translations[currentViewingLanguage]
                    ? translations[currentViewingLanguage].preheader
                    : emailForm.preheader}
                </p>
              </div>
            )}
            <div className="border rounded-lg p-6 bg-gradient-to-b from-gray-50 to-white">
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <h2 className="text-2xl font-bold text-navy" data-testid="text-preview-title">
                    {currentViewingLanguage !== 'en' && translations[currentViewingLanguage]
                      ? translations[currentViewingLanguage].title
                      : emailForm.title}
                  </h2>
                  {(currentViewingLanguage !== 'en' && translations[currentViewingLanguage]
                    ? translations[currentViewingLanguage].preTitle
                    : emailForm.preTitle) && (
                    <p className="text-base text-gray-600 mt-2" data-testid="text-preview-pretitle">
                      {currentViewingLanguage !== 'en' && translations[currentViewingLanguage]
                        ? translations[currentViewingLanguage].preTitle
                        : emailForm.preTitle}
                    </p>
                  )}
                </div>
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: currentViewingLanguage !== 'en' && translations[currentViewingLanguage]
                      ? translations[currentViewingLanguage].messageContent
                      : emailForm.messageContent
                  }}
                  data-testid="preview-html-content"
                  className="prose prose-sm max-w-none"
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Email Confirmation Dialog */}
      <AlertDialog open={bulkEmailConfirmOpen} onOpenChange={setBulkEmailConfirmOpen}>
        <AlertDialogContent data-testid="dialog-confirm-bulk-email">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Email Send</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to send this email to:</p>
              <p className="font-semibold text-gray-900">
                {emailForm.recipientType === 'all_teachers' ? 'All Teachers' : 
                  emailForm.recipientType === 'schools' ? 'Teachers in Filtered Schools' : 
                  `${emailForm.recipients.split(/[,\n]/).filter((e: string) => e.trim()).length} Custom Recipients`}
              </p>
              <p className="text-sm">Subject: <span className="font-medium">{emailForm.subject}</span></p>
              <p className="text-amber-600 mt-3">This action cannot be undone. Make sure you've tested the email first.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-send">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await handleSendBulkEmail();
                  setBulkEmailConfirmOpen(false);
                } catch (error) {
                  // Error already handled in handleSendBulkEmail
                }
              }}
              className="bg-coral hover:bg-coral/90"
              data-testid="button-confirm-bulk-send"
            >
              Send Bulk Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Migrated Users Welcome Emails Section */}
      {migratedUsers.length > 0 && (
        <Card>
          <Collapsible open={migratedSectionOpen} onOpenChange={setMigratedSectionOpen}>
            <CardHeader className="p-3 sm:p-4 lg:p-6">
              <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-70 transition-opacity" data-testid="button-toggle-migrated-section">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <CardTitle className="text-base sm:text-lg">Migrated Users - Welcome Emails</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {migratedUsers.length} migrated {migratedUsers.length === 1 ? 'user' : 'users'} awaiting welcome emails
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-white">
                    {filteredMigratedUsers.length} shown
                  </Badge>
                  {migratedSectionOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CollapsibleTrigger>
            </CardHeader>

            <CollapsibleContent>
              <CardContent className="p-3 sm:p-4 lg:p-6 space-y-4">
                {/* Test Email Section */}
                <div className="bg-green-50 rounded-lg p-4 space-y-3 border border-green-200">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <Send className="h-4 w-4 text-green-600" />
                    Test Email First
                  </h4>
                  <p className="text-sm text-gray-600">
                    Send a test welcome email to yourself to preview before sending to users.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="your.email@example.com"
                      value={migratedTestEmail}
                      onChange={(e) => setMigratedTestEmail(e.target.value)}
                      className="flex-1"
                      data-testid="input-migrated-test-email"
                    />
                    <Button
                      onClick={() => sendMigratedTestEmailMutation.mutate(migratedTestEmail)}
                      disabled={!migratedTestEmail || sendMigratedTestEmailMutation.isPending}
                      variant="outline"
                      className="border-green-300 hover:bg-green-50"
                      data-testid="button-send-migrated-test"
                    >
                      {sendMigratedTestEmailMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Test
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Search and Filters */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-gray-500" />
                    <h4 className="font-medium text-gray-900">Search & Filter Users</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Input
                        placeholder="Search by name or email..."
                        value={migratedUserSearch}
                        onChange={(e) => setMigratedUserSearch(e.target.value)}
                        data-testid="input-migrated-user-search"
                      />
                    </div>
                    <div>
                      <Select value={migratedLanguageFilter} onValueChange={setMigratedLanguageFilter}>
                        <SelectTrigger data-testid="select-migrated-language-filter">
                          <SelectValue placeholder="All languages" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Languages</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                          <SelectItem value="it">Italian</SelectItem>
                          <SelectItem value="pt">Portuguese</SelectItem>
                          <SelectItem value="nl">Dutch</SelectItem>
                          <SelectItem value="ru">Russian</SelectItem>
                          <SelectItem value="zh">Chinese</SelectItem>
                          <SelectItem value="ko">Korean</SelectItem>
                          <SelectItem value="ar">Arabic</SelectItem>
                          <SelectItem value="id">Indonesian</SelectItem>
                          <SelectItem value="el">Greek</SelectItem>
                          <SelectItem value="cy">Welsh</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Select value={migratedSentFilter} onValueChange={setMigratedSentFilter}>
                        <SelectTrigger data-testid="select-migrated-sent-filter">
                          <SelectValue placeholder="All users" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          <SelectItem value="not_sent">Not Sent</SelectItem>
                          <SelectItem value="sent">Email Sent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Users Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedUserIds.length === filteredMigratedUsers.length && filteredMigratedUsers.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUserIds(filteredMigratedUsers.map(u => u.id));
                              } else {
                                setSelectedUserIds([]);
                              }
                            }}
                            data-testid="checkbox-select-all-migrated"
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Language</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {migratedUsersLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                          </TableCell>
                        </TableRow>
                      ) : filteredMigratedUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            No users found matching filters
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMigratedUsers.map(user => (
                          <TableRow key={user.id} data-testid={`row-migrated-user-${user.id}`}>
                            <TableCell>
                              <Checkbox
                                checked={selectedUserIds.includes(user.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedUserIds([...selectedUserIds, user.id]);
                                  } else {
                                    setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                                  }
                                }}
                                data-testid={`checkbox-migrated-user-${user.id}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {user.firstName || user.lastName 
                                ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                                : '-'}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {user.preferredLanguage.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.welcomeEmailSentAt ? (
                                <Badge variant="default" className="bg-green-500">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Sent
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Send Button */}
                {selectedUserIds.length > 0 && (
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">{selectedUserIds.length}</span> {selectedUserIds.length === 1 ? 'user' : 'users'} selected
                    </p>
                    <Button
                      onClick={() => setConfirmMigratedSendOpen(true)}
                      className="bg-pcs_blue hover:bg-blue-600"
                      data-testid="button-send-migrated-emails"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Send Welcome Emails
                    </Button>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Image Picker Dialog */}
      <Dialog open={imagePickerOpen} onOpenChange={setImagePickerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]" data-testid="dialog-image-picker">
          <DialogHeader>
            <DialogTitle>Insert Image from Media Library</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search images..."
              value={imageSearch}
              onChange={(e) => setImageSearch(e.target.value)}
              data-testid="input-image-search"
            />
            
            <div className="grid grid-cols-4 gap-4 max-h-[400px] overflow-y-auto">
              {mediaImages.map((image: any) => (
                <div 
                  key={image.id}
                  className="border rounded cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => handleImageInsert(image)}
                  data-testid={`image-picker-${image.id}`}
                >
                  <img src={image.signedUrl} alt={image.altText || image.filename} className="w-full h-32 object-cover rounded-t" />
                  <div className="p-2 text-xs">
                    <p className="font-medium truncate">{image.filename}</p>
                    {image.altText && <p className="text-gray-500 truncate">{image.altText}</p>}
                  </div>
                </div>
              ))}
            </div>
            
            {mediaImages.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No images found in Media Library</p>
                <p className="text-sm">Upload images in the Media Library tab first</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Migrated Users Confirmation Dialog */}
      <AlertDialog open={confirmMigratedSendOpen} onOpenChange={setConfirmMigratedSendOpen}>
        <AlertDialogContent data-testid="dialog-confirm-migrated-send">
          <AlertDialogHeader>
            <AlertDialogTitle>Send Welcome Emails?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send welcome emails with temporary passwords to {selectedUserIds.length} selected {selectedUserIds.length === 1 ? 'user' : 'users'}.
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Each user will receive an email with a temporary password and instructions to access their account.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-migrated-send">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sendMigratedEmailsMutation.mutate(selectedUserIds)}
              disabled={sendMigratedEmailsMutation.isPending}
              className="bg-pcs_blue hover:bg-blue-600"
              data-testid="button-confirm-migrated-send"
            >
              {sendMigratedEmailsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Emails
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
