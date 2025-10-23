import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { User, Globe, Lock, Trash2, Save, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import Avatar from "@/components/Avatar";
import i18n from "@/lib/i18n";

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'ru', name: 'Русский' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'ar', name: 'العربية' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'el', name: 'Ελληνικά' },
];

export default function Profile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Redirect if not authenticated (in useEffect to avoid state update during render)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isLoading, isAuthenticated, setLocation]);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });

  // Language form state
  const [selectedLanguage, setSelectedLanguage] = useState(user?.preferredLanguage || 'en');

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Delete account dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Check if user has password (not OAuth only)
  const hasPassword = !user?.googleId || user?.passwordHash;

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; email: string }) => {
      const response = await apiRequest('PUT', '/api/user/profile', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('profile.profile_updated'),
        description: t('profile.profile_updated_description'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: Error) => {
      toast({
        title: t('profile.update_failed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update language mutation
  const updateLanguageMutation = useMutation({
    mutationFn: async (language: string) => {
      const response = await apiRequest('PUT', '/api/user/language', { language });
      return response.json();
    },
    onSuccess: async (_, language) => {
      // Update i18n language
      await i18n.changeLanguage(language);
      
      toast({
        title: t('profile.language_updated'),
        description: t('profile.language_updated_description'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: Error) => {
      toast({
        title: t('profile.update_failed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest('PUT', '/api/user/password', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('profile.password_updated'),
        description: t('profile.password_updated_description'),
      });
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('profile.password_update_failed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/user/account');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('profile.account_deleted'),
        description: t('profile.account_deleted_description'),
      });
      // Redirect to logout
      window.location.href = '/api/auth/logout';
    },
    onError: (error: Error) => {
      toast({
        title: t('profile.delete_failed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };

  const handleLanguageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateLanguageMutation.mutate(selectedLanguage);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: t('profile.passwords_dont_match'),
        description: t('profile.passwords_dont_match_description'),
        variant: 'destructive',
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: t('profile.password_too_short'),
        description: t('profile.password_too_short_description'),
        variant: 'destructive',
      });
      return;
    }

    updatePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText !== 'DELETE') {
      toast({
        title: t('profile.confirmation_required'),
        description: t('profile.type_delete_to_confirm'),
        variant: 'destructive',
      });
      return;
    }

    deleteAccountMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-pcs_blue border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 pt-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Avatar 
              seed={user?.email || ''} 
              size={64}
              dataTestId="img-profile-avatar"
              alt={`${user?.firstName || user?.email}'s avatar`}
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-profile">
                {t('profile.my_profile')}
              </h1>
              <p className="text-gray-600" data-testid="text-profile-subtitle">
                {t('profile.manage_your_account')}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('profile.basic_information')}
              </CardTitle>
              <CardDescription>
                {t('profile.update_your_personal_details')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" data-testid="label-first-name">
                      {t('profile.first_name')}
                    </Label>
                    <Input
                      id="firstName"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      placeholder={t('profile.first_name_placeholder')}
                      data-testid="input-first-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" data-testid="label-last-name">
                      {t('profile.last_name')}
                    </Label>
                    <Input
                      id="lastName"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      placeholder={t('profile.last_name_placeholder')}
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email" data-testid="label-email">
                    {t('profile.email')}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    placeholder={t('profile.email_placeholder')}
                    data-testid="input-email"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="bg-pcs_blue hover:bg-blue-600"
                  data-testid="button-save-profile"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateProfileMutation.isPending ? t('profile.saving') : t('profile.save_changes')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t('profile.language_preferences')}
              </CardTitle>
              <CardDescription>
                {t('profile.choose_your_preferred_language')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLanguageSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="language" data-testid="label-language">
                    {t('profile.language')}
                  </Label>
                  <Select
                    value={selectedLanguage}
                    onValueChange={setSelectedLanguage}
                  >
                    <SelectTrigger data-testid="select-language">
                      <SelectValue placeholder={t('profile.select_language')} />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-2" data-testid="text-language-hint">
                    {t('profile.language_hint')}
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={updateLanguageMutation.isPending || selectedLanguage === user?.preferredLanguage}
                  className="bg-pcs_blue hover:bg-blue-600"
                  data-testid="button-save-language"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateLanguageMutation.isPending ? t('profile.saving') : t('profile.save_changes')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Password Change (only for users with password) */}
          {hasPassword && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  {t('profile.change_password')}
                </CardTitle>
                <CardDescription>
                  {t('profile.update_your_password')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword" data-testid="label-current-password">
                      {t('profile.current_password')}
                    </Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder={t('profile.current_password_placeholder')}
                      data-testid="input-current-password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newPassword" data-testid="label-new-password">
                      {t('profile.new_password')}
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder={t('profile.new_password_placeholder')}
                      data-testid="input-new-password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword" data-testid="label-confirm-password">
                      {t('profile.confirm_new_password')}
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder={t('profile.confirm_password_placeholder')}
                      data-testid="input-confirm-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={updatePasswordMutation.isPending}
                    className="bg-pcs_blue hover:bg-blue-600"
                    data-testid="button-change-password"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    {updatePasswordMutation.isPending ? t('profile.updating') : t('profile.update_password')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                {t('profile.danger_zone')}
              </CardTitle>
              <CardDescription>
                {t('profile.irreversible_actions')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-2" data-testid="heading-delete-account">
                    {t('profile.delete_account')}
                  </h3>
                  <p className="text-sm text-red-700 mb-4" data-testid="text-delete-warning">
                    {t('profile.delete_account_warning')}
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                    data-testid="button-delete-account"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('profile.delete_my_account')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Delete Account Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent data-testid="dialog-delete-account">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                {t('profile.confirm_account_deletion')}
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p data-testid="text-gdpr-notice">
                  {t('profile.gdpr_compliance_notice')}
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                  <p className="font-semibold text-red-800">
                    {t('profile.what_will_be_deleted')}
                  </p>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    <li>{t('profile.your_profile_data')}</li>
                    <li>{t('profile.your_school_associations')}</li>
                    <li>{t('profile.your_submitted_evidence')}</li>
                    <li>{t('profile.all_personal_information')}</li>
                  </ul>
                </div>
                <div>
                  <Label htmlFor="deleteConfirm" className="text-sm font-medium">
                    {t('profile.type_delete_to_confirm')}
                  </Label>
                  <Input
                    id="deleteConfirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="mt-2"
                    data-testid="input-delete-confirm"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">
                {t('profile.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleteAccountMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-confirm-delete"
              >
                {deleteAccountMutation.isPending ? t('profile.deleting') : t('profile.delete_permanently')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
