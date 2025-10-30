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
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, ChevronRight, ChevronLeft, Save, Send, CheckCircle, Plus, Trash2, Download, Upload } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { AuditResponse, ReductionPromise } from "@shared/schema";

interface PlasticWasteAuditProps {
  schoolId: string;
  onClose?: () => void;
}

// Form schemas for each part
const part1Schema = z.object({
  schoolName: z.string().min(1, "School name is required"),
  studentCount: z.string().optional(),
  staffCount: z.string().optional(),
  auditDate: z.string().min(1, "Audit date is required"),
  auditTeam: z.string().optional(),
});

const part2Schema = z.object({
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

const part3Schema = z.object({
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
  // Toilets (renamed from bathroom)
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
  { message: "Please select at least one room type", path: ["selectedClassrooms"] }
);

const part4Schema = z.object({
  hasRecyclingBins: z.boolean().default(false),
  recyclingBinLocations: z.string().optional(),
  plasticWasteDestination: z.string().min(1, "Please specify where plastic waste goes"),
  compostsOrganicWaste: z.boolean().default(false),
  hasPlasticReductionPolicy: z.boolean().default(false),
  reductionPolicyDetails: z.string().optional(),
  wasteManagementNotes: z.string().optional(),
});

const promiseItemSchema = z.object({
  plasticItemType: z.string().min(1, "Item type required"),
  plasticItemLabel: z.string().min(1, "Item label required"),
  baselineQuantity: z.coerce.number().min(1, "Baseline must be at least 1"),
  targetQuantity: z.coerce.number().min(0, "Target must be 0 or more"),
  timeframeUnit: z.enum(['week', 'month', 'year']),
  notes: z.string().optional(),
});

const part6Schema = z.object({
  promises: z.array(promiseItemSchema).min(0).refine(
    (promises) => promises.length === 0 || promises.length >= 2,
    { message: "If adding promises, you must add at least 2 action items" }
  )
});

type Part1Data = z.infer<typeof part1Schema>;
type Part2Data = z.infer<typeof part2Schema>;
type Part3Data = z.infer<typeof part3Schema>;
type Part4Data = z.infer<typeof part4Schema>;
type Part6Data = z.infer<typeof part6Schema>;
type PromiseItem = z.infer<typeof promiseItemSchema>;

export function PlasticWasteAudit({ schoolId, onClose }: PlasticWasteAuditProps) {
  const { t } = useTranslation('dashboard');
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
    resolver: zodResolver(part1Schema),
    defaultValues: {
      schoolName: "",
      studentCount: "",
      staffCount: "",
      auditDate: new Date().toISOString().split('T')[0],
      auditTeam: "",
    },
  });

  const form2 = useForm<Part2Data>({
    resolver: zodResolver(part2Schema),
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
    resolver: zodResolver(part3Schema),
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
    resolver: zodResolver(part4Schema),
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

  const form6 = useForm<Part6Data>({
    resolver: zodResolver(part6Schema),
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
    control: form6.control,
    name: "promises",
  });

  // Upload state and refs
  const [isUploading, setIsUploading] = useState(false);
  const auditFileInputRef = useRef<HTMLInputElement>(null);
  const actionPlanFileInputRef = useRef<HTMLInputElement>(null);

  // Upload mutations
  const uploadMutation = useMutation({
    mutationFn: async ({ file, formType }: { file: File; formType: 'audit' | 'action_plan' }) => {
      // Validate file
      if (file.type !== 'application/pdf') {
        throw new Error('Only PDF files are allowed');
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        throw new Error('File size must be less than 10MB');
      }

      // Get signed URL
      const { uploadUrl, objectPath } = await apiRequest<{ uploadUrl: string; objectPath: string }>({
        url: '/api/uploads/printable-forms/signed-url',
        method: 'POST',
        body: { formType, filename: file.name, fileSize: file.size },
      });

      // Upload to GCS
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': 'application/pdf',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage');
      }

      // Create submission record
      const submission = await apiRequest({
        url: '/api/printable-form-submissions',
        method: 'POST',
        body: {
          schoolId,
          formType,
          objectPath,
          filename: file.name,
        },
      });

      return submission;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/printable-form-submissions/school/${schoolId}`] });
      toast({
        title: "Upload Successful",
        description: `${variables.formType === 'audit' ? 'Audit form' : 'Action plan'} uploaded successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (formType: 'audit' | 'action_plan') => {
    const inputRef = formType === 'audit' ? auditFileInputRef : actionPlanFileInputRef;
    const file = inputRef.current?.files?.[0];
    
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync({ file, formType });
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  // Fetch existing promises if audit exists
  const { data: existingPromises } = useQuery<ReductionPromise[]>({
    queryKey: [`/api/reduction-promises/audit/${auditId}`],
    enabled: !!auditId,
  });

  // Helper function to extract audit items from part2 and part3 data (daily counts)
  const extractAuditItems = () => {
    const part2 = form2.getValues();
    const part3 = form3.getValues();
    
    const items: Array<{ type: string; label: string; quantity: number }> = [];
    
    // Part 2 - Lunchroom & Staffroom items
    const lunchroomBottles = parseInt(part2.lunchroomPlasticBottles || "0");
    const staffroomBottles = parseInt(part2.staffroomPlasticBottles || "0");
    if (lunchroomBottles > 0) items.push({ type: "plastic_bottles", label: "Plastic Bottles (Lunchroom)", quantity: lunchroomBottles });
    if (staffroomBottles > 0) items.push({ type: "plastic_bottles", label: "Plastic Bottles (Staffroom)", quantity: staffroomBottles });
    
    const lunchroomCups = parseInt(part2.lunchroomPlasticCups || "0");
    const staffroomCups = parseInt(part2.staffroomPlasticCups || "0");
    if (lunchroomCups > 0) items.push({ type: "plastic_cups", label: "Plastic Cups (Lunchroom)", quantity: lunchroomCups });
    if (staffroomCups > 0) items.push({ type: "plastic_cups", label: "Plastic Cups (Staffroom)", quantity: staffroomCups });
    
    const lunchroomCutlery = parseInt(part2.lunchroomPlasticCutlery || "0");
    if (lunchroomCutlery > 0) items.push({ type: "plastic_cutlery", label: "Plastic Cutlery", quantity: lunchroomCutlery });
    
    const lunchroomStraws = parseInt(part2.lunchroomPlasticStraws || "0");
    if (lunchroomStraws > 0) items.push({ type: "plastic_straws", label: "Plastic Straws", quantity: lunchroomStraws });
    
    const lunchroomSnackWrappers = parseInt(part2.lunchroomSnackWrappers || "0");
    const staffroomSnackWrappers = parseInt(part2.staffroomSnackWrappers || "0");
    if (lunchroomSnackWrappers > 0) items.push({ type: "snack_wrappers", label: "Snack Wrappers (Lunchroom)", quantity: lunchroomSnackWrappers });
    if (staffroomSnackWrappers > 0) items.push({ type: "snack_wrappers", label: "Snack Wrappers (Staffroom)", quantity: staffroomSnackWrappers });
    
    const lunchroomYoghurtPots = parseInt(part2.lunchroomYoghurtPots || "0");
    const staffroomYoghurtPots = parseInt(part2.staffroomYoghurtPots || "0");
    if (lunchroomYoghurtPots > 0) items.push({ type: "yoghurt_pots", label: "Yoghurt Pots (Lunchroom)", quantity: lunchroomYoghurtPots });
    if (staffroomYoghurtPots > 0) items.push({ type: "yoghurt_pots", label: "Yoghurt Pots (Staffroom)", quantity: staffroomYoghurtPots });
    
    const lunchroomTakeaway = parseInt(part2.lunchroomTakeawayContainers || "0");
    const staffroomTakeaway = parseInt(part2.staffroomTakeawayContainers || "0");
    if (lunchroomTakeaway > 0) items.push({ type: "takeaway_containers", label: "Takeaway Containers (Lunchroom)", quantity: lunchroomTakeaway });
    if (staffroomTakeaway > 0) items.push({ type: "takeaway_containers", label: "Takeaway Containers (Staffroom)", quantity: staffroomTakeaway });
    
    const clingFilm = parseInt(part2.lunchroomClingFilm || "0");
    if (clingFilm > 0) items.push({ type: "cling_film", label: "Cling Film", quantity: clingFilm });
    
    // Part 3 - All rooms
    const pensPencils = parseInt(part3.classroomPensPencils || "0");
    if (pensPencils > 0) items.push({ type: "pens_pencils", label: "Pens & Pencils", quantity: pensPencils });
    
    const stationery = parseInt(part3.classroomStationery || "0");
    if (stationery > 0) items.push({ type: "stationery", label: "Stationery Items (Classroom)", quantity: stationery });
    
    const displayMaterials = parseInt(part3.classroomDisplayMaterials || "0");
    if (displayMaterials > 0) items.push({ type: "display_materials", label: "Display Materials (Classroom)", quantity: displayMaterials });
    
    const soapBottles = parseInt(part3.toiletSoapBottles || "0");
    if (soapBottles > 0) items.push({ type: "soap_bottles", label: "Soap Bottles", quantity: soapBottles });
    
    const binLiners = parseInt(part3.toiletBinLiners || "0");
    if (binLiners > 0) items.push({ type: "bin_liners", label: "Bin Liners (Toilet)", quantity: binLiners });
    
    const cupsPaper = parseInt(part3.toiletCupsPaper || "0");
    if (cupsPaper > 0) items.push({ type: "cups_dispensers", label: "Cups/Dispensers", quantity: cupsPaper });
    
    const periodProducts = parseInt(part3.toiletPeriodProducts || "0");
    if (periodProducts > 0) items.push({ type: "period_products", label: "Period Products", quantity: periodProducts });
    
    // Office
    const officeBottles = parseInt(part3.officePlasticBottles || "0");
    if (officeBottles > 0) items.push({ type: "plastic_bottles", label: "Plastic Bottles (Office)", quantity: officeBottles });
    
    const officeCups = parseInt(part3.officePlasticCups || "0");
    if (officeCups > 0) items.push({ type: "plastic_cups", label: "Plastic Cups (Office)", quantity: officeCups });
    
    const officeStationery = parseInt(part3.officeStationery || "0");
    if (officeStationery > 0) items.push({ type: "stationery", label: "Stationery (Office)", quantity: officeStationery });
    
    // Library
    const libraryBottles = parseInt(part3.libraryPlasticBottles || "0");
    if (libraryBottles > 0) items.push({ type: "plastic_bottles", label: "Plastic Bottles (Library)", quantity: libraryBottles });
    
    const libraryStationery = parseInt(part3.libraryStationery || "0");
    if (libraryStationery > 0) items.push({ type: "stationery", label: "Stationery (Library)", quantity: libraryStationery });
    
    const libraryDisplay = parseInt(part3.libraryDisplayMaterials || "0");
    if (libraryDisplay > 0) items.push({ type: "display_materials", label: "Display Materials (Library)", quantity: libraryDisplay });
    
    // Gym
    const gymBottles = parseInt(part3.gymPlasticBottles || "0");
    if (gymBottles > 0) items.push({ type: "plastic_bottles", label: "Plastic Bottles (Gym)", quantity: gymBottles });
    
    const sportEquipment = parseInt(part3.gymSportEquipment || "0");
    if (sportEquipment > 0) items.push({ type: "sport_equipment", label: "Sport Equipment", quantity: sportEquipment });
    
    // Playground
    const playgroundBottles = parseInt(part3.playgroundPlasticBottles || "0");
    if (playgroundBottles > 0) items.push({ type: "plastic_bottles", label: "Plastic Bottles (Playground)", quantity: playgroundBottles });
    
    const toysEquipment = parseInt(part3.playgroundToysEquipment || "0");
    if (toysEquipment > 0) items.push({ type: "toys_equipment", label: "Toys/Equipment (Playground)", quantity: toysEquipment });
    
    // Corridors
    const corridorsBottles = parseInt(part3.corridorsPlasticBottles || "0");
    if (corridorsBottles > 0) items.push({ type: "plastic_bottles", label: "Plastic Bottles (Corridors)", quantity: corridorsBottles });
    
    const corridorsDisplay = parseInt(part3.corridorsDisplayMaterials || "0");
    if (corridorsDisplay > 0) items.push({ type: "display_materials", label: "Display Materials (Corridors)", quantity: corridorsDisplay });
    
    const corridorsBinLiners = parseInt(part3.corridorsBinLiners || "0");
    if (corridorsBinLiners > 0) items.push({ type: "bin_liners", label: "Bin Liners (Corridors)", quantity: corridorsBinLiners });
    
    // Science Labs
    const scienceBottles = parseInt(part3.scienceLabsPlasticBottles || "0");
    if (scienceBottles > 0) items.push({ type: "plastic_bottles", label: "Plastic Bottles (Science Labs)", quantity: scienceBottles });
    
    const labEquipment = parseInt(part3.scienceLabsLabEquipment || "0");
    if (labEquipment > 0) items.push({ type: "lab_equipment", label: "Lab Equipment", quantity: labEquipment });
    
    // Art Rooms
    const artBottles = parseInt(part3.artRoomsPlasticBottles || "0");
    if (artBottles > 0) items.push({ type: "plastic_bottles", label: "Plastic Bottles (Art Rooms)", quantity: artBottles });
    
    const artSupplies = parseInt(part3.artRoomsArtSupplies || "0");
    if (artSupplies > 0) items.push({ type: "art_supplies", label: "Art Supplies", quantity: artSupplies });
    
    return items;
  };

  // Helper function to check if a room has any data
  // A room is considered to have data if ANY of its fields have been explicitly set
  // (even if set to 0 or "0", which is valid audit data)
  const hasRoomData = (data: any, fields: string[]) => {
    return fields.some(field => {
      const value = data[field];
      // Field exists and has been set (undefined/null = not set, empty string = not set)
      // But "0" or 0 = valid data (user explicitly entered zero)
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
        const part3Data = existingAudit.part3Data;
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
        
        // Merge inferred selections with existing data, but only if the selection fields don't already exist
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

  // Load existing promises
  useEffect(() => {
    if (existingPromises && existingPromises.length > 0) {
      const formattedPromises = existingPromises.map(p => ({
        plasticItemType: p.plasticItemType,
        plasticItemLabel: p.plasticItemLabel,
        baselineQuantity: p.baselineQuantity,
        targetQuantity: p.targetQuantity,
        timeframeUnit: p.timeframeUnit as 'week' | 'month' | 'year',
        notes: p.notes || "",
      }));
      form6.reset({ promises: formattedPromises });
    }
  }, [existingPromises]);

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
        title: "Progress saved",
        description: "Your audit progress has been saved automatically.",
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
        title: "Audit submitted!",
        description: "Your plastic waste audit has been submitted for review.",
      });
      onClose?.();
    },
  });

  // Calculate results (multiplied by 190 for annual figures)
  const calculateResults = () => {
    const part2Values = form2.getValues();
    const part3Values = form3.getValues();

    // Calculate daily counts first, then multiply by 190 for annual
    const dailyPlasticCounts = {
      'Plastic bottles': 
        parseInt(part2Values.lunchroomPlasticBottles || "0") + 
        parseInt(part2Values.staffroomPlasticBottles || "0") +
        parseInt(part3Values.officePlasticBottles || "0") +
        parseInt(part3Values.libraryPlasticBottles || "0") +
        parseInt(part3Values.gymPlasticBottles || "0") +
        parseInt(part3Values.playgroundPlasticBottles || "0") +
        parseInt(part3Values.corridorsPlasticBottles || "0") +
        parseInt(part3Values.scienceLabsPlasticBottles || "0") +
        parseInt(part3Values.artRoomsPlasticBottles || "0"),
      'Plastic cups': 
        parseInt(part2Values.lunchroomPlasticCups || "0") + 
        parseInt(part2Values.staffroomPlasticCups || "0") +
        parseInt(part3Values.officePlasticCups || "0"),
      'Plastic cutlery': parseInt(part2Values.lunchroomPlasticCutlery || "0"),
      'Plastic straws': parseInt(part2Values.lunchroomPlasticStraws || "0"),
      'Snack wrappers': 
        parseInt(part2Values.lunchroomSnackWrappers || "0") + 
        parseInt(part2Values.staffroomSnackWrappers || "0"),
      'Yoghurt pots': 
        parseInt(part2Values.lunchroomYoghurtPots || "0") + 
        parseInt(part2Values.staffroomYoghurtPots || "0"),
      'Takeaway containers': 
        parseInt(part2Values.lunchroomTakeawayContainers || "0") + 
        parseInt(part2Values.staffroomTakeawayContainers || "0"),
      'Cling film': parseInt(part2Values.lunchroomClingFilm || "0"),
      'Pens & pencils': parseInt(part3Values.classroomPensPencils || "0"),
      'Stationery items': 
        parseInt(part3Values.classroomStationery || "0") +
        parseInt(part3Values.officeStationery || "0") +
        parseInt(part3Values.libraryStationery || "0"),
      'Display materials': 
        parseInt(part3Values.classroomDisplayMaterials || "0") +
        parseInt(part3Values.libraryDisplayMaterials || "0") +
        parseInt(part3Values.corridorsDisplayMaterials || "0"),
      'Soap bottles': parseInt(part3Values.toiletSoapBottles || "0"),
      'Bin liners': 
        parseInt(part3Values.toiletBinLiners || "0") +
        parseInt(part3Values.corridorsBinLiners || "0"),
      'Toilet cups/dispensers': parseInt(part3Values.toiletCupsPaper || "0"),
      'Period products': parseInt(part3Values.toiletPeriodProducts || "0"),
      'Sport equipment': parseInt(part3Values.gymSportEquipment || "0"),
      'Toys/equipment': parseInt(part3Values.playgroundToysEquipment || "0"),
      'Lab equipment': parseInt(part3Values.scienceLabsLabEquipment || "0"),
      'Art supplies': parseInt(part3Values.artRoomsArtSupplies || "0"),
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
      dailyPlasticCounts['Other plastic items'] = otherTotal;
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
          title: "Validation Error",
          description: "Please fill in all required fields before continuing.",
          variant: "destructive",
        });
        return;
      }
    }

    await handleSaveProgress();
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Previous step
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Submit audit (without promises)
  const handleSubmitAuditOnly = async () => {
    setIsSubmitting(true);
    
    try {
      // Save audit first
      await handleSaveProgress();
      
      if (!auditId) {
        throw new Error("Audit ID not found");
      }
      
      // Submit audit
      await submitMutation.mutateAsync(auditId);
      
      toast({
        title: "Audit Submitted!",
        description: "Your plastic waste audit has been submitted for review.",
      });
      
      onClose?.();
    } catch (error) {
      console.error("Error submitting audit:", error);
      toast({
        title: "Submission Error",
        description: "There was an error submitting your audit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit audit with promises
  const handleSubmitWithPromises = async () => {
    const isValid = await form6.trigger();
    
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Save audit first
      await handleSaveProgress();
      
      if (!auditId) {
        throw new Error("Audit ID not found");
      }
      
      // Submit audit
      await submitMutation.mutateAsync(auditId);
      
      // Create promises
      const promisesData = form6.getValues().promises;
      const promisePromises = promisesData.map(promise => {
        const reductionAmount = promise.baselineQuantity - promise.targetQuantity;
        return apiRequest('POST', '/api/reduction-promises', {
          schoolId,
          auditId,
          plasticItemType: promise.plasticItemType,
          plasticItemLabel: promise.plasticItemLabel,
          baselineQuantity: promise.baselineQuantity,
          targetQuantity: promise.targetQuantity,
          reductionAmount,
          timeframeUnit: promise.timeframeUnit,
          notes: promise.notes || "",
        });
      });
      
      await Promise.all(promisePromises);
      
      queryClient.invalidateQueries({ queryKey: [`/api/reduction-promises/audit/${auditId}`] });
      
      toast({
        title: "Audit and Promises Submitted!",
        description: `Your plastic waste audit and ${promisesData.length} reduction promises have been submitted for review.`,
      });
      
      onClose?.();
    } catch (error) {
      console.error("Error submitting audit and promises:", error);
      toast({
        title: "Submission Error",
        description: "There was an error submitting your audit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download PDF results
  const handleDownloadPDF = async () => {
    try {
      // Save progress first to ensure latest data
      await handleSaveProgress();
      
      if (!auditId) {
        toast({
          title: "Error",
          description: "Audit ID not found. Please save your audit first.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Generating PDF",
        description: "Your audit results PDF is being generated...",
      });

      const response = await fetch(`/api/audits/${auditId}/results-pdf`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Audit_Results_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "PDF Downloaded",
        description: "Your audit results have been downloaded successfully.",
      });
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast({
        title: "Download Error",
        description: "There was an error downloading the PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getCurrentForm = () => {
    switch (currentStep) {
      case 1: return form1;
      case 2: return form2;
      case 3: return form3;
      case 4: return form4;
      case 5: return form1; // Results view, no form
      case 6: return form6;
      default: return form1;
    }
  };

  const progress = (currentStep / 6) * 100;

  // Users can edit draft and submitted audits - only block editing for approved audits

  if (existingAudit?.status === 'approved') {
    const topPlastics = existingAudit.topProblemPlastics as Array<{ name: string; count: number }> | null;
    
    return (
      <Card className="border-2 border-green-300 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-navy">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Audit Approved
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">
            Your plastic waste audit has been approved! Check the results below.
          </p>
          <div className="bg-white p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-navy mb-2">Audit Results</h4>
            <p className="text-sm text-gray-600">
              Total plastic items identified: <span className="font-bold">{existingAudit.totalPlasticItems || 0}</span>
            </p>
            {topPlastics && topPlastics.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-semibold text-gray-700 mb-1">Top Problem Plastics:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {topPlastics.map((item, idx) => (
                    <li key={idx}>• {item.name}: {item.count}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (existingAudit?.status === 'rejected') {
    return (
      <Card className="border-2 border-red-300 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-navy">
            <ClipboardCheck className="h-6 w-6 text-red-600" />
            Audit Needs Revision
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-2">
            Your audit submission needs revision. Please review the feedback and resubmit.
          </p>
          {existingAudit.reviewNotes && (
            <div className="bg-white p-3 rounded border border-red-200 mb-4">
              <p className="text-sm font-semibold text-gray-700">Admin Feedback:</p>
              <p className="text-sm text-gray-600 mt-1">{existingAudit.reviewNotes}</p>
            </div>
          )}
          <Button
            onClick={() => setCurrentStep(1)}
            data-testid="button-revise-audit"
          >
            Revise Audit
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-300">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-navy">
              <ClipboardCheck className="h-6 w-6 text-blue-600" />
              Plastic Waste Audit
            </CardTitle>
            <CardDescription>
              Step {currentStep} of 6: {
                currentStep === 1 ? "About Your School" :
                currentStep === 2 ? "Lunchroom & Staffroom" :
                currentStep === 3 ? "All Rooms" :
                currentStep === 4 ? "Waste Management" :
                currentStep === 5 ? "Audit Results" :
                "Reduction Promises (Optional)"
              }
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/api/printable-forms/audit', '_blank')}
              data-testid="button-download-audit-form"
              className="text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              Audit Form
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => auditFileInputRef.current?.click()}
              disabled={isUploading}
              data-testid="button-upload-audit-form"
              className="text-xs"
            >
              <Upload className="h-3 w-3 mr-1" />
              {isUploading ? 'Uploading...' : 'Upload Audit'}
            </Button>
            {currentStep === 6 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('/api/printable-forms/action-plan', '_blank')}
                  data-testid="button-download-action-plan-form"
                  className="text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Action Plan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => actionPlanFileInputRef.current?.click()}
                  disabled={isUploading}
                  data-testid="button-upload-action-plan-form"
                  className="text-xs"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  {isUploading ? 'Uploading...' : 'Upload Plan'}
                </Button>
              </>
            )}
            <input
              ref={auditFileInputRef}
              type="file"
              accept="application/pdf"
              onChange={() => handleFileUpload('audit')}
              className="hidden"
              data-testid="input-upload-pdf"
            />
            <input
              ref={actionPlanFileInputRef}
              type="file"
              accept="application/pdf"
              onChange={() => handleFileUpload('action_plan')}
              className="hidden"
            />
          </div>
        </div>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: About Your School */}
        {currentStep === 1 && (
          <Form {...form1}>
            <div className="space-y-4">
              <FormField
                control={form1.control}
                name="schoolName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Name</FormLabel>
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
                    <FormLabel>Number of Students</FormLabel>
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
                    <FormLabel>Number of Staff</FormLabel>
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
                    <FormLabel>Audit Date</FormLabel>
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
                    <FormLabel>Audit Team Members</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="List the names of team members who conducted this audit"
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
                <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">Lunchroom</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form2.control}
                    name="lunchroomPlasticBottles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plastic Bottles (daily count)</FormLabel>
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
                        <FormLabel>Plastic Cups (daily count)</FormLabel>
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
                        <FormLabel>Plastic Cutlery (daily count)</FormLabel>
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
                        <FormLabel>Plastic Straws (daily count)</FormLabel>
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
                        <FormLabel>Snack Wrappers (daily count)</FormLabel>
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
                        <FormLabel>Yoghurt Pots (daily count)</FormLabel>
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
                        <FormLabel>Takeaway Containers (daily count)</FormLabel>
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
                        <FormLabel>Cling Film Uses (daily count)</FormLabel>
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
                        <FormLabel>Other Plastic Items (daily count)</FormLabel>
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
                      <FormLabel>Describe Other Plastic Items (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="List any other plastic items found in the lunchroom"
                          data-testid="input-lunchroom-other-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">Staffroom</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form2.control}
                    name="staffroomPlasticBottles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plastic Bottles (daily count)</FormLabel>
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
                        <FormLabel>Plastic Cups (daily count)</FormLabel>
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
                        <FormLabel>Snack Wrappers (daily count)</FormLabel>
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
                        <FormLabel>Yoghurt Pots (daily count)</FormLabel>
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
                        <FormLabel>Takeaway Containers (daily count)</FormLabel>
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
                        <FormLabel>Other Plastic Items (daily count)</FormLabel>
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
                      <FormLabel>Describe Other Plastic Items (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="List any other plastic items found in the staffroom"
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
                    <FormLabel>Additional Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Any observations about plastic use in lunchroom/staffroom areas?"
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
                  Which rooms does your school have? (Select all that apply)
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Only selected rooms will appear in the audit form, reducing scrolling and form fatigue.
                </p>
                
                {/* Academic Rooms */}
                <div className="mb-4">
                  <h4 className="font-semibold text-sm text-gray-700 mb-2 uppercase tracking-wide">📚 Academic Spaces</h4>
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
                              🏫 Classrooms
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
                              📚 Library
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
                              🔬 Science Labs
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
                              🎨 Art Rooms
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Common Areas */}
                <div className="mb-4">
                  <h4 className="font-semibold text-sm text-gray-700 mb-2 uppercase tracking-wide">🏢 Common Areas</h4>
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
                              🚽 Toilets
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
                              🏢 Office
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
                              🚪 Corridors
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Outdoor & Sports */}
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2 uppercase tracking-wide">⚽ Outdoor & Sports</h4>
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
                              🏋️ Gym
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
                              🎮 Playground
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
                <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">Classrooms</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form3.control}
                    name="classroomPensPencils"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plastic Pens & Pencils (daily count)</FormLabel>
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
                        <FormLabel>Other Plastic Stationery (daily count)</FormLabel>
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
                        <FormLabel>Plastic Display Materials (daily count)</FormLabel>
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
                        <FormLabel>Other Plastic Items (daily count)</FormLabel>
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
                      <FormLabel>Describe Other Plastic Items (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="List any other plastic items found in classrooms"
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
                <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">Toilets</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form3.control}
                    name="toiletSoapBottles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plastic Soap Bottles (daily count)</FormLabel>
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
                        <FormLabel>Plastic Bin Liners (daily count)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-toilet-binliners" />
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
                        <FormLabel>Plastic Cups/Dispensers (daily count)</FormLabel>
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
                        <FormLabel>Period Product Dispensers (daily count)</FormLabel>
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
                        <FormLabel>Other Plastic Items (daily count)</FormLabel>
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
                      <FormLabel>Describe Other Plastic Items (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="List any other plastic items found in toilets"
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
                <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">Office</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form3.control}
                    name="officePlasticBottles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plastic Bottles (daily count)</FormLabel>
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
                        <FormLabel>Plastic Cups (daily count)</FormLabel>
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
                        <FormLabel>Stationery Items (daily count)</FormLabel>
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
                        <FormLabel>Other Plastic Items (daily count)</FormLabel>
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
                      <FormLabel>Describe Other Plastic Items (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="List any other plastic items found in the office"
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
                <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">Library</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form3.control}
                    name="libraryPlasticBottles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plastic Bottles (daily count)</FormLabel>
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
                        <FormLabel>Stationery Items (daily count)</FormLabel>
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
                        <FormLabel>Display Materials (daily count)</FormLabel>
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
                        <FormLabel>Other Plastic Items (daily count)</FormLabel>
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
                      <FormLabel>Describe Other Plastic Items (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="List any other plastic items found in the library"
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
                <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">Gym</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form3.control}
                    name="gymPlasticBottles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plastic Bottles (daily count)</FormLabel>
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
                        <FormLabel>Sport Equipment (daily count)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-gym-sport-equipment" />
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
                        <FormLabel>Other Plastic Items (daily count)</FormLabel>
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
                      <FormLabel>Describe Other Plastic Items (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="List any other plastic items found in the gym"
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
                <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">Playground</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form3.control}
                    name="playgroundPlasticBottles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plastic Bottles (daily count)</FormLabel>
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
                        <FormLabel>Toys/Equipment (daily count)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-playground-toys-equipment" />
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
                        <FormLabel>Other Plastic Items (daily count)</FormLabel>
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
                      <FormLabel>Describe Other Plastic Items (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="List any other plastic items found on the playground"
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
                <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">Corridors</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form3.control}
                    name="corridorsPlasticBottles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plastic Bottles (daily count)</FormLabel>
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
                        <FormLabel>Display Materials (daily count)</FormLabel>
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
                        <FormLabel>Bin Liners (daily count)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-corridors-binliners" />
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
                        <FormLabel>Other Plastic Items (daily count)</FormLabel>
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
                      <FormLabel>Describe Other Plastic Items (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="List any other plastic items found in corridors"
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
                <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">Science Labs</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form3.control}
                    name="scienceLabsPlasticBottles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plastic Bottles (daily count)</FormLabel>
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
                        <FormLabel>Lab Equipment (daily count)</FormLabel>
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
                        <FormLabel>Other Plastic Items (daily count)</FormLabel>
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
                      <FormLabel>Describe Other Plastic Items (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="List any other plastic items found in science labs"
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
                <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">Art Rooms</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form3.control}
                    name="artRoomsPlasticBottles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plastic Bottles (daily count)</FormLabel>
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
                        <FormLabel>Art Supplies (daily count)</FormLabel>
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
                        <FormLabel>Other Plastic Items (daily count)</FormLabel>
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
                      <FormLabel>Describe Other Plastic Items (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="List any other plastic items found in art rooms"
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
                    <FormLabel>Additional Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Any observations about plastic use across all rooms?"
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
              <h3 className="font-semibold text-navy mb-3 bg-blue-50 p-3 rounded">Waste Management Practices</h3>
              
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
                      <FormLabel>School has recycling bins</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form4.control}
                name="recyclingBinLocations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recycling Bin Locations (if applicable)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="E.g., classrooms, hallways, cafeteria" data-testid="input-bin-locations" />
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
                    <FormLabel>Where does plastic waste go?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-waste-destination">
                          <SelectValue placeholder={t('audit.select_destination')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general-waste">{t('audit.waste_general')}</SelectItem>
                        <SelectItem value="recycling-center">{t('audit.waste_recycling')}</SelectItem>
                        <SelectItem value="mixed">{t('audit.waste_mixed')}</SelectItem>
                        <SelectItem value="unknown">{t('audit.waste_unknown')}</SelectItem>
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
                      <FormLabel>School composts organic waste</FormLabel>
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
                      <FormLabel>School has a plastic reduction policy</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form4.control}
                name="reductionPolicyDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Policy Details (if applicable)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Describe your school's plastic reduction policy"
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
                    <FormLabel>Additional Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Any other observations about waste management?"
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
                Audit Results
              </h3>
              <p className="text-gray-700 mb-4">
                Based on your daily counts, here's your school's estimated annual plastic consumption (190 school days per year):
              </p>
              
              <div className="bg-white p-5 rounded-lg shadow-md mb-6">
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-600 uppercase tracking-wide font-semibold">Total Annual Plastic Items</p>
                  <p className="text-5xl font-bold text-blue-600 my-2" data-testid="text-total-plastic-items">
                    {calculateResults().totalPlasticItems.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">items per year</p>
                </div>

                {calculateResults().topProblemPlastics.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-gray-800 mb-3 text-center">Top 5 Problem Plastics</h4>
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
                          <span className="text-sm font-bold text-blue-600">{item.count.toLocaleString()}/year</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
                <p className="text-sm text-gray-700">
                  <strong>What's Next?</strong> You can download your results as a PDF, submit your audit now, or continue to create reduction promises to show how you plan to reduce plastic waste.
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
                    Download PDF Results
                  </Button>
                  <Button
                    onClick={handleSubmitAuditOnly}
                    disabled={isSubmitting}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    data-testid="button-submit-audit-now"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Submitting...' : 'Submit Audit Now'}
                  </Button>
                  <Button
                    onClick={handleNext}
                    variant="outline"
                    className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50"
                    data-testid="button-continue-to-promises"
                  >
                    Continue to Add Promises
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
                <div>
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    data-testid="button-back-step-5"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back to Waste Management
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Reduction Promises (Optional) */}
        {currentStep === 6 && (
          <Form {...form6}>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-navy mb-2">Your Reduction Promises</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Based on your audit, commit to reducing at least 2 types of plastic. Set realistic targets!
                </p>
              </div>

              {fields.map((field, index) => {
                const availableItems = extractAuditItems();
                const selectedItem = form6.watch(`promises.${index}.plasticItemType`);
                const selectedItemData = availableItems.find(item => item.type === selectedItem);

                return (
                  <Card key={field.id} className="p-4 bg-gray-50 border border-gray-200" data-testid={`card-promise-${index}`}>
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-semibold text-navy">Promise {index + 1}</h4>
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
                        control={form6.control}
                        name={`promises.${index}.plasticItemType`}
                        render={({ field: formField }) => (
                          <FormItem>
                            <FormLabel>Plastic Item Type</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                formField.onChange(value);
                                const item = availableItems.find(i => i.type === value);
                                if (item) {
                                  form6.setValue(`promises.${index}.plasticItemLabel`, item.label);
                                  form6.setValue(`promises.${index}.baselineQuantity`, item.quantity);
                                }
                              }}
                              value={formField.value}
                            >
                              <FormControl>
                                <SelectTrigger data-testid={`select-promise-type-${index}`}>
                                  <SelectValue placeholder={t('audit.select_plastic_item')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableItems.map((item) => (
                                  <SelectItem key={item.type + item.label} value={item.type}>
                                    {item.label} ({item.quantity} items)
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
                            control={form6.control}
                            name={`promises.${index}.baselineQuantity`}
                            render={({ field: formField }) => (
                              <FormItem>
                                <FormLabel>Current Usage (Baseline)</FormLabel>
                                <FormControl>
                                  <Input
                                    {...formField}
                                    type="number"
                                    min="1"
                                    data-testid={`input-promise-baseline-${index}`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form6.control}
                            name={`promises.${index}.targetQuantity`}
                            render={({ field: formField }) => (
                              <FormItem>
                                <FormLabel>Target Reduction</FormLabel>
                                <FormControl>
                                  <Input
                                    {...formField}
                                    type="number"
                                    min="0"
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
                        control={form6.control}
                        name={`promises.${index}.timeframeUnit`}
                        render={({ field: formField }) => (
                          <FormItem>
                            <FormLabel>Timeframe</FormLabel>
                            <Select onValueChange={formField.onChange} value={formField.value}>
                              <FormControl>
                                <SelectTrigger data-testid={`select-promise-timeframe-${index}`}>
                                  <SelectValue placeholder={t('audit.select_timeframe')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="week">{t('audit.timeframe_week')}</SelectItem>
                                <SelectItem value="month">{t('audit.timeframe_month')}</SelectItem>
                                <SelectItem value="year">{t('audit.timeframe_year')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form6.control}
                        name={`promises.${index}.notes`}
                        render={({ field: formField }) => (
                          <FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                {...formField}
                                placeholder="How will you achieve this reduction?"
                                data-testid={`input-promise-notes-${index}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {selectedItemData && form6.watch(`promises.${index}.baselineQuantity`) > 0 && (
                        <div className="bg-blue-50 p-3 rounded border border-blue-200">
                          <p className="text-sm font-semibold text-navy">
                            Reduction: {form6.watch(`promises.${index}.baselineQuantity`) - form6.watch(`promises.${index}.targetQuantity`)} items per {form6.watch(`promises.${index}.timeframeUnit`)}
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

              {form6.formState.errors.promises?.root && (
                <p className="text-sm text-red-500">{form6.formState.errors.promises.root.message}</p>
              )}

              {/* Promises Summary */}
              {fields.length > 0 && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 mt-6">
                  <h4 className="font-semibold text-navy mb-2">Your Promises Summary</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    You're committing to reduce {fields.length} types of plastic items:
                  </p>
                  <div className="space-y-2">
                    {fields.map((field, index) => {
                      const promise = form6.watch(`promises.${index}`);
                      const reduction = promise.baselineQuantity - promise.targetQuantity;
                      return promise.plasticItemLabel ? (
                        <div key={field.id} className="text-sm bg-white p-2 rounded">
                          <span className="font-semibold">{promise.plasticItemLabel}:</span> Reduce by {reduction} items per {promise.timeframeUnit}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          </Form>
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
                  Previous
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
                Save Progress
              </Button>
              {currentStep < 6 ? (
                <Button
                  onClick={handleNext}
                  data-testid="button-next"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmitWithPromises}
                  disabled={isSubmitting || submitMutation.isPending}
                  data-testid="button-submit-audit"
                >
                  <Send className="h-4 w-4 mr-1" />
                  Submit for Review
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
