import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, Plus, Trash2, Send, CheckCircle, Target, AlertCircle, Clock } from "lucide-react";
import type { AuditResponse } from "@shared/schema";
import type { TFunction } from "i18next";

interface ActionPlanProps {
  schoolId: string;
  evidenceRequirementId: string;
  onClose?: () => void;
}

// Factory function for promise schema with i18n support
const createPromiseSchema = (t: TFunction) => z.object({
  plasticItemType: z.string().min(1, t('actionPlan.validation.selectPlasticItem')),
  plasticItemLabel: z.string().min(1, t('actionPlan.validation.itemLabelRequired')),
  baselineQuantity: z.number().min(1, t('actionPlan.validation.baselineMinimum')),
  targetQuantity: z.number().min(0, t('actionPlan.validation.targetNonNegative')),
  timeframeUnit: z.enum(["week", "month", "year"]),
  notes: z.string().optional(),
});

// Factory function for action plan schema with i18n support
const createActionPlanSchema = (t: TFunction) => z.object({
  promises: z.array(createPromiseSchema(t)).min(2, t('actionPlan.validation.minimumPromises')),
});

export function ActionPlan({ schoolId, evidenceRequirementId, onClose }: ActionPlanProps) {
  const { t } = useTranslation('audit');
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create schemas with translation support
  const actionPlanSchema = createActionPlanSchema(t);
  type ActionPlanData = z.infer<typeof actionPlanSchema>;

  // Fetch existing audit data to get plastic items
  const { data: auditResponse } = useQuery<AuditResponse>({
    queryKey: [`/api/audits/school/${schoolId}`],
    enabled: !!schoolId,
  });

  // Fetch existing action plan evidence
  const { data: existingEvidence } = useQuery({
    queryKey: [`/api/evidence/requirement/${evidenceRequirementId}/school/${schoolId}`],
    enabled: !!schoolId && !!evidenceRequirementId,
  });

  // Check if action plan already exists
  const hasExistingActionPlan = existingEvidence && Array.isArray(existingEvidence) && existingEvidence.length > 0;
  const actionPlanStatus = hasExistingActionPlan ? existingEvidence[0]?.status : null;

  // Fetch reduction promises for this school
  const { data: reductionPromises = [], isLoading: promisesLoading } = useQuery<any[]>({
    queryKey: [`/api/reduction-promises/school/${schoolId}`],
    enabled: !!schoolId && (actionPlanStatus === 'pending' || actionPlanStatus === 'approved'),
  });

  // Form with validation
  const form = useForm<ActionPlanData>({
    resolver: zodResolver(actionPlanSchema),
    defaultValues: {
      promises: [
        {
          plasticItemType: "",
          plasticItemLabel: "",
          baselineQuantity: 0,
          targetQuantity: 0,
          timeframeUnit: "month" as const,
          notes: "",
        },
        {
          plasticItemType: "",
          plasticItemLabel: "",
          baselineQuantity: 0,
          targetQuantity: 0,
          timeframeUnit: "month" as const,
          notes: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "promises",
  });

  // Extract plastic items from audit data
  const extractAuditItems = () => {
    if (!auditResponse) return [];
    
    const items: Array<{ type: string; label: string; quantity: number }> = [];
    
    // Get data from audit parts
    const part2 = auditResponse.part2Data as any;
    const part3 = auditResponse.part3Data as any;
    
    if (!part2 || !part3) return items;

    // Map of plastic item types to their totals
    const itemTotals: Record<string, number> = {};
    
    // Part 2 - Lunchroom & Staffroom
    itemTotals['plastic_bottles'] = (itemTotals['plastic_bottles'] || 0) + 
      parseInt(part2.lunchroomPlasticBottles || "0") +
      parseInt(part2.staffroomPlasticBottles || "0") +
      parseInt(part3.officePlasticBottles || "0") +
      parseInt(part3.libraryPlasticBottles || "0") +
      parseInt(part3.gymPlasticBottles || "0") +
      parseInt(part3.playgroundPlasticBottles || "0") +
      parseInt(part3.corridorsPlasticBottles || "0") +
      parseInt(part3.scienceLabsPlasticBottles || "0") +
      parseInt(part3.artRoomsPlasticBottles || "0");
      
    itemTotals['plastic_cups'] = (itemTotals['plastic_cups'] || 0) +
      parseInt(part2.lunchroomPlasticCups || "0") +
      parseInt(part2.staffroomPlasticCups || "0") +
      parseInt(part3.officePlasticCups || "0");
      
    itemTotals['plastic_cutlery'] = parseInt(part2.lunchroomPlasticCutlery || "0");
    itemTotals['plastic_straws'] = parseInt(part2.lunchroomPlasticStraws || "0");
    
    itemTotals['snack_wrappers'] = (itemTotals['snack_wrappers'] || 0) +
      parseInt(part2.lunchroomSnackWrappers || "0") +
      parseInt(part2.staffroomSnackWrappers || "0");
      
    itemTotals['yoghurt_pots'] = (itemTotals['yoghurt_pots'] || 0) +
      parseInt(part2.lunchroomYoghurtPots || "0") +
      parseInt(part2.staffroomYoghurtPots || "0");
      
    itemTotals['takeaway_containers'] = (itemTotals['takeaway_containers'] || 0) +
      parseInt(part2.lunchroomTakeawayContainers || "0") +
      parseInt(part2.staffroomTakeawayContainers || "0");
      
    itemTotals['cling_film'] = parseInt(part2.lunchroomClingFilm || "0");
    
    // Part 3 items
    itemTotals['pens_pencils'] = parseInt(part3.classroomPensPencils || "0");
    itemTotals['stationery'] = parseInt(part3.classroomStationery || "0") +
      parseInt(part3.officeStationery || "0") +
      parseInt(part3.libraryStationery || "0");
    itemTotals['display_materials'] = parseInt(part3.classroomDisplayMaterials || "0") +
      parseInt(part3.libraryDisplayMaterials || "0") +
      parseInt(part3.corridorsDisplayMaterials || "0");
    itemTotals['soap_bottles'] = parseInt(part3.toiletSoapBottles || "0");
    itemTotals['bin_liners'] = parseInt(part3.toiletBinLiners || "0") +
      parseInt(part3.corridorsBinLiners || "0");
    itemTotals['cups_dispensers'] = parseInt(part3.toiletCupsPaper || "0");
    itemTotals['period_products'] = parseInt(part3.toiletPeriodProducts || "0");
    itemTotals['sport_equipment'] = parseInt(part3.gymSportEquipment || "0");
    itemTotals['toys_equipment'] = parseInt(part3.playgroundToysEquipment || "0");
    itemTotals['lab_equipment'] = parseInt(part3.scienceLabsLabEquipment || "0");
    itemTotals['art_supplies'] = parseInt(part3.artRoomsArtSupplies || "0");
    
    // Convert to items array with translated labels
    for (const [type, quantity] of Object.entries(itemTotals)) {
      if (quantity > 0) {
        items.push({
          type,
          label: t(`actionPlan.plasticItems.${type}`),
          quantity: quantity * 190, // Annual amount
        });
      }
    }
    
    // Sort by quantity (highest first)
    return items.sort((a, b) => b.quantity - a.quantity);
  };

  // Submit action plan mutation
  const submitMutation = useMutation({
    mutationFn: async (data: ActionPlanData) => {
      setIsSubmitting(true);
      
      // Filter out empty/incomplete promises
      const validPromises = data.promises.filter(p => 
        p.plasticItemType.trim() !== "" && 
        p.plasticItemLabel.trim() !== "" && 
        p.baselineQuantity > 0
      );
      
      if (validPromises.length < 2) {
        throw new Error(t('actionPlan.validation.minimumPromises'));
      }
      
      // Create evidence submission for the action plan
      const evidenceResponse = await apiRequest('POST', '/api/evidence', {
        schoolId,
        title: t('actionPlan.overview.title'),
        description: t('actionPlan.notifications.submitSuccessDescription', { 
          count: validPromises.length, 
          plural: validPromises.length !== 1 ? 's' : '' 
        }),
        stage: "investigate",
        evidenceType: "action_plan",
        evidenceRequirementId,
      });
      
      const evidence = await evidenceResponse.json();
      
      // Create reduction promises linked to the audit
      const promisePromises = validPromises.map(promise => {
        const payload = {
          schoolId,
          auditId: auditResponse?.id,
          plasticItemType: promise.plasticItemType,
          plasticItemLabel: promise.plasticItemLabel,
          baselineQuantity: Number(promise.baselineQuantity),
          targetQuantity: Number(promise.targetQuantity),
          timeframeUnit: promise.timeframeUnit,
          notes: promise.notes || "",
        };
        return apiRequest('POST', '/api/reduction-promises', payload);
      });
      
      await Promise.all(promisePromises);
      
      return { evidence, promisesCount: validPromises.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/evidence`] });
      queryClient.invalidateQueries({ queryKey: [`/api/reduction-promises/school/${schoolId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/evidence/requirement/${evidenceRequirementId}/school/${schoolId}`] });
      
      toast({
        title: t('actionPlan.notifications.submitSuccess'),
        description: t('actionPlan.notifications.submitSuccessDescription', { 
          count: data.promisesCount, 
          plural: data.promisesCount !== 1 ? 's' : '' 
        }),
      });
      
      onClose?.();
    },
    onError: (error: Error) => {
      toast({
        title: t('actionPlan.notifications.submitError'),
        description: error.message || t('actionPlan.notifications.submitErrorDescription'),
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const availableItems = extractAuditItems();

  // If audit doesn't exist, show message
  if (!auditResponse) {
    return (
      <Card className="border-2 border-yellow-300 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-navy">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
            {t('actionPlan.status.auditRequired.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">
            {t('actionPlan.status.auditRequired.description')}
          </p>
          <Button onClick={onClose} data-testid="button-close">
            {t('actionPlan.actions.close')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // If audit is not approved, show message
  if (auditResponse.status !== 'approved') {
    return (
      <Card className="border-2 border-yellow-300 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-navy">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
            {t('actionPlan.status.auditApprovalRequired.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">
            {t('actionPlan.status.auditApprovalRequired.description')} <strong>{auditResponse.status}</strong>
          </p>
          <Button onClick={onClose} data-testid="button-close">
            {t('actionPlan.actions.close')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // If action plan already exists and is approved - show submitted promises
  if (actionPlanStatus === 'approved') {
    if (promisesLoading) {
      return (
        <Card className="border-2 border-green-300 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-navy">
              <CheckCircle className="h-6 w-6 text-green-600" />
              {t('actionPlan.status.approved.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal"></div>
              <p className="ml-3 text-gray-600">{t('actionPlan.status.pending.loadingDescription')}</p>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    if (reductionPromises.length > 0) {
    return (
      <Card className="border-2 border-green-300 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-navy">
            <CheckCircle className="h-6 w-6 text-green-600" />
            {t('actionPlan.status.approved.title')}
          </CardTitle>
          <CardDescription>
            {t('actionPlan.status.approved.description', { 
              count: reductionPromises.length, 
              plural: reductionPromises.length !== 1 ? 's' : '' 
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {reductionPromises.map((promise: any, index: number) => (
              <Card key={promise.id} className="bg-white border border-gray-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-navy mb-2">
                    {t('actionPlan.display.promiseLabel', { number: index + 1, label: promise.plasticItemLabel })}
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">{t('actionPlan.display.baseline')}</span>
                      <span className="font-semibold ml-2">
                        {promise.baselineQuantity.toLocaleString()} {t('actionPlan.display.per')} {t(`shared.timeframes.${promise.timeframeUnit}`)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">{t('actionPlan.display.target')}</span>
                      <span className="font-semibold ml-2">
                        {promise.targetQuantity.toLocaleString()} {t('actionPlan.display.per')} {t(`shared.timeframes.${promise.timeframeUnit}`)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 bg-green-50 p-2 rounded">
                    <span className="text-sm font-semibold text-green-700">
                      {t('actionPlan.display.reduction')} {promise.reductionAmount.toLocaleString()} {t('actionPlan.display.items')} ({Math.round((promise.reductionAmount / promise.baselineQuantity) * 100)}%)
                    </span>
                  </div>
                  {promise.notes && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-semibold">{t('actionPlan.display.plan')}</span> {promise.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <Button onClick={onClose} data-testid="button-close" className="w-full">
            {t('actionPlan.actions.close')}
          </Button>
        </CardContent>
      </Card>
    );
    } else {
      // Approved but no promises found (shouldn't happen, but handle gracefully)
      return (
        <Card className="border-2 border-green-300 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-navy">
              <CheckCircle className="h-6 w-6 text-green-600" />
              {t('actionPlan.status.approved.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              {t('actionPlan.status.approved.noPromisesDescription')}
            </p>
            <Button onClick={onClose} data-testid="button-close">
              {t('actionPlan.actions.close')}
            </Button>
          </CardContent>
        </Card>
      );
    }
  }

  // If action plan already exists and is pending review - show submitted promises
  if (actionPlanStatus === 'pending') {
    if (promisesLoading) {
      return (
        <Card className="border-2 border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-navy">
              <Clock className="h-6 w-6 text-yellow-600" />
              {t('actionPlan.status.pending.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal"></div>
              <p className="ml-3 text-gray-600">{t('actionPlan.status.pending.loadingDescription')}</p>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    if (reductionPromises.length > 0) {
    return (
      <Card className="border-2 border-yellow-300 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-navy">
            <Clock className="h-6 w-6 text-yellow-600" />
            {t('actionPlan.status.pending.title')}
          </CardTitle>
          <CardDescription>
            {t('actionPlan.status.pending.description', { 
              count: reductionPromises.length, 
              plural: reductionPromises.length !== 1 ? 's' : '' 
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {reductionPromises.map((promise: any, index: number) => (
              <Card key={promise.id} className="bg-white border border-gray-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-navy mb-2">
                    {t('actionPlan.display.promiseLabel', { number: index + 1, label: promise.plasticItemLabel })}
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">{t('actionPlan.display.baseline')}</span>
                      <span className="font-semibold ml-2">
                        {promise.baselineQuantity.toLocaleString()} {t('actionPlan.display.per')} {t(`shared.timeframes.${promise.timeframeUnit}`)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">{t('actionPlan.display.target')}</span>
                      <span className="font-semibold ml-2">
                        {promise.targetQuantity.toLocaleString()} {t('actionPlan.display.per')} {t(`shared.timeframes.${promise.timeframeUnit}`)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 bg-green-50 p-2 rounded">
                    <span className="text-sm font-semibold text-green-700">
                      {t('actionPlan.display.reduction')} {promise.reductionAmount.toLocaleString()} {t('actionPlan.display.items')} ({Math.round((promise.reductionAmount / promise.baselineQuantity) * 100)}%)
                    </span>
                  </div>
                  {promise.notes && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-semibold">{t('actionPlan.display.plan')}</span> {promise.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <Button onClick={onClose} data-testid="button-close" className="w-full">
            {t('actionPlan.actions.close')}
          </Button>
        </CardContent>
      </Card>
    );
    } else {
      // Pending but no promises found (shouldn't happen, but handle gracefully)
      return (
        <Card className="border-2 border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-navy">
              <Clock className="h-6 w-6 text-yellow-600" />
              {t('actionPlan.status.pending.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              {t('actionPlan.status.pending.noPromisesDescription')}
            </p>
            <Button onClick={onClose} data-testid="button-close">
              {t('actionPlan.actions.close')}
            </Button>
          </CardContent>
        </Card>
      );
    }
  }

  return (
    <Card className="border-2 border-teal">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-navy">
          <Target className="h-6 w-6 text-teal" />
          {t('actionPlan.overview.title')}
        </CardTitle>
        <CardDescription>
          {t('actionPlan.overview.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <div className="space-y-6">
            {availableItems.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                <p className="text-sm text-gray-700">
                  {t('actionPlan.notifications.noPlasticItems')}
                </p>
              </div>
            )}

            {fields.map((field, index) => {
              const selectedItem = form.watch(`promises.${index}.plasticItemType`);
              const selectedItemData = availableItems.find(item => item.type === selectedItem);

              return (
                <Card key={field.id} className="p-4 bg-gray-50 border border-gray-200" data-testid={`card-promise-${index}`}>
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-semibold text-navy">
                      {t('actionPlan.display.promisesNumber', { number: index + 1 })}
                    </h4>
                    {fields.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        data-testid={`button-remove-promise-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4">
                    <FormField
                      control={form.control}
                      name={`promises.${index}.plasticItemType`}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>{t('actionPlan.form.labels.plasticItemType')}</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              formField.onChange(value);
                              const item = availableItems.find(i => i.type === value);
                              if (item) {
                                form.setValue(`promises.${index}.plasticItemLabel`, item.label);
                                form.setValue(`promises.${index}.baselineQuantity`, item.quantity);
                              }
                            }}
                            value={formField.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid={`select-promise-type-${index}`}>
                                <SelectValue placeholder={t('actionPlan.form.placeholders.selectPlasticItem')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableItems.map((item) => (
                                <SelectItem key={item.type + item.label} value={item.type}>
                                  {item.label} ({item.quantity.toLocaleString()} {t('actionPlan.display.itemsYear')})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedItemData && (
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`promises.${index}.baselineQuantity`}
                          render={({ field: formField }) => (
                            <FormItem>
                              <FormLabel>{t('actionPlan.form.labels.currentAnnualUsage')}</FormLabel>
                              <FormControl>
                                <Input
                                  {...formField}
                                  type="number"
                                  min="1"
                                  value={formField.value}
                                  onChange={(e) => formField.onChange(parseInt(e.target.value) || 0)}
                                  data-testid={`input-promise-baseline-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`promises.${index}.targetQuantity`}
                          render={({ field: formField }) => (
                            <FormItem>
                              <FormLabel>{t('actionPlan.form.labels.targetAnnualUsage')}</FormLabel>
                              <FormControl>
                                <Input
                                  {...formField}
                                  type="number"
                                  min="0"
                                  value={formField.value}
                                  onChange={(e) => formField.onChange(parseInt(e.target.value) || 0)}
                                  data-testid={`input-promise-target-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name={`promises.${index}.timeframeUnit`}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>{t('actionPlan.form.labels.timeframe')}</FormLabel>
                          <Select onValueChange={formField.onChange} value={formField.value}>
                            <FormControl>
                              <SelectTrigger data-testid={`select-promise-timeframe-${index}`}>
                                <SelectValue placeholder={t('actionPlan.form.placeholders.selectTimeframe')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="week">{t('shared.timeframes.perWeek')}</SelectItem>
                              <SelectItem value="month">{t('shared.timeframes.perMonth')}</SelectItem>
                              <SelectItem value="year">{t('shared.timeframes.perYear')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`promises.${index}.notes`}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>{t('actionPlan.form.labels.achievementPlan')}</FormLabel>
                          <FormControl>
                            <Textarea
                              {...formField}
                              placeholder={t('actionPlan.form.placeholders.describePlan')}
                              data-testid={`input-promise-notes-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedItemData && form.watch(`promises.${index}.baselineQuantity`) > 0 && (
                      <div className="bg-blue-50 p-3 rounded border border-blue-200">
                        <p className="text-sm font-semibold text-navy">
                          {t('actionPlan.display.reduction')} {Math.max(0, form.watch(`promises.${index}.baselineQuantity`) - form.watch(`promises.${index}.targetQuantity`))} {t('actionPlan.display.items')} {t('actionPlan.display.per')} {t(`shared.timeframes.${form.watch(`promises.${index}.timeframeUnit`)}`)}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {t('actionPlan.display.reductionPercentage', { 
                            percent: Math.round((Math.max(0, form.watch(`promises.${index}.baselineQuantity`) - form.watch(`promises.${index}.targetQuantity`)) / form.watch(`promises.${index}.baselineQuantity`)) * 100)
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}

            <Button
              type="button"
              variant="outline"
              onClick={() => append({
                plasticItemType: "",
                plasticItemLabel: "",
                baselineQuantity: 0,
                targetQuantity: 0,
                timeframeUnit: "month" as const,
                notes: "",
              })}
              data-testid="button-add-promise"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('actionPlan.actions.addPromise')}
            </Button>

            {form.formState.errors.promises?.root && (
              <p className="text-sm text-red-500">{form.formState.errors.promises.root.message}</p>
            )}

            {/* Summary */}
            {fields.length > 0 && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-navy mb-2">{t('actionPlan.display.summaryTitle')}</h4>
                <p className="text-sm text-gray-600 mb-3">
                  {t('actionPlan.display.summaryDescription', { count: fields.length })}
                </p>
                <div className="space-y-2">
                  {fields.map((field, index) => {
                    const promise = form.watch(`promises.${index}`);
                    const reduction = Math.max(0, promise.baselineQuantity - promise.targetQuantity);
                    return promise.plasticItemLabel ? (
                      <div key={field.id} className="text-sm bg-white p-2 rounded">
                        {t('actionPlan.display.summaryItem', { 
                          label: promise.plasticItemLabel, 
                          amount: reduction, 
                          timeframe: t(`shared.timeframes.${promise.timeframeUnit}`)
                        })}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel"
              >
                {t('actionPlan.actions.cancel')}
              </Button>
              <Button
                type="button"
                onClick={() => form.handleSubmit((data) => submitMutation.mutate(data))()}
                disabled={isSubmitting || submitMutation.isPending || availableItems.length === 0}
                data-testid="button-submit-action-plan"
              >
                <Send className="h-4 w-4 mr-1" />
                {isSubmitting ? t('actionPlan.actions.submitting') : t('actionPlan.actions.submit')}
              </Button>
            </div>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
