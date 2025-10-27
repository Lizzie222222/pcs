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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('teams.assignTeacher.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AssignTeacherForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            {t('teams.schoolTeachers.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SchoolTeachersList />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            {t('teams.verificationRequests.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VerificationRequestsList />
        </CardContent>
      </Card>
    </div>
  );
}
