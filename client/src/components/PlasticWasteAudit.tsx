import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, ChevronRight, ChevronLeft, Save, Send, CheckCircle, Download, Upload } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { AuditResponse } from "@shared/schema";

interface PlasticWasteAuditProps {
  schoolId: string;
  onClose?: () => void;
}

// Schema factory functions that take t() for i18n support
const createPart1Schema = (t: (key: string) => string) => z.object({
  schoolName: z.string().min(1, t('audit.validation.schoolNameRequired')),
  studentCount: z.string().optional(),
  staffCount: z.string().optional(),
  auditDate: z.string().min(1, t('audit.validation.auditDateRequired')),
  auditTeam: z.string().optional(),
});

const createPart2Schema = () => z.object({
  lunchroomPlasticBottles: z.string().default("0"),
  lunchroomPlasticCups: z.string().default("0"),
  lunchroomPlasticCutlery: z.string().default("0"),
  lunchroomPlasticStraws: z.string().default("0"),
  lunchroomSnackWrappers: z.string().default("0"),
  lunchroomYoghurtPots: z.string().default("0"),
  lunchroomTakeawayContainers: z.string().default("0"),
  lunchroomClingFilm: z.string().default("0"),
  lunchroomOther: z.string().default("0"),
  lunchroomOtherDescription: z.string().optional(),
  staffroomPlasticBottles: z.string().default("0"),
  staffroomPlasticCups: z.string().default("0"),
  staffroomSnackWrappers: z.string().default("0"),
  staffroomYoghurtPots: z.string().default("0"),
  staffroomTakeawayContainers: z.string().default("0"),
  staffroomOther: z.string().default("0"),
  staffroomOtherDescription: z.string().optional(),
  lunchroomNotes: z.string().optional(),
});

const createPart3Schema = (t: (key: string) => string) => z.object({
  // Room selections
  selectedClassrooms: z.boolean().default(false),
  selectedToilets: z.boolean().default(false),
  selectedOffice: z.boolean().default(false),
  selectedLibrary: z.boolean().default(false),
  selectedGym: z.boolean().default(false),
  selectedPlayground: z.boolean().default(false),
  selectedCorridors: z.boolean().default(false),
  selectedScienceLabs: z.boolean().default(false),
  selectedArtRooms: z.boolean().default(false),
  // Classrooms
  classroomPensPencils: z.string().default("0"),
  classroomStationery: z.string().default("0"),
  classroomDisplayMaterials: z.string().default("0"),
  classroomOther: z.string().default("0"),
  classroomOtherDescription: z.string().optional(),
  // Toilets
  toiletSoapBottles: z.string().default("0"),
  toiletBinLiners: z.string().default("0"),
  toiletCupsPaper: z.string().default("0"),
  toiletPeriodProducts: z.string().default("0"),
  toiletOther: z.string().default("0"),
  toiletOtherDescription: z.string().optional(),
  // Office
  officePlasticBottles: z.string().default("0"),
  officePlasticCups: z.string().default("0"),
  officeStationery: z.string().default("0"),
  officeOther: z.string().default("0"),
  officeOtherDescription: z.string().optional(),
  // Library
  libraryPlasticBottles: z.string().default("0"),
  libraryStationery: z.string().default("0"),
  libraryDisplayMaterials: z.string().default("0"),
  libraryOther: z.string().default("0"),
  libraryOtherDescription: z.string().optional(),
  // Gym
  gymPlasticBottles: z.string().default("0"),
  gymSportEquipment: z.string().default("0"),
  gymOther: z.string().default("0"),
  gymOtherDescription: z.string().optional(),
  // Playground
  playgroundPlasticBottles: z.string().default("0"),
  playgroundToysEquipment: z.string().default("0"),
  playgroundOther: z.string().default("0"),
  playgroundOtherDescription: z.string().optional(),
  // Corridors
  corridorsPlasticBottles: z.string().default("0"),
  corridorsDisplayMaterials: z.string().default("0"),
  corridorsBinLiners: z.string().default("0"),
  corridorsOther: z.string().default("0"),
  corridorsOtherDescription: z.string().optional(),
  // Science Labs
  scienceLabsPlasticBottles: z.string().default("0"),
  scienceLabsLabEquipment: z.string().default("0"),
  scienceLabsOther: z.string().default("0"),
  scienceLabsOtherDescription: z.string().optional(),
  // Art Rooms
  artRoomsPlasticBottles: z.string().default("0"),
  artRoomsArtSupplies: z.string().default("0"),
  artRoomsOther: z.string().default("0"),
  artRoomsOtherDescription: z.string().optional(),
  classroomNotes: z.string().optional(),
}).refine(
  (data) => data.selectedClassrooms || data.selectedToilets || data.selectedOffice || 
           data.selectedLibrary || data.selectedGym || data.selectedPlayground || 
           data.selectedCorridors || data.selectedScienceLabs || data.selectedArtRooms,
  { message: t('audit.validation.roomSelectionRequired'), path: ["selectedClassrooms"] }
);

