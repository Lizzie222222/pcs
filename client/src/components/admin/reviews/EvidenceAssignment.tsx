import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useTranslation } from 'react-i18next';
import type { User } from "@shared/schema";

interface EvidenceAssignmentProps {
  evidenceId: string;
  currentAssignedTo: string | null;
  onAssigned?: () => void;
}

export function EvidenceAssignment({ 
  evidenceId, 
  currentAssignedTo,
  onAssigned 
}: EvidenceAssignmentProps) {
  const { toast } = useToast();
  const { t } = useTranslation('admin');

  const { data: admins } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users?role=admin', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch admins');
      return res.json();
    }
  });
  
  const assignMutation = useMutation({
    mutationFn: async (assignedTo: string | null) => {
      const res = await fetch(`/api/admin/evidence/${evidenceId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ assignedTo }),
      });
      if (!res.ok) throw new Error('Failed to assign evidence');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence'] });
      toast({ title: t('reviews.assignment.toasts.success') });
      onAssigned?.();
    },
    onError: () => {
      toast({ 
        title: t('reviews.assignment.toasts.failed'),
        variant: 'destructive'
      });
    }
  });
  
  return (
    <Select
      value={currentAssignedTo || 'unassigned'}
      onValueChange={(value) => {
        assignMutation.mutate(value === 'unassigned' ? null : value);
      }}
      disabled={assignMutation.isPending}
      data-testid="select-evidence-assignment"
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder={t('reviews.assignment.assignTo')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">{t('reviews.assignment.unassigned')}</SelectItem>
        {admins?.map((admin) => (
          <SelectItem key={admin.id} value={admin.id}>
            {admin.firstName} {admin.lastName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
