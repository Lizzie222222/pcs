import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Eye, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type { SchoolData } from "@/components/admin/shared/types";
import { useTranslation } from 'react-i18next';

// SchoolTeachersRow component
interface SchoolTeacher {
  userId: string;
  name: string;
  email: string;
  role: 'head_teacher' | 'teacher';
  isVerified: boolean;
  joinedAt: string;
}

function SchoolTeachersRow({ schoolId, isExpanded }: { schoolId: string; isExpanded: boolean }) {
  const { t } = useTranslation('admin');
  const { data: teachers, isLoading, error } = useQuery<SchoolTeacher[]>({
    queryKey: ['/api/admin/schools', schoolId, 'teachers'],
    enabled: isExpanded,
  });

  if (!isExpanded) {
    return null;
  }

  if (isLoading) {
    return (
      <tr data-testid={`expanded-row-${schoolId}`}>
        <td colSpan={10} className="p-0 bg-gray-50">
          <div className="p-4 border-t">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pcs_blue mr-3"></div>
              <span className="text-gray-600">{t('schools.school_table.teachers.loading')}</span>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  if (error) {
    return (
      <tr data-testid={`expanded-row-${schoolId}`}>
        <td colSpan={10} className="p-0 bg-gray-50">
          <div className="p-4 border-t">
            <div className="text-center py-8 text-red-600">
              {t('schools.school_table.teachers.loadingError')}
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr data-testid={`expanded-row-${schoolId}`}>
      <td colSpan={10} className="p-0 bg-gray-50">
        <div className="p-4 border-t">
          {teachers?.length === 0 ? (
            <div className="text-center py-8 text-gray-500" data-testid={`no-teachers-${schoolId}`}>
              {t('schools.school_table.teachers.noTeachers')}
            </div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">{t('schools.school_table.teachers.headers.name')}</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">{t('schools.school_table.teachers.headers.email')}</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">{t('schools.school_table.teachers.headers.role')}</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">{t('schools.school_table.teachers.headers.verification')}</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">{t('schools.school_table.teachers.headers.joined')}</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers?.map((teacher) => (
                    <tr 
                      key={teacher.userId} 
                      className="border-b hover:bg-gray-50"
                      data-testid={`teacher-row-${schoolId}-${teacher.userId}`}
                    >
                      <td className="p-3 text-sm text-gray-700" data-testid={`teacher-name-${teacher.userId}`}>
                        {teacher.name}
                      </td>
                      <td className="p-3 text-sm text-gray-600" data-testid={`teacher-email-${teacher.userId}`}>
                        {teacher.email}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs" data-testid={`teacher-role-${teacher.userId}`}>
                          {teacher.role === 'head_teacher' ? t('schools.school_table.teachers.roles.headTeacher') : t('schools.school_table.teachers.roles.teacher')}
                        </Badge>
                      </td>
                      <td className="p-3" data-testid={`teacher-verified-${teacher.userId}`}>
                        {teacher.isVerified ? (
                          <Badge className="bg-green-500 text-white text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t('schools.school_table.teachers.status.verified')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <XCircle className="h-3 w-3 mr-1" />
                            {t('schools.school_table.teachers.status.notVerified')}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {new Date(teacher.joinedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

interface SchoolsTableProps {
  schools: SchoolData[] | undefined;
  schoolsLoading: boolean;
  selectedSchools: string[];
  setSelectedSchools: (schools: string[]) => void;
  setViewingSchool: (school: SchoolData | null) => void;
  setDeletingSchool: (school: SchoolData | null) => void;
  expandedSchools: Set<string>;
  setExpandedSchools: (schools: Set<string>) => void;
}

export default function SchoolsTable({
  schools,
  schoolsLoading,
  selectedSchools,
  setSelectedSchools,
  setViewingSchool,
  setDeletingSchool,
  expandedSchools,
  setExpandedSchools,
}: SchoolsTableProps) {
  const { t } = useTranslation('admin');
  
  const toggleSchoolSelection = (schoolId: string) => {
    setSelectedSchools(
      selectedSchools.includes(schoolId)
        ? selectedSchools.filter(id => id !== schoolId)
        : [...selectedSchools, schoolId]
    );
  };

  const toggleSchoolExpansion = (schoolId: string) => {
    const newExpandedSchools = new Set(expandedSchools);
    
    if (expandedSchools.has(schoolId)) {
      newExpandedSchools.delete(schoolId);
    } else {
      newExpandedSchools.add(schoolId);
    }
    
    setExpandedSchools(newExpandedSchools);
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'inspire': return 'bg-pcs_blue text-white';
      case 'investigate': return 'bg-teal text-white';
      case 'act': return 'bg-coral text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <CardContent>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-3 font-semibold text-navy w-12"></th>
              <th className="text-left p-3 font-semibold text-navy w-12">{t('schools.school_table.headers.select')}</th>
              <th className="text-left p-3 font-semibold text-navy">{t('schools.school_table.headers.school_name')}</th>
              <th className="text-left p-3 font-semibold text-navy">{t('schools.school_table.headers.country')}</th>
              <th className="text-left p-3 font-semibold text-navy">{t('schools.school_table.headers.stage')}</th>
              <th className="text-left p-3 font-semibold text-navy">{t('schools.school_table.headers.progress')}</th>
              <th className="text-left p-3 font-semibold text-navy">{t('schools.school_table.headers.students')}</th>
              <th className="text-left p-3 font-semibold text-navy">{t('schools.school_table.headers.contact')}</th>
              <th className="text-left p-3 font-semibold text-navy">{t('schools.school_table.headers.joined')}</th>
              <th className="text-left p-3 font-semibold text-navy">{t('schools.school_table.headers.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {schoolsLoading ? (
              // Skeleton rows
              [1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <tr key={i} className="border-b animate-pulse">
                  <td className="p-3">
                    <div className="h-4 w-4 bg-gray-200 rounded"></div>
                  </td>
                  <td className="p-3">
                    <div className="h-4 w-4 bg-gray-200 rounded"></div>
                  </td>
                  <td className="p-3">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </td>
                  <td className="p-3">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </td>
                  <td className="p-3">
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </td>
                  <td className="p-3">
                    <div className="h-2 bg-gray-200 rounded w-20"></div>
                  </td>
                  <td className="p-3">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </td>
                  <td className="p-3">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </td>
                  <td className="p-3">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <div className="h-8 w-8 bg-gray-200 rounded"></div>
                      <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              schools?.map((school) => (
                <>
                  <tr 
                    key={school.id} 
                    className={`border-b transition-colors ${
                      selectedSchools.includes(school.id) 
                        ? 'bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`} 
                    data-testid={`school-row-${school.id}`}
                  >
                    <td className="p-3">
                      <button
                        onClick={() => toggleSchoolExpansion(school.id)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        data-testid={`button-expand-${school.id}`}
                        aria-label={expandedSchools.has(school.id) ? t('schools.school_table.headers.collapse') : t('schools.school_table.headers.expand')}
                      >
                        {expandedSchools.has(school.id) ? (
                          <ChevronUp className="h-4 w-4 text-gray-600" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-600" />
                        )}
                      </button>
                    </td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedSchools.includes(school.id)}
                        onChange={() => toggleSchoolSelection(school.id)}
                        className="rounded border-gray-300"
                        data-testid={`checkbox-school-${school.id}`}
                      />
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-navy">{school.name}</div>
                    </td>
                    <td className="p-3 text-gray-600">{school.country}</td>
                    <td className="p-3">
                      <Badge className={getStageColor(school.currentStage)}>
                        {school.currentStage}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-20">
                          <div 
                            className="bg-teal h-2 rounded-full transition-all"
                            style={{ width: `${school.progressPercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600">{school.progressPercentage}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-gray-600">{school.studentCount}</td>
                    <td className="p-3 text-gray-600" data-testid={`text-primary-contact-${school.id}`}>
                      {school.primaryContactFirstName?.trim() && school.primaryContactLastName?.trim()
                        ? `${school.primaryContactFirstName.trim()} ${school.primaryContactLastName.trim()}`
                        : school.primaryContactEmail || t('schools.school_table.notAvailable')}
                    </td>
                    <td className="p-3 text-gray-600">
                      {new Date(school.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="min-h-11 px-3 sm:px-4"
                          onClick={() => setViewingSchool(school)}
                          data-testid={`button-view-${school.id}`}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          {t('schools.buttons.view')}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="min-h-11 px-3"
                          onClick={() => setDeletingSchool(school)}
                          data-testid={`button-delete-${school.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  <SchoolTeachersRow 
                    schoolId={school.id} 
                    isExpanded={expandedSchools.has(school.id)} 
                  />
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </CardContent>
  );
}