const createPart4Schema = (t: (key: string) => string) => z.object({
  hasRecyclingBins: z.boolean().default(false),
  recyclingBinLocations: z.string().optional(),
  plasticWasteDestination: z.string().min(1, t('audit.validation.wasteDestinationRequired')),
  compostsOrganicWaste: z.boolean().default(false),
  hasPlasticReductionPolicy: z.boolean().default(false),
  reductionPolicyDetails: z.string().optional(),
  wasteManagementNotes: z.string().optional(),
});

type Part1Data = z.infer<ReturnType<typeof createPart1Schema>>;
type Part2Data = z.infer<ReturnType<typeof createPart2Schema>>;
type Part3Data = z.infer<ReturnType<typeof createPart3Schema>>;
type Part4Data = z.infer<ReturnType<typeof createPart4Schema>>;

export function PlasticWasteAudit({ schoolId, onClose }: PlasticWasteAuditProps) {
  const { t } = useTranslation('audit');
  const [currentStep, setCurrentStep] = useState(1);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const hasLoadedInitialData = useRef(false);

  // Fetch existing audit if any
  const { data: existingAudit } = useQuery<AuditResponse>({
    queryKey: [`/api/audits/school/${schoolId}`],
    enabled: !!schoolId,
  });

  // Fetch school data for pre-population
  const { data: schoolData } = useQuery<{ id: string; name: string; studentCount: number | null }>({
    queryKey: [`/api/schools/${schoolId}`],
    enabled: !!schoolId,
  });

  // Forms for each part
  const form1 = useForm<Part1Data>({
    resolver: zodResolver(createPart1Schema(t)),
    defaultValues: {
      schoolName: "",
      studentCount: "",
      staffCount: "",
      auditDate: new Date().toISOString().split('T')[0],
      auditTeam: "",
    },
  });

  const form2 = useForm<Part2Data>({
    resolver: zodResolver(createPart2Schema()),
    defaultValues: {
      lunchroomPlasticBottles: "0",
      lunchroomPlasticCups: "0",
      lunchroomPlasticCutlery: "0",
      lunchroomPlasticStraws: "0",
      lunchroomSnackWrappers: "0",
      lunchroomYoghurtPots: "0",
      lunchroomTakeawayContainers: "0",
      lunchroomClingFilm: "0",
      lunchroomOther: "0",
      lunchroomOtherDescription: "",
      staffroomPlasticBottles: "0",
      staffroomPlasticCups: "0",
      staffroomSnackWrappers: "0",
      staffroomYoghurtPots: "0",
      staffroomTakeawayContainers: "0",
      staffroomOther: "0",
      staffroomOtherDescription: "",
      lunchroomNotes: "",
    },
  });

  const form3 = useForm<Part3Data>({
    resolver: zodResolver(createPart3Schema(t)),
    defaultValues: {
      selectedClassrooms: false,
      selectedToilets: false,
      selectedOffice: false,
      selectedLibrary: false,
      selectedGym: false,
      selectedPlayground: false,
      selectedCorridors: false,
      selectedScienceLabs: false,
      selectedArtRooms: false,
      classroomPensPencils: "0",
      classroomStationery: "0",
      classroomDisplayMaterials: "0",
      classroomOther: "0",
      classroomOtherDescription: "",
      toiletSoapBottles: "0",
      toiletBinLiners: "0",
      toiletCupsPaper: "0",
      toiletPeriodProducts: "0",
      toiletOther: "0",
      toiletOtherDescription: "",
      officePlasticBottles: "0",
      officePlasticCups: "0",
      officeStationery: "0",
      officeOther: "0",
      officeOtherDescription: "",
      libraryPlasticBottles: "0",
      libraryStationery: "0",
      libraryDisplayMaterials: "0",
      libraryOther: "0",
      libraryOtherDescription: "",
      gymPlasticBottles: "0",
      gymSportEquipment: "0",
      gymOther: "0",
      gymOtherDescription: "",
      playgroundPlasticBottles: "0",
      playgroundToysEquipment: "0",
      playgroundOther: "0",
      playgroundOtherDescription: "",
      corridorsPlasticBottles: "0",
      corridorsDisplayMaterials: "0",
      corridorsBinLiners: "0",
      corridorsOther: "0",
      corridorsOtherDescription: "",
      scienceLabsPlasticBottles: "0",
      scienceLabsLabEquipment: "0",
      scienceLabsOther: "0",
      scienceLabsOtherDescription: "",
      artRoomsPlasticBottles: "0",
      artRoomsArtSupplies: "0",
      artRoomsOther: "0",
      artRoomsOtherDescription: "",
      classroomNotes: "",
    },
  });

  const form4 = useForm<Part4Data>({
    resolver: zodResolver(createPart4Schema(t)),
    defaultValues: {
      hasRecyclingBins: false,
      recyclingBinLocations: "",
      plasticWasteDestination: "",
      compostsOrganicWaste: false,
      hasPlasticReductionPolicy: false,
      reductionPolicyDetails: "",
      wasteManagementNotes: "",
    },
  });

  // Upload state and refs
  const [isUploading, setIsUploading] = useState(false);
  const auditFileInputRef = useRef<HTMLInputElement>(null);

  // Upload mutations
  const uploadMutation = useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      // Validate file
      if (file.type !== 'application/pdf') {
        throw new Error(t('audit.overview.uploadFileTypeError'));
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        throw new Error(t('audit.overview.uploadFileSizeError'));
      }

      // Get signed URL
      const response = await apiRequest('POST', '/api/uploads/printable-forms/signed-url', { formType: 'audit', filename: file.name, fileSize: file.size });
      const { uploadUrl, objectPath } = await response.json() as { uploadUrl: string; objectPath: string };

      // Upload to GCS
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': 'application/pdf',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(t('audit.overview.uploadStorageError'));
      }

      // Create submission record
      const submissionResponse = await apiRequest('POST', '/api/printable-form-submissions', {
        schoolId,
        formType: 'audit',
        objectPath,
        filename: file.name,
      });

      return await submissionResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/printable-form-submissions/school/${schoolId}`] });
      toast({
        title: t('audit.overview.uploadSuccessTitle'),
        description: t('audit.overview.uploadSuccessDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('audit.overview.uploadFailedTitle'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async () => {
    const inputRef = auditFileInputRef;
    const file = inputRef.current?.files?.[0];
    
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync({ file });
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  // Helper function to check if a room has any data
  const hasRoomData = (data: any, fields: string[]) => {
    return fields.some(field => {
      const value = data[field];
      return value !== undefined && value !== null && value !== "";
    });
  };

  // Load existing audit data or pre-populate from school data
  useEffect(() => {
    if (existingAudit && !hasLoadedInitialData.current) {
      setAuditId(existingAudit.id);
      setCurrentStep(existingAudit.currentPart || 1);
      
      if (existingAudit.part1Data) {
        form1.reset(existingAudit.part1Data);
      }
      if (existingAudit.part2Data) {
        form2.reset(existingAudit.part2Data);
      }
      if (existingAudit.part3Data) {
        // Infer room selections from existing data for backward compatibility
        const part3Data = existingAudit.part3Data as any;
        const inferredSelections = {
          selectedClassrooms: hasRoomData(part3Data, ['classroomPensPencils', 'classroomStationery', 'classroomDisplayMaterials', 'classroomOther']),
          selectedToilets: hasRoomData(part3Data, ['toiletSoapBottles', 'toiletBinLiners', 'toiletCupsPaper', 'toiletPeriodProducts', 'toiletOther']),
          selectedOffice: hasRoomData(part3Data, ['officePlasticBottles', 'officePlasticCups', 'officeStationery', 'officeOther']),
          selectedLibrary: hasRoomData(part3Data, ['libraryPlasticBottles', 'libraryStationery', 'libraryDisplayMaterials', 'libraryOther']),
          selectedGym: hasRoomData(part3Data, ['gymPlasticBottles', 'gymSportEquipment', 'gymOther']),
          selectedPlayground: hasRoomData(part3Data, ['playgroundPlasticBottles', 'playgroundToysEquipment', 'playgroundOther']),
          selectedCorridors: hasRoomData(part3Data, ['corridorsPlasticBottles', 'corridorsDisplayMaterials', 'corridorsBinLiners', 'corridorsOther']),
          selectedScienceLabs: hasRoomData(part3Data, ['scienceLabsPlasticBottles', 'scienceLabsLabEquipment', 'scienceLabsOther']),
          selectedArtRooms: hasRoomData(part3Data, ['artRoomsPlasticBottles', 'artRoomsArtSupplies', 'artRoomsOther']),
        };
        
        const mergedData = {
          ...part3Data,
          selectedClassrooms: part3Data.selectedClassrooms ?? inferredSelections.selectedClassrooms,
          selectedToilets: part3Data.selectedToilets ?? inferredSelections.selectedToilets,
          selectedOffice: part3Data.selectedOffice ?? inferredSelections.selectedOffice,
          selectedLibrary: part3Data.selectedLibrary ?? inferredSelections.selectedLibrary,
          selectedGym: part3Data.selectedGym ?? inferredSelections.selectedGym,
          selectedPlayground: part3Data.selectedPlayground ?? inferredSelections.selectedPlayground,
          selectedCorridors: part3Data.selectedCorridors ?? inferredSelections.selectedCorridors,
          selectedScienceLabs: part3Data.selectedScienceLabs ?? inferredSelections.selectedScienceLabs,
          selectedArtRooms: part3Data.selectedArtRooms ?? inferredSelections.selectedArtRooms,
        };
        
        form3.reset(mergedData);
      }
      if (existingAudit.part4Data) {
        form4.reset(existingAudit.part4Data);
      }
      hasLoadedInitialData.current = true;
    } else if (!existingAudit && schoolData && !hasLoadedInitialData.current) {
      // Pre-populate form with school data if no existing audit
      form1.reset({
        schoolName: schoolData.name,
        studentCount: schoolData.studentCount !== null ? String(schoolData.studentCount) : "",
        staffCount: "",
        auditDate: new Date().toISOString().split('T')[0],
        auditTeam: "",
      });
      hasLoadedInitialData.current = true;
    }
  }, [existingAudit, schoolData]);

  // Auto-save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/audits', data);
      return res.json() as Promise<AuditResponse>;
    },
    onSuccess: (data) => {
      if (!auditId && data) {
        setAuditId(data.id);
      }
      queryClient.invalidateQueries({ queryKey: [`/api/audits/school/${schoolId}`] });
      toast({
        title: t('audit.status.progressSaved'),
        description: t('audit.status.progressSavedDescription'),
      });
    },
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('POST', `/api/audits/${id}/submit`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/audits/school/${schoolId}`] });
      toast({
        title: t('audit.status.auditSubmitted'),
        description: t('audit.status.auditSubmittedDescription'),
      });
      onClose?.();
    },
  });

  // Calculate results (multiplied by 190 for annual figures)
  const calculateResults = () => {
    const part2Values = form2.getValues();
    const part3Values = form3.getValues();

    // Calculate daily counts first, then multiply by 190 for annual
    const dailyPlasticCounts: Record<string, number> = {
      [t('audit.plasticItems.plastic_bottles')]: 
        parseInt(part2Values.lunchroomPlasticBottles || "0") + 
        parseInt(part2Values.staffroomPlasticBottles || "0") +
        parseInt(part3Values.officePlasticBottles || "0") +
        parseInt(part3Values.libraryPlasticBottles || "0") +
        parseInt(part3Values.gymPlasticBottles || "0") +
        parseInt(part3Values.playgroundPlasticBottles || "0") +
        parseInt(part3Values.corridorsPlasticBottles || "0") +
        parseInt(part3Values.scienceLabsPlasticBottles || "0") +
        parseInt(part3Values.artRoomsPlasticBottles || "0"),
      [t('audit.plasticItems.plastic_cups')]: 
        parseInt(part2Values.lunchroomPlasticCups || "0") + 
        parseInt(part2Values.staffroomPlasticCups || "0") +
        parseInt(part3Values.officePlasticCups || "0"),
      [t('audit.plasticItems.plastic_cutlery')]: parseInt(part2Values.lunchroomPlasticCutlery || "0"),
      [t('audit.plasticItems.plastic_straws')]: parseInt(part2Values.lunchroomPlasticStraws || "0"),
      [t('audit.plasticItems.snack_wrappers')]: 
        parseInt(part2Values.lunchroomSnackWrappers || "0") + 
        parseInt(part2Values.staffroomSnackWrappers || "0"),
      [t('audit.plasticItems.yoghurt_pots')]: 
        parseInt(part2Values.lunchroomYoghurtPots || "0") + 
        parseInt(part2Values.staffroomYoghurtPots || "0"),
      [t('audit.plasticItems.takeaway_containers')]: 
        parseInt(part2Values.lunchroomTakeawayContainers || "0") + 
        parseInt(part2Values.staffroomTakeawayContainers || "0"),
      [t('audit.plasticItems.cling_film')]: parseInt(part2Values.lunchroomClingFilm || "0"),
      [t('audit.plasticItems.pens_pencils')]: parseInt(part3Values.classroomPensPencils || "0"),
      [t('audit.plasticItems.stationery')]: 
        parseInt(part3Values.classroomStationery || "0") +
        parseInt(part3Values.officeStationery || "0") +
        parseInt(part3Values.libraryStationery || "0"),
      [t('audit.plasticItems.display_materials')]: 
        parseInt(part3Values.classroomDisplayMaterials || "0") +
        parseInt(part3Values.libraryDisplayMaterials || "0") +
        parseInt(part3Values.corridorsDisplayMaterials || "0"),
      [t('audit.plasticItems.soap_bottles')]: parseInt(part3Values.toiletSoapBottles || "0"),
      [t('audit.plasticItems.bin_liners')]: 
        parseInt(part3Values.toiletBinLiners || "0") +
        parseInt(part3Values.corridorsBinLiners || "0"),
      [t('audit.plasticItems.toilet_cups_dispensers')]: parseInt(part3Values.toiletCupsPaper || "0"),
      [t('audit.plasticItems.period_products')]: parseInt(part3Values.toiletPeriodProducts || "0"),
      [t('audit.plasticItems.sport_equipment')]: parseInt(part3Values.gymSportEquipment || "0"),
      [t('audit.plasticItems.toys_equipment')]: parseInt(part3Values.playgroundToysEquipment || "0"),
      [t('audit.plasticItems.lab_equipment')]: parseInt(part3Values.scienceLabsLabEquipment || "0"),
      [t('audit.plasticItems.art_supplies')]: parseInt(part3Values.artRoomsArtSupplies || "0"),
    };

    // Group all "Other" items together
    const otherTotal = 
      parseInt(part2Values.lunchroomOther || "0") +
      parseInt(part2Values.staffroomOther || "0") +
      parseInt(part3Values.classroomOther || "0") +
      parseInt(part3Values.toiletOther || "0") +
      parseInt(part3Values.officeOther || "0") +
      parseInt(part3Values.libraryOther || "0") +
      parseInt(part3Values.gymOther || "0") +
      parseInt(part3Values.playgroundOther || "0") +
      parseInt(part3Values.corridorsOther || "0") +
      parseInt(part3Values.scienceLabsOther || "0") +
      parseInt(part3Values.artRoomsOther || "0");

    if (otherTotal > 0) {
      dailyPlasticCounts[t('audit.plasticItems.other_plastic_items')] = otherTotal;
    }

    // Multiply all counts by 190 for annual figures
    const annualPlasticCounts: Record<string, number> = {};
    for (const [key, value] of Object.entries(dailyPlasticCounts)) {
      annualPlasticCounts[key] = value * 190;
    }

    const total = Object.values(annualPlasticCounts).reduce((sum, count) => sum + count, 0);
    const topItems = Object.entries(annualPlasticCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .filter(([, count]) => count > 0);

    return {
      totalPlasticItems: total,
      topProblemPlastics: topItems.map(([name, count]) => ({ name, count })),
      plasticCounts: annualPlasticCounts,
    };
  };

  // Save progress
  const handleSaveProgress = async () => {
    const currentForm = getCurrentForm();
    const isValid = await currentForm.trigger();
    
    if (!isValid) return;

    const results = calculateResults();
    
    const auditData = {
      schoolId,
      currentPart: currentStep,
      status: 'draft',
      part1Data: form1.getValues(),
      part2Data: form2.getValues(),
      part3Data: form3.getValues(),
      part4Data: form4.getValues(),
      resultsData: results,
      totalPlasticItems: results.totalPlasticItems,
      topProblemPlastics: results.topProblemPlastics,
    };

    saveMutation.mutate(auditData);
  };

  // Next step
  const handleNext = async () => {
    // Skip validation for step 5 (results view)
    if (currentStep !== 5) {
      const currentForm = getCurrentForm();
      const isValid = await currentForm.trigger();
      
      if (!isValid) {
        toast({
          title: t('audit.validation.validationError'),
          description: t('audit.validation.fillRequiredFields'),
          variant: "destructive",
        });
        return;
      }
    }

    await handleSaveProgress();
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Previous step
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Get current form based on step
  const getCurrentForm = () => {
    switch (currentStep) {
      case 1: return form1;
      case 2: return form2;
      case 3: return form3;
      case 4: return form4;
      default: return form1;
    }
  };

  // Handle final submission
  const handleSubmitAuditOnly = async () => {
    // Validate all forms before submission
    const isForm1Valid = await form1.trigger();
    const isForm2Valid = await form2.trigger();
    const isForm3Valid = await form3.trigger();
    const isForm4Valid = await form4.trigger();

    if (!isForm1Valid || !isForm2Valid || !isForm3Valid || !isForm4Valid) {
      toast({
        title: t('audit.validation.validationError'),
        description: t('audit.validation.fillRequiredFields'),
        variant: "destructive",
      });
      return;
    }

    // Save first if no audit ID exists
    if (!auditId) {
      const results = calculateResults();
      const auditData = {
        schoolId,
        currentPart: 5,
        status: 'pending',
        part1Data: form1.getValues(),
        part2Data: form2.getValues(),
        part3Data: form3.getValues(),
        part4Data: form4.getValues(),
        resultsData: results,
        totalPlasticItems: results.totalPlasticItems,
        topProblemPlastics: results.topProblemPlastics,
      };

      setIsSubmitting(true);
      try {
        const res = await apiRequest('POST', '/api/audits', auditData);
        const data = await res.json() as AuditResponse;
        setAuditId(data.id);
        await submitMutation.mutateAsync(data.id);
      } catch (error) {
        toast({
          title: t('audit.validation.validationError'),
          description: String(error),
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setIsSubmitting(true);
      try {
        await submitMutation.mutateAsync(auditId);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Download PDF handler
  const handleDownloadPDF = () => {
    window.open(`/api/audits/${auditId}/pdf`, '_blank');
  };

  // Calculate progress
  const progress = (currentStep / 5) * 100;

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ClipboardCheck className="h-6 w-6 text-primary" />
              {t('audit.overview.title')}
            </CardTitle>
            <CardDescription className="mt-2">
              {t('audit.overview.description')}
            </CardDescription>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">
              {t('audit.form.step' + currentStep + '.title')}
            </span>
            <span className="text-sm text-gray-500">
              {currentStep}/5
            </span>
          </div>
          <Progress value={progress} className="h-2" data-testid="progress-bar" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Step 1: General Information */}
        {currentStep === 1 && (
          <Form {...form1}>
            <div className="space-y-4">
              <FormField
                control={form1.control}
                name="schoolName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('audit.form.metadata.schoolName')}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-school-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form1.control}
                name="studentCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('audit.form.metadata.studentCount')}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-student-count" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form1.control}
                name="staffCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('audit.form.metadata.staffCount')}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-staff-count" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form1.control}
                name="auditDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('audit.form.metadata.auditDate')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-audit-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form1.control}
                name="auditTeam"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('audit.form.metadata.teamMembers')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder={t('audit.form.metadata.teamMembersPlaceholder')}
                        data-testid="input-audit-team"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
        )}

        {/* Step 2: Lunchroom & Staffroom */}
        {currentStep === 2 && (
          <Form {...form2}>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">{t('audit.form.step2.lunchroom')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form2.control}
                    name="lunchroomPlasticBottles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.plasticBottles')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-lunchroom-bottles" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form2.control}
                    name="lunchroomPlasticCups"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.plasticCups')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-lunchroom-cups" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form2.control}
                    name="lunchroomPlasticCutlery"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.plasticCutlery')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-lunchroom-cutlery" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form2.control}
                    name="lunchroomPlasticStraws"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.plasticStraws')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-lunchroom-straws" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form2.control}
                    name="lunchroomSnackWrappers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.snackWrappers')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-lunchroom-snack-wrappers" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form2.control}
                    name="lunchroomYoghurtPots"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.yoghurtPots')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-lunchroom-yoghurt-pots" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form2.control}
                    name="lunchroomTakeawayContainers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.takeawayContainers')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-lunchroom-takeaway-containers" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form2.control}
                    name="lunchroomClingFilm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.clingFilm')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-lunchroom-clingfilm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form2.control}
                    name="lunchroomOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.otherItems')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-lunchroom-other" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form2.control}
                  name="lunchroomOtherDescription"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>{t('audit.form.step2.otherDescription')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder={t('audit.form.step2.lunchroomOtherPlaceholder')}
                          data-testid="input-lunchroom-other-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">{t('audit.form.step2.staffroom')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form2.control}
                    name="staffroomPlasticBottles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.plasticBottles')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-staffroom-bottles" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form2.control}
                    name="staffroomPlasticCups"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.plasticCups')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-staffroom-cups" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form2.control}
                    name="staffroomSnackWrappers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.snackWrappers')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-staffroom-snack-wrappers" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form2.control}
                    name="staffroomYoghurtPots"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.yoghurtPots')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-staffroom-yoghurt-pots" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form2.control}
                    name="staffroomTakeawayContainers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.takeawayContainers')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-staffroom-takeaway-containers" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form2.control}
                    name="staffroomOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.otherItems')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-staffroom-other" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form2.control}
                  name="staffroomOtherDescription"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>{t('audit.form.step2.otherDescription')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder={t('audit.form.step2.staffroomOtherPlaceholder')}
                          data-testid="input-staffroom-other-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form2.control}
                name="lunchroomNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('audit.form.step2.additionalNotes')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder={t('audit.form.step2.notesPlaceholder')}
                        data-testid="input-lunchroom-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
        )}

        {/* Step 3: All Rooms */}
        {currentStep === 3 && (
          <Form {...form3}>
            <div className="space-y-6">
              {/* Room Selection Section */}
              <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-lg border-2 border-blue-200">
                <h3 className="font-bold text-lg text-navy mb-2">
                  {t('audit.form.step3.roomSelectionTitle')}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t('audit.form.step3.roomSelectionDescription')}
                </p>
                
                {/* Academic Rooms */}
                <div className="mb-4">
                  <h4 className="font-semibold text-sm text-gray-700 mb-2 uppercase tracking-wide">{t('audit.form.step3.academicSpaces')}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <FormField
                      control={form3.control}
                      name="selectedClassrooms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 bg-white hover:bg-blue-50 transition-colors">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-select-classrooms"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-medium cursor-pointer">
                              {t('audit.form.step3.classrooms')}
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form3.control}
                      name="selectedLibrary"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 bg-white hover:bg-blue-50 transition-colors">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-select-library"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-medium cursor-pointer">
                              {t('audit.form.step3.library')}
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form3.control}
                      name="selectedScienceLabs"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 bg-white hover:bg-blue-50 transition-colors">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-select-science-labs"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-medium cursor-pointer">
                              {t('audit.form.step3.scienceLabs')}
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form3.control}
                      name="selectedArtRooms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 bg-white hover:bg-blue-50 transition-colors">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-select-art-rooms"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-medium cursor-pointer">
                              {t('audit.form.step3.artRooms')}
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Common Areas */}
                <div className="mb-4">
                  <h4 className="font-semibold text-sm text-gray-700 mb-2 uppercase tracking-wide">{t('audit.form.step3.commonAreas')}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <FormField
                      control={form3.control}
                      name="selectedToilets"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 bg-white hover:bg-blue-50 transition-colors">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-select-toilets"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-medium cursor-pointer">
                              {t('audit.form.step3.toilets')}
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form3.control}
                      name="selectedOffice"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 bg-white hover:bg-blue-50 transition-colors">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-select-office"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-medium cursor-pointer">
                              {t('audit.form.step3.office')}
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form3.control}
                      name="selectedCorridors"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 bg-white hover:bg-blue-50 transition-colors">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-select-corridors"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-medium cursor-pointer">
                              {t('audit.form.step3.corridors')}
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Outdoor & Sports */}
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2 uppercase tracking-wide">{t('audit.form.step3.outdoorSports')}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form3.control}
                      name="selectedGym"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 bg-white hover:bg-blue-50 transition-colors">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-select-gym"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-medium cursor-pointer">
                              {t('audit.form.step3.gym')}
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form3.control}
                      name="selectedPlayground"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 bg-white hover:bg-blue-50 transition-colors">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-select-playground"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-medium cursor-pointer">
                              {t('audit.form.step3.playground')}
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Validation message */}
                {form3.formState.errors.selectedClassrooms && (
                  <p className="text-sm text-red-600 mt-3" data-testid="text-room-selection-error">
                    {form3.formState.errors.selectedClassrooms.message}
                  </p>
                )}
              </div>

              {/* Classrooms */}
              {form3.watch("selectedClassrooms") && (
              <div>
                <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">{t('audit.rooms.classrooms')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form3.control}
                    name="classroomPensPencils"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.pensPencils')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-classroom-pens" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="classroomStationery"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.stationery')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-classroom-stationery" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="classroomDisplayMaterials"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.displayMaterials')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-classroom-display" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="classroomOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.otherItems')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-classroom-other" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form3.control}
                  name="classroomOtherDescription"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>{t('audit.form.step3.otherDescription')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder={t('audit.form.step3.classroomOtherPlaceholder')}
                          data-testid="input-classroom-other-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              )}

              {/* Toilets */}
              {form3.watch("selectedToilets") && (
              <div>
                <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">{t('audit.rooms.toilets')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form3.control}
                    name="toiletSoapBottles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.soapBottles')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-toilet-soap" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="toiletBinLiners"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.binLiners')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-toilet-bins" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="toiletCupsPaper"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.cupsDispensers')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-toilet-cups" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="toiletPeriodProducts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.periodProducts')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-toilet-period-products" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="toiletOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.otherItems')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-toilet-other" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form3.control}
                  name="toiletOtherDescription"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>{t('audit.form.step3.otherDescription')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder={t('audit.form.step3.toiletOtherPlaceholder')}
                          data-testid="input-toilet-other-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              )}

              {/* Office */}
              {form3.watch("selectedOffice") && (
              <div>
                <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">{t('audit.rooms.office')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form3.control}
                    name="officePlasticBottles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.plasticBottles')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-office-bottles" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="officePlasticCups"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.plasticCups')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-office-cups" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="officeStationery"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.stationery')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-office-stationery" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="officeOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.otherItems')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-office-other" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form3.control}
                  name="officeOtherDescription"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>{t('audit.form.step3.otherDescription')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder={t('audit.form.step3.officeOtherPlaceholder')}
                          data-testid="input-office-other-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              )}

              {/* Library */}
              {form3.watch("selectedLibrary") && (
              <div>
                <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">{t('audit.rooms.library')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form3.control}
                    name="libraryPlasticBottles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.plasticBottles')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-library-bottles" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="libraryStationery"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.stationery')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-library-stationery" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="libraryDisplayMaterials"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.displayMaterials')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-library-display" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="libraryOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.otherItems')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-library-other" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form3.control}
                  name="libraryOtherDescription"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>{t('audit.form.step3.otherDescription')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder={t('audit.form.step3.libraryOtherPlaceholder')}
                          data-testid="input-library-other-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              )}

              {/* Gym */}
              {form3.watch("selectedGym") && (
              <div>
                <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">{t('audit.rooms.gym')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form3.control}
                    name="gymPlasticBottles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.plasticBottles')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-gym-bottles" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="gymSportEquipment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.sportEquipment')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-gym-equipment" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="gymOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.otherItems')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-gym-other" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form3.control}
                  name="gymOtherDescription"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>{t('audit.form.step3.otherDescription')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder={t('audit.form.step3.gymOtherPlaceholder')}
                          data-testid="input-gym-other-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              )}

              {/* Playground */}
              {form3.watch("selectedPlayground") && (
              <div>
                <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">{t('audit.rooms.playground')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form3.control}
                    name="playgroundPlasticBottles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.plasticBottles')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-playground-bottles" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="playgroundToysEquipment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.toysEquipment')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-playground-toys" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="playgroundOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.otherItems')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-playground-other" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form3.control}
                  name="playgroundOtherDescription"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>{t('audit.form.step3.otherDescription')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder={t('audit.form.step3.playgroundOtherPlaceholder')}
                          data-testid="input-playground-other-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              )}

              {/* Corridors */}
              {form3.watch("selectedCorridors") && (
              <div>
                <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">{t('audit.rooms.corridors')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form3.control}
                    name="corridorsPlasticBottles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.plasticBottles')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-corridors-bottles" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="corridorsDisplayMaterials"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.displayMaterials')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-corridors-display" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="corridorsBinLiners"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.binLiners')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-corridors-bins" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="corridorsOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.otherItems')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-corridors-other" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form3.control}
                  name="corridorsOtherDescription"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>{t('audit.form.step3.otherDescription')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder={t('audit.form.step3.corridorsOtherPlaceholder')}
                          data-testid="input-corridors-other-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              )}

              {/* Science Labs */}
              {form3.watch("selectedScienceLabs") && (
              <div>
                <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">{t('audit.rooms.science_labs')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form3.control}
                    name="scienceLabsPlasticBottles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.plasticBottles')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-science-labs-bottles" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="scienceLabsLabEquipment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.labEquipment')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-science-labs-equipment" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="scienceLabsOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.otherItems')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-science-labs-other" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form3.control}
                  name="scienceLabsOtherDescription"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>{t('audit.form.step3.otherDescription')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder={t('audit.form.step3.scienceLabsOtherPlaceholder')}
                          data-testid="input-science-labs-other-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              )}

              {/* Art Rooms */}
              {form3.watch("selectedArtRooms") && (
              <div>
                <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">{t('audit.rooms.art_rooms')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form3.control}
                    name="artRoomsPlasticBottles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step2.plasticBottles')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-art-rooms-bottles" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="artRoomsArtSupplies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.artSupplies')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-art-rooms-supplies" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form3.control}
                    name="artRoomsOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('audit.form.step3.otherItems')}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-art-rooms-other" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form3.control}
                  name="artRoomsOtherDescription"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>{t('audit.form.step3.otherDescription')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder={t('audit.form.step3.artRoomsOtherPlaceholder')}
                          data-testid="input-art-rooms-other-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              )}

              <FormField
                control={form3.control}
                name="classroomNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('audit.form.step3.additionalNotes')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder={t('audit.form.step3.notesPlaceholder')}
                        data-testid="input-classroom-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
        )}

        {/* Step 4: Waste Management */}
        {currentStep === 4 && (
          <Form {...form4}>
            <div className="space-y-6">
              <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">{t('audit.form.step4.title')}</h3>
              
              <FormField
                control={form4.control}
                name="hasRecyclingBins"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-recycling-bins"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t('audit.form.step4.hasRecyclingBins')}</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form4.control}
                name="recyclingBinLocations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('audit.form.step4.recyclingBinLocations')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('audit.form.step4.recyclingBinLocationsPlaceholder')} data-testid="input-bin-locations" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form4.control}
                name="plasticWasteDestination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('audit.form.step4.plasticWasteDestination')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-waste-destination">
                          <SelectValue placeholder={t('audit.form.step4.selectDestination')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general-waste">{t('audit.form.step4.wasteGeneral')}</SelectItem>
                        <SelectItem value="recycling-center">{t('audit.form.step4.wasteRecycling')}</SelectItem>
                        <SelectItem value="mixed">{t('audit.form.step4.wasteMixed')}</SelectItem>
                        <SelectItem value="unknown">{t('audit.form.step4.wasteUnknown')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form4.control}
                name="compostsOrganicWaste"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-composting"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t('audit.form.step4.compostsOrganicWaste')}</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form4.control}
                name="hasPlasticReductionPolicy"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-reduction-policy"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t('audit.form.step4.hasPlasticReductionPolicy')}</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form4.control}
                name="reductionPolicyDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('audit.form.step4.reductionPolicyDetails')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder={t('audit.form.step4.reductionPolicyPlaceholder')}
                        data-testid="input-policy-details"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form4.control}
                name="wasteManagementNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('audit.form.step4.wasteManagementNotes')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder={t('audit.form.step4.wasteManagementNotesPlaceholder')}
                        data-testid="input-waste-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
        )}

        {/* Step 5: Audit Results */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-lg border-2 border-blue-300 shadow-lg">
              <h3 className="font-bold text-2xl text-navy mb-4 flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                {t('audit.form.step5.title')}
              </h3>
              <p className="text-gray-700 mb-4">
                {t('audit.form.step5.description')}
              </p>
              
              <div className="bg-white p-5 rounded-lg shadow-md mb-6">
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-600 uppercase tracking-wide font-semibold">{t('audit.form.step5.totalAnnualTitle')}</p>
                  <p className="text-5xl font-bold text-blue-600 my-2" data-testid="text-total-plastic-items">
                    {calculateResults().totalPlasticItems.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">{t('audit.form.step5.itemsPerYear')}</p>
                </div>

                {calculateResults().topProblemPlastics.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-gray-800 mb-3 text-center">{t('audit.form.step5.topProblemsTitle')}</h4>
                    <div className="h-64 mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={calculateResults().topProblemPlastics.map((item, idx) => ({
                              name: item.name,
                              value: item.count,
                            }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {calculateResults().topProblemPlastics.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8B5CF6'][index % 5]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => value.toLocaleString()} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {calculateResults().topProblemPlastics.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded" data-testid={`result-item-${idx}`}>
                          <span className="text-sm font-medium text-gray-700">{item.name}</span>
                          <span className="text-sm font-bold text-blue-600">{item.count.toLocaleString()}{t('audit.form.step5.yearSuffix')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
                <p className="text-sm text-gray-700">
                  <strong>{t('audit.form.step5.readyToSubmitTitle')}</strong> {t('audit.form.step5.readyToSubmitDescription')}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex gap-3 flex-col sm:flex-row">
                  <Button
                    onClick={handleDownloadPDF}
                    variant="outline"
                    className="flex-1 border-purple-600 text-purple-600 hover:bg-purple-50"
                    data-testid="button-download-results-pdf"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t('audit.actions.downloadPdf')}
                  </Button>
                  <Button
                    onClick={handleSubmitAuditOnly}
                    disabled={isSubmitting}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    data-testid="button-submit-audit-now"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? t('audit.actions.submitting') : t('audit.actions.submitAudit')}
                  </Button>
                </div>
                <div>
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    data-testid="button-back-step-5"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t('audit.actions.backToWasteManagement')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        {currentStep !== 5 && (
          <div className="flex justify-between pt-4 border-t">
            <div>
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  data-testid="button-previous"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t('audit.actions.previous')}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSaveProgress}
                disabled={saveMutation.isPending}
                data-testid="button-save-progress"
              >
                <Save className="h-4 w-4 mr-1" />
                {t('audit.actions.saveProgress')}
              </Button>
              <Button
                onClick={handleNext}
                data-testid="button-next"
              >
                {t('audit.actions.next')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
