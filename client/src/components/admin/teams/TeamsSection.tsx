import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, School, CheckCircle } from "lucide-react";
import AssignTeacherForm from "@/components/admin/AssignTeacherForm";
import SchoolTeachersList from "./components/SchoolTeachersList";
import VerificationRequestsList from "./components/VerificationRequestsList";

interface TeamsSectionProps {
  activeTab: string;
}

export default function TeamsSection({ activeTab }: TeamsSectionProps) {
  const { t } = useTranslation('admin');
  
  if (activeTab !== 'teams') {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="p-3 sm:p-4 lg:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Users className="h-5 w-5" />
            {t('teams.assignTeacher.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6">
          <AssignTeacherForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 sm:p-4 lg:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <School className="h-5 w-5" />
            {t('teams.schoolTeachers.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6">
          <SchoolTeachersList />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 sm:p-4 lg:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CheckCircle className="h-5 w-5" />
            {t('teams.verificationRequests.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6">
          <VerificationRequestsList />
        </CardContent>
      </Card>
    </div>
  );
}
