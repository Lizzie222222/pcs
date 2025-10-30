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
import { ClipboardCheck, Plus, Trash2, Send, CheckCircle, Target, AlertCircle } from "lucide-react";
import type { AuditResponse } from "@shared/schema";

interface ActionPlanProps {
  schoolId: string;
  evidenceRequirementId: string;
  onClose?: () => void;
}

// Schema for individual promise
const promiseSchema = z.object({
  plasticItemType: z.string().min(1, "Please select a plastic item"),
  plasticItemLabel: z.string().min(1, "Item label is required"),
  baselineQuantity: z.number().min(1, "Baseline must be at least 1"),
  targetQuantity: z.number().min(0, "Target cannot be negative"),
  timeframeUnit: z.enum(["week", "month", "year"]),
  notes: z.string().optional(),
});

// Schema for the entire form (at least 2 promises required)
const actionPlanSchema = z.object({
  promises: z.array(promiseSchema).min(2, "At least 2 reduction promises are required"),
});

type ActionPlanData = z.infer<typeof actionPlanSchema>;

export function ActionPlan({ schoolId, evidenceRequirementId, onClose }: ActionPlanProps) {
  const { t } = useTranslation(['audit', 'dashboard']);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    
    // Convert to items array with labels
    const labelMap: Record<string, string> = {
      plastic_bottles: "Plastic Bottles",
      plastic_cups: "Plastic Cups",
      plastic_cutlery: "Plastic Cutlery",
      plastic_straws: "Plastic Straws",
      snack_wrappers: "Snack Wrappers",
      yoghurt_pots: "Yoghurt Pots",
      takeaway_containers: "Takeaway Containers",
      cling_film: "Cling Film",
      pens_pencils: "Pens & Pencils",
      stationery: "Stationery Items",
      display_materials: "Display Materials",
      soap_bottles: "Soap Bottles",
      bin_liners: "Bin Liners",
      cups_dispensers: "Cups/Dispensers",
      period_products: "Period Products",
      sport_equipment: "Sport Equipment",
      toys_equipment: "Toys/Equipment",
      lab_equipment: "Lab Equipment",
      art_supplies: "Art Supplies",
    };
    
    for (const [type, quantity] of Object.entries(itemTotals)) {
      if (quantity > 0) {
        items.push({
          type,
          label: labelMap[type] || type,
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
        throw new Error("At least 2 reduction promises are required");
      }
      
      // Create evidence submission for the action plan
      const evidenceResponse = await apiRequest('POST', '/api/evidence', {
        schoolId,
        title: "Action Plan",
        description: `School action plan with ${validPromises.length} reduction promises`,
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
        title: "Action Plan Submitted!",
        description: `Your action plan with ${data.promisesCount} reduction promise${data.promisesCount !== 1 ? 's' : ''} has been submitted for review.`,
      });
      
      onClose?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Error",
        description: error.message || "There was an error submitting your action plan. Please try again.",
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
            Audit Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">
            You need to complete the Plastic Waste Audit before creating an action plan.
          </p>
          <Button onClick={onClose} data-testid="button-close">
            Close
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
            Audit Approval Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">
            Your Plastic Waste Audit must be approved before you can create an action plan. Current status: <strong>{auditResponse.status}</strong>
          </p>
          <Button onClick={onClose} data-testid="button-close">
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  // If action plan already exists and is approved
  if (actionPlanStatus === 'approved') {
    return (
      <Card className="border-2 border-green-300 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-navy">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Action Plan Approved
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">
            Your action plan has been approved! You can view your reduction promises in the "Our Action Plan" tab.
          </p>
          <Button onClick={onClose} data-testid="button-close">
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  // If action plan already exists and is pending review
  if (actionPlanStatus === 'pending') {
    return (
      <Card className="border-2 border-yellow-300 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-navy">
            <Clock className="h-6 w-6 text-yellow-600" />
            Action Plan Under Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">
            Your action plan has been submitted and is currently under review. You'll be notified once it's been reviewed.
          </p>
          <Button onClick={onClose} data-testid="button-close">
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-teal">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-navy">
          <Target className="h-6 w-6 text-teal" />
          Create Your Action Plan
        </CardTitle>
        <CardDescription>
          Based on your audit results, commit to reducing at least 2 types of plastic. Set realistic targets!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <div className="space-y-6">
            {availableItems.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                <p className="text-sm text-gray-700">
                  No plastic items found in your audit. Please complete the audit with plastic item data first.
                </p>
              </div>
            )}

            {fields.map((field, index) => {
              const selectedItem = form.watch(`promises.${index}.plasticItemType`);
              const selectedItemData = availableItems.find(item => item.type === selectedItem);

              return (
                <Card key={field.id} className="p-4 bg-gray-50 border border-gray-200" data-testid={`card-promise-${index}`}>
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-semibold text-navy">Reduction Promise {index + 1}</h4>
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
                          <FormLabel>Plastic Item Type</FormLabel>
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
                                <SelectValue placeholder="Select a plastic item from your audit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableItems.map((item) => (
                                <SelectItem key={item.type + item.label} value={item.type}>
                                  {item.label} ({item.quantity.toLocaleString()} items/year)
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
                              <FormLabel>Current Annual Usage</FormLabel>
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
                              <FormLabel>Target Annual Usage</FormLabel>
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
                          <FormLabel>Timeframe</FormLabel>
                          <Select onValueChange={formField.onChange} value={formField.value}>
                            <FormControl>
                              <SelectTrigger data-testid={`select-promise-timeframe-${index}`}>
                                <SelectValue placeholder="Select timeframe" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="week">Per Week</SelectItem>
                              <SelectItem value="month">Per Month</SelectItem>
                              <SelectItem value="year">Per Year</SelectItem>
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
                          <FormLabel>How will you achieve this? (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              {...formField}
                              placeholder="Describe your plan to reduce this plastic item..."
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
                          Reduction: {Math.max(0, form.watch(`promises.${index}.baselineQuantity`) - form.watch(`promises.${index}.targetQuantity`))} items per {form.watch(`promises.${index}.timeframeUnit`)}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {Math.round((Math.max(0, form.watch(`promises.${index}.baselineQuantity`) - form.watch(`promises.${index}.targetQuantity`)) / form.watch(`promises.${index}.baselineQuantity`)) * 100)}% reduction
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
              Add Another Promise
            </Button>

            {form.formState.errors.promises?.root && (
              <p className="text-sm text-red-500">{form.formState.errors.promises.root.message}</p>
            )}

            {/* Summary */}
            {fields.length > 0 && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-navy mb-2">Your Promises Summary</h4>
                <p className="text-sm text-gray-600 mb-3">
                  You're committing to reduce {fields.length} types of plastic items:
                </p>
                <div className="space-y-2">
                  {fields.map((field, index) => {
                    const promise = form.watch(`promises.${index}`);
                    const reduction = Math.max(0, promise.baselineQuantity - promise.targetQuantity);
                    return promise.plasticItemLabel ? (
                      <div key={field.id} className="text-sm bg-white p-2 rounded">
                        <span className="font-semibold">{promise.plasticItemLabel}:</span> Reduce by {reduction} items per {promise.timeframeUnit}
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
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => form.handleSubmit((data) => submitMutation.mutate(data))()}
                disabled={isSubmitting || submitMutation.isPending || availableItems.length === 0}
                data-testid="button-submit-action-plan"
              >
                <Send className="h-4 w-4 mr-1" />
                {isSubmitting ? 'Submitting...' : 'Submit Action Plan'}
              </Button>
            </div>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
