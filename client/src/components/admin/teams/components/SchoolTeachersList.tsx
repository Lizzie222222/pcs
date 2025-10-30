import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Users, School, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/ui/states";

interface SchoolTeacher {
  userId: string;
  name: string;
  email: string;
  role: 'head_teacher' | 'teacher';
  teacherRole?: string;
  isVerified: boolean;
  joinedAt: string;
}

interface SchoolWithTeachers {
  id: string;
  name: string;
  country: string;
  teachers: SchoolTeacher[];
}

export default function SchoolTeachersList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedSchoolId, setExpandedSchoolId] = useState<string | null>(null);
  const [removingTeacher, setRemovingTeacher] = useState<{ schoolId: string; userId: string; userName: string } | null>(null);

  const { data: schoolsWithTeachers = [], isLoading } = useQuery<SchoolWithTeachers[]>({
    queryKey: ['/api/admin/school-teachers'],
  });

  const removeTeacherMutation = useMutation({
    mutationFn: async ({ schoolId, userId }: { schoolId: string; userId: string }) => {
      await apiRequest('DELETE', `/api/admin/schools/${schoolId}/teachers/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Teacher Removed",
        description: "Teacher has been successfully removed from the school.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/school-teachers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      setRemovingTeacher(null);
    },
    onError: (error: any) => {
      toast({
        title: "Removal Failed",
        description: error.message || "Failed to remove teacher. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading teachers..." />;
  }

  if (schoolsWithTeachers.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No Teachers Assigned"
        description="No teachers have been assigned to any schools yet."
      />
    );
  }

  return (
    <div className="space-y-4">
      {schoolsWithTeachers.map((school) => (
        <div key={school.id} className="border rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedSchoolId(expandedSchoolId === school.id ? null : school.id)}
            className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            data-testid={`button-expand-school-${school.id}`}
          >
            <div className="flex items-center gap-3">
              <School className="h-5 w-5 text-gray-600" />
              <div className="text-left">
                <h3 className="font-semibold text-navy">{school.name}</h3>
                <p className="text-sm text-gray-600">{school.country}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" data-testid={`text-teacher-count-${school.id}`}>
                {school.teachers.length} {school.teachers.length === 1 ? 'teacher' : 'teachers'}
              </Badge>
              <svg
                className={`h-5 w-5 text-gray-600 transition-transform ${expandedSchoolId === school.id ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {expandedSchoolId === school.id && (
            <div className="p-4 border-t">
              {school.teachers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No teachers assigned to this school.</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-2 text-sm font-medium text-gray-700">Name</th>
                      <th className="text-left p-2 text-sm font-medium text-gray-700">Email</th>
                      <th className="text-left p-2 text-sm font-medium text-gray-700">Role</th>
                      <th className="text-left p-2 text-sm font-medium text-gray-700">Verified</th>
                      <th className="text-left p-2 text-sm font-medium text-gray-700">Joined</th>
                      <th className="text-left p-2 text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {school.teachers.map((teacher) => (
                      <tr key={teacher.userId} className="border-b hover:bg-gray-50" data-testid={`teacher-row-${teacher.userId}`}>
                        <td className="p-2 text-sm text-gray-700" data-testid={`text-teacher-name-${teacher.userId}`}>
                          {teacher.name}
                        </td>
                        <td className="p-2 text-sm text-gray-600" data-testid={`text-teacher-email-${teacher.userId}`}>
                          {teacher.email}
                        </td>
                        <td className="p-2 text-sm">
                          <Badge variant="outline" data-testid={`text-teacher-role-${teacher.userId}`}>
                            {teacher.teacherRole || (teacher.role === 'head_teacher' ? 'Head Teacher' : 'Teacher')}
                          </Badge>
                        </td>
                        <td className="p-2 text-sm" data-testid={`text-teacher-verified-${teacher.userId}`}>
                          {teacher.isVerified ? (
                            <Badge className="bg-green-500 text-white">Verified</Badge>
                          ) : (
                            <Badge variant="outline">Not Verified</Badge>
                          )}
                        </td>
                        <td className="p-2 text-sm text-gray-600">
                          {new Date(teacher.joinedAt).toLocaleDateString()}
                        </td>
                        <td className="p-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setRemovingTeacher({ 
                              schoolId: school.id, 
                              userId: teacher.userId, 
                              userName: teacher.name 
                            })}
                            data-testid={`button-remove-teacher-${teacher.userId}`}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      ))}

      <AlertDialog open={!!removingTeacher} onOpenChange={(open) => !open && setRemovingTeacher(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Teacher</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removingTeacher?.userName} from this school? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removingTeacher) {
                  removeTeacherMutation.mutate({
                    schoolId: removingTeacher.schoolId,
                    userId: removingTeacher.userId,
                  });
                }
              }}
              className="bg-coral hover:bg-coral/90"
              data-testid="button-confirm-remove"
            >
              Remove Teacher
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
