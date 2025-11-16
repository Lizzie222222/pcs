import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SchoolCombobox } from "@/components/ui/school-combobox";
import { LoadingSpinner } from "@/components/ui/states";

interface SchoolData {
  id: string;
  name: string;
  country: string;
  currentStage: string;
  progressPercentage: number;
  currentRound?: number;
  inspireCompleted?: boolean;
  investigateCompleted?: boolean;
  actCompleted?: boolean;
  studentCount: number;
  createdAt: string;
  primaryContactId: string;
  primaryContactEmail: string | null;
  type?: string;
  address?: string;
  primaryLanguage?: string | null;
}

interface UserWithSchools {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    preferredLanguage?: string;
    role: string;
    isAdmin: boolean;
    createdAt: string;
  };
  schools: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

export default function AssignTeacherForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [role, setRole] = useState<'head_teacher' | 'teacher'>('teacher');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: schoolsData, isLoading: schoolsLoading } = useQuery<{ schools: SchoolData[]; total: number }>({
    queryKey: ['/api/admin/schools'],
  });

  const schools = schoolsData?.schools || [];

  const { data: usersWithSchools = [], isLoading: usersLoading } = useQuery<UserWithSchools[]>({
    queryKey: ['/api/admin/users'],
  });

  const assignTeacherMutation = useMutation({
    mutationFn: async ({ schoolId, userEmail, role }: { schoolId: string; userEmail: string; role: string }) => {
      await apiRequest('POST', `/api/admin/schools/${schoolId}/assign-teacher`, {
        userEmail,
        role,
      });
    },
    onSuccess: () => {
      toast({
        title: "Teacher Assigned",
        description: "Teacher has been successfully assigned to the school.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/school-teachers'] });
      setSelectedSchool('');
      setSelectedUserId('');
      setRole('teacher');
      setSearchQuery('');
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign teacher. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedUser = usersWithSchools.find(u => u && u.user && u.user.id === selectedUserId);
    
    if (!selectedSchool) {
      toast({
        title: "Missing Information",
        description: "Please select a school.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedUserId) {
      toast({
        title: "Missing Information",
        description: "Please select a user.",
        variant: "destructive",
      });
      return;
    }

    // Guard against malformed user data
    if (!selectedUser || !selectedUser.user) {
      console.error('[AssignTeacherForm] Selected user has undefined user object:', selectedUserId);
      toast({
        title: "Data Error",
        description: "The selected user data is invalid. Please try selecting a different user.",
        variant: "destructive",
      });
      return;
    }

    const userEmail = selectedUser.user.email;
    if (!userEmail) {
      toast({
        title: "Email Missing",
        description: "The selected user does not have an email address on file. Please ensure the user has a valid email before assigning them.",
        variant: "destructive",
      });
      return;
    }

    assignTeacherMutation.mutate({ schoolId: selectedSchool, userEmail, role });
  };

  const filteredUsers = usersWithSchools
    .filter(item => item && item.user)
    .filter(item => {
      const fullName = `${item.user.firstName || ''} ${item.user.lastName || ''}`.toLowerCase();
      const email = item.user.email?.toLowerCase() || '';
      return fullName.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
    });

  if (schoolsLoading || usersLoading) {
    return <LoadingSpinner message="Loading data..." />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-refactor-source="AssignTeacherForm">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            School *
          </label>
          <SchoolCombobox
            schools={schools}
            value={selectedSchool}
            onValueChange={setSelectedSchool}
            placeholder="Select school..."
            testId="select-school"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            User *
          </label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger data-testid="select-user">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 pb-2">
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8"
                  data-testid="input-search-users"
                />
              </div>
              {filteredUsers.length === 0 ? (
                <div className="px-2 py-4 text-sm text-gray-500 text-center">No users found</div>
              ) : (
                filteredUsers.map((item) => (
                  <SelectItem key={item.user.id} value={item.user.id}>
                    {item.user.firstName || ''} {item.user.lastName || ''} ({item.user.email})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role *
          </label>
          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="head_teacher"
                checked={role === 'head_teacher'}
                onChange={(e) => setRole(e.target.value as 'head_teacher' | 'teacher')}
                className="text-pcs_blue"
                data-testid="radio-head-teacher"
              />
              <span className="text-sm">Head Teacher</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="teacher"
                checked={role === 'teacher'}
                onChange={(e) => setRole(e.target.value as 'head_teacher' | 'teacher')}
                className="text-pcs_blue"
                data-testid="radio-teacher"
              />
              <span className="text-sm">Teacher</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={assignTeacherMutation.isPending || !selectedSchool || !selectedUserId}
          className="bg-pcs_blue hover:bg-blue-600"
          data-testid="button-assign-teacher"
        >
          {assignTeacherMutation.isPending ? 'Assigning...' : 'Assign Teacher'}
        </Button>
      </div>
    </form>
  );
}
