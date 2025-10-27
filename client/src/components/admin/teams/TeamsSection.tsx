import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, School, CheckCircle } from "lucide-react";
import AssignTeacherForm from "@/components/admin/AssignTeacherForm";
import SchoolTeachersList from "./components/SchoolTeachersList";
import VerificationRequestsList from "./components/VerificationRequestsList";

interface TeamsSectionProps {
  activeTab: string;
}

export default function TeamsSection({ activeTab }: TeamsSectionProps) {
  if (activeTab !== 'teams') {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Teacher to School
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
            School Teachers
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
            Verification Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VerificationRequestsList />
        </CardContent>
      </Card>
    </div>
  );
}
