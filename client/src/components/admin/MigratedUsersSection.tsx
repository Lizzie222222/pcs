import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Mail, Users, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isMigrated: boolean;
  needsPasswordReset: boolean;
}

export default function MigratedUsersSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    select: (data: any[]) => {
      // Extract users from the usersWithSchools structure
      return data.map(item => item.user).filter((user: User) => user.isMigrated && user.needsPasswordReset);
    },
  });

  const sendEmailsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/send-migrated-user-emails', {});
      return response;
    },
    onSuccess: (data: any) => {
      const { sent, failed, totalMigratedUsers } = data.results;
      toast({
        title: "Welcome Emails Sent",
        description: `Successfully sent ${sent} out of ${totalMigratedUsers} emails. ${failed > 0 ? `${failed} failed.` : ''}`,
        variant: sent === totalMigratedUsers ? "default" : "destructive",
      });
      setConfirmDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Emails",
        description: error.message || "An error occurred while sending welcome emails to migrated users.",
        variant: "destructive",
      });
    },
  });

  const handleSendEmails = () => {
    setConfirmDialogOpen(true);
  };

  const confirmSendEmails = () => {
    sendEmailsMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (users.length === 0) {
    return null; // Don't show the card if there are no migrated users
  }

  return (
    <>
      <Card className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200" data-testid="card-migrated-users">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Migrated Users</CardTitle>
                <CardDescription>
                  Users migrated from the old platform awaiting welcome emails
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="bg-white border-blue-300 text-blue-700 font-semibold">
              {users.length} {users.length === 1 ? 'user' : 'users'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-gray-700">
              These users have been migrated from the WordPress-based system. They need to receive 
              temporary passwords via email to access their accounts.
            </AlertDescription>
          </Alert>

          <div className="bg-white rounded-lg p-4 space-y-2 border border-gray-200">
            <h4 className="font-medium text-gray-900">What happens when you send emails?</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
              <li>Each user receives a welcome email with a temporary password</li>
              <li>The email includes their school information and login instructions</li>
              <li>Users will be prompted to create a new password on first login</li>
              <li>Users can confirm or update their names during onboarding</li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-gray-600">
              Ready to send welcome emails to all {users.length} migrated {users.length === 1 ? 'user' : 'users'}?
            </p>
            <Button
              onClick={handleSendEmails}
              disabled={sendEmailsMutation.isPending}
              className="bg-pcs_blue hover:bg-blue-600"
              data-testid="button-send-migrated-emails"
            >
              {sendEmailsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Welcome Emails
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent data-testid="dialog-confirm-send-emails">
          <DialogHeader>
            <DialogTitle>Send Welcome Emails?</DialogTitle>
            <DialogDescription>
              This will send welcome emails with temporary passwords to {users.length} migrated {users.length === 1 ? 'user' : 'users'}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-gray-700">
                <strong>Important:</strong> Each user will receive an email containing their temporary password. 
                Make sure you're ready to support users who may have questions about logging in.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={sendEmailsMutation.isPending}
              data-testid="button-cancel-send-emails"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmSendEmails}
              disabled={sendEmailsMutation.isPending}
              className="bg-pcs_blue hover:bg-blue-600"
              data-testid="button-confirm-send-emails"
            >
              {sendEmailsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Send Emails
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
