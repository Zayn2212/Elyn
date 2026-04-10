import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Bed,
  DollarSign,
  Activity,
  Plus,
  Search,
  Filter,
  ArrowLeft,
  Heart,
  Brain,
  Stethoscope,
  AlertTriangle,
  Clock,
  FileText,
  TrendingUp,
  Building2,
  ChevronRight,
  ScanLine,
} from "lucide-react";
import FaceSheetParser from "@/components/facesheet/FaceSheetParser";
import QuickAddPatient from "@/components/patients/QuickAddPatient";
import { PracticeManagerSkeleton } from "@/components/layout/tabs/TabSkeletons";

// ============================================
// TYPES & CONSTANTS
// ============================================

interface Patient {
  id: string;
  name: string;
  mrn: string | null;
  room: string | null;
  diagnosis: string | null;
  allergies: string[] | null;
  dob: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  // Extended fields for practice manager
  specialty?: string;
  acuity?: "critical" | "high" | "moderate" | "low";
  attending?: string;
  admitDate?: string;
  status?: "active" | "pending_discharge" | "observation";
}

interface BillingRecord {
  id: string;
  cpt_codes: string[] | null;
  icd10_codes: string[] | null;
  rvu: number | null;
  em_level: string | null;
  note_id: string;
  user_id: string;
  created_at: string;
}

const SPECIALTIES = [
  { id: "cardiology", name: "Cardiology", icon: Heart, color: "text-red-400" },
  { id: "neurology", name: "Neurology", icon: Brain, color: "text-purple-400" },
  {
    id: "pulmonology",
    name: "Pulmonology",
    icon: Stethoscope,
    color: "text-blue-400",
  },
  {
    id: "critical_care",
    name: "Critical Care",
    icon: AlertTriangle,
    color: "text-amber-400",
  },
  {
    id: "hospitalist",
    name: "Hospitalist",
    icon: Building2,
    color: "text-emerald-400",
  },
];

const ACUITY_CONFIG = {
  critical: {
    label: "Critical",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  high: {
    label: "High",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  moderate: {
    label: "Moderate",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  low: {
    label: "Low",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
};

const DOLLAR_PER_RVU = 40;

// ============================================
// PRACTICE MANAGER COMPONENT
// ============================================

const PracticeManager = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState("census");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Fetch data
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [patientsRes, billingRes] = await Promise.all([
          supabase.from("patients").select("*").eq("user_id", user.id),
          supabase.from("billing_records").select("*").eq("user_id", user.id),
        ]);

        if (patientsRes.error) throw patientsRes.error;
        if (billingRes.error) throw billingRes.error;

        // Enrich patients with mock practice manager data
        const enrichedPatients = (patientsRes.data || []).map((p, i) => ({
          ...p,
          specialty: SPECIALTIES[i % SPECIALTIES.length].id,
          acuity: (["critical", "high", "moderate", "low"] as const)[i % 4],
          status: (["active", "pending_discharge", "observation"] as const)[
            i % 3
          ],
          admitDate: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
        }));

        setPatients(enrichedPatients);
        setBillingRecords(billingRes.data || []);
      } catch (error: any) {
        toast({
          title: "Error loading data",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, toast]);

  // Computed stats
  const stats = useMemo(() => {
    const totalRVU = billingRecords.reduce((sum, r) => sum + (r.rvu || 0), 0);
    const criticalCount = patients.filter(
      (p) => p.acuity === "critical",
    ).length;
    const pendingDischarge = patients.filter(
      (p) => p.status === "pending_discharge",
    ).length;

    return {
      totalPatients: patients.length,
      totalRVU: totalRVU.toFixed(1),
      estimatedRevenue: (totalRVU * DOLLAR_PER_RVU).toLocaleString(),
      criticalCount,
      pendingDischarge,
      todayEncounters: billingRecords.filter(
        (r) =>
          new Date(r.created_at).toDateString() === new Date().toDateString(),
      ).length,
    };
  }, [patients, billingRecords]);

  // Filtered patients
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.mrn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.room?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSpecialty =
        !selectedSpecialty || p.specialty === selectedSpecialty;
      return matchesSearch && matchesSpecialty;
    });
  }, [patients, searchQuery, selectedSpecialty]);

  // Group by specialty
  const patientsBySpecialty = useMemo(() => {
    return SPECIALTIES.map((s) => ({
      ...s,
      patients: patients.filter((p) => p.specialty === s.id),
      count: patients.filter((p) => p.specialty === s.id).length,
    }));
  }, [patients]);

  if (loading) {
    return <PracticeManagerSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Clean Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />

      {/* Fixed Header */}
      <div
        className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/50"
        style={{
          paddingTop: "var(--safe-top, env(safe-area-inset-top, 24px))",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/?tab=settings")}
              className="text-muted-foreground hover:text-foreground h-9 w-9 shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">
                Patients Manager
              </h1>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider opacity-70 hidden sm:block">
                Multi-Specialty Patient Census & Billing
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsQuickAddOpen(true)}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Add Patient</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>
      <div
        className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-6"
        style={{
          paddingTop:
            "calc(5rem + var(--safe-top, env(safe-area-inset-top, 0px)))",
        }}
      >
        {/* Mobile-Responsive Stats Grid: 2 cols on mobile, 3 on tablet, 6 on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4 mb-6">
          <StatsCard
            icon={<Users className="h-4 w-4 sm:h-5 sm:w-5" />}
            value={stats.totalPatients}
            label="Census"
            color="text-primary"
          />
          <StatsCard
            icon={<AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />}
            value={stats.criticalCount}
            label="Critical"
            color="text-destructive"
          />
          <StatsCard
            icon={<Clock className="h-4 w-4 sm:h-5 sm:w-5" />}
            value={stats.pendingDischarge}
            label="Pending D/C"
            color="text-warning"
          />
          <StatsCard
            icon={<FileText className="h-4 w-4 sm:h-5 sm:w-5" />}
            value={stats.todayEncounters}
            label="Today's Notes"
            color="text-info"
          />
          <StatsCard
            icon={<TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />}
            value={stats.totalRVU}
            label="Total RVU"
            color="text-success"
          />
          <StatsCard
            icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />}
            value={`$${stats.estimatedRevenue}`}
            label="Est. Revenue"
            color="text-primary"
          />
        </div>

        {/* Mobile-Responsive Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="bg-card border border-border w-full grid grid-cols-4">
            <TabsTrigger value="census" className="text-xs sm:text-sm">
              Census
            </TabsTrigger>
            <TabsTrigger value="specialty" className="text-xs sm:text-sm">
              Specialty
            </TabsTrigger>
            <TabsTrigger value="billing" className="text-xs sm:text-sm">
              Billing
            </TabsTrigger>
            <TabsTrigger
              value="facesheet"
              className="text-xs sm:text-sm flex items-center gap-1"
            >
              <ScanLine className="w-3 h-3" />
              <span className="hidden sm:inline">Face Sheet</span>
              <span className="sm:hidden">Scan</span>
            </TabsTrigger>
          </TabsList>

          {/* Census Tab */}
          <TabsContent value="census" className="space-y-4">
            {/* Mobile-Responsive Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, MRN, room..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-card border-border"
                />
              </div>
              {/* Mobile: Dropdown filter, Desktop: Buttons */}
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                {SPECIALTIES.map((s) => (
                  <Button
                    key={s.id}
                    variant={selectedSpecialty === s.id ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setSelectedSpecialty(
                        selectedSpecialty === s.id ? null : s.id,
                      )
                    }
                    className="flex-shrink-0 text-xs"
                  >
                    <s.icon className={`h-3 w-3 mr-1 ${s.color}`} />
                    <span className="hidden sm:inline">{s.name}</span>
                    <span className="sm:hidden">{s.name.slice(0, 4)}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Patient List */}
            <div className="space-y-2 sm:space-y-3">
              <AnimatePresence>
                {filteredPatients.map((patient, index) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    index={index}
                  />
                ))}
              </AnimatePresence>
              {filteredPatients.length === 0 && (
                <Card className="bg-card/50 border-border">
                  <CardContent className="py-8 sm:py-12 text-center">
                    <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-sm">
                      No patients found
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Specialty Tab */}
          <TabsContent value="specialty" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {patientsBySpecialty.map((specialty) => (
                <Card key={specialty.id} className="bg-card border-border">
                  <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
                          <specialty.icon
                            className={`h-4 w-4 sm:h-5 sm:w-5 ${specialty.color}`}
                          />
                        </div>
                        <CardTitle className="text-sm sm:text-lg">
                          {specialty.name}
                        </CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {specialty.count}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="space-y-2">
                      {specialty.patients.slice(0, 3).map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between text-xs sm:text-sm"
                        >
                          <span className="text-foreground truncate">
                            {p.name}
                          </span>
                          <span className="text-muted-foreground ml-2">
                            Rm {p.room || "TBD"}
                          </span>
                        </div>
                      ))}
                      {specialty.patients.length > 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-primary text-xs"
                          onClick={() => {
                            setSelectedSpecialty(specialty.id);
                            setActiveTab("census");
                          }}
                        >
                          View all {specialty.patients.length}
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* RVU by Service */}
              <Card className="bg-card border-border">
                <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2">
                  <CardTitle className="text-sm sm:text-lg">
                    RVU by Service Type
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="space-y-3 sm:space-y-4">
                    {["Progress Notes", "Consults", "H&P", "Critical Care"].map(
                      (service, i) => {
                        const value = [45, 25, 20, 10][i];
                        return (
                          <div key={service}>
                            <div className="flex justify-between text-xs sm:text-sm mb-1">
                              <span className="text-foreground">{service}</span>
                              <span className="text-muted-foreground">
                                {value}%
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${value}%` }}
                                transition={{ duration: 0.8, delay: i * 0.1 }}
                                className="h-full bg-primary rounded-full"
                              />
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Billing */}
              <Card className="bg-card border-border">
                <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2">
                  <CardTitle className="text-sm sm:text-lg">
                    Recent Billing Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="space-y-2 sm:space-y-3">
                    {billingRecords.slice(0, 5).map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs"
                            >
                              {record.cpt_codes?.[0] || "N/A"}
                            </Badge>
                            <span className="text-xs sm:text-sm text-foreground truncate">
                              {record.em_level || "Standard"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(record.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right ml-2">
                          <p className="font-semibold text-primary text-sm">
                            {record.rvu?.toFixed(2)} RVU
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ${((record.rvu || 0) * DOLLAR_PER_RVU).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {billingRecords.length === 0 && (
                      <p className="text-center text-muted-foreground py-4 text-sm">
                        No billing records yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Face Sheet Tab */}
          <TabsContent value="facesheet" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2">
                <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                  <ScanLine className="w-5 h-5 text-primary" />
                  AI Face Sheet Parser
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Paste patient face sheet content to automatically extract
                  demographics, insurance, and medical information
                </p>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <FaceSheetParser
                  onPatientCreated={(patientId) => {
                    toast({
                      title: "Patient Created",
                      description: "Patient has been added to your census",
                    });
                    setActiveTab("census");
                    // Refresh patients list
                    supabase
                      .from("patients")
                      .select("*")
                      .eq("user_id", user?.id)
                      .then(({ data }) => {
                        if (data)
                          setPatients(
                            data.map((p) => ({
                              ...p,
                              status:
                                (p.status as Patient["status"]) || "active",
                            })),
                          );
                      });
                  }}
                  onToast={(message) => toast({ description: message })}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Quick Add Patient Modal */}
      <QuickAddPatient
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onPatientAdded={() => {
          toast({
            title: "Patient Added",
            description: "Patient has been added successfully",
          });
          // Refresh patients list
          supabase
            .from("patients")
            .select("*")
            .eq("user_id", user?.id)
            .then(({ data }) => {
              if (data) {
                const enrichedPatients = data.map((p, i) => ({
                  ...p,
                  specialty: SPECIALTIES[i % SPECIALTIES.length].id,
                  acuity: (["critical", "high", "moderate", "low"] as const)[
                    i % 4
                  ],
                  status: (
                    ["active", "pending_discharge", "observation"] as const
                  )[i % 3],
                  admitDate: new Date(
                    Date.now() - (i + 1) * 86400000,
                  ).toISOString(),
                }));
                setPatients(enrichedPatients);
              }
            });
        }}
      />
    </div>
  );
};

// ============================================
// SUB COMPONENTS
// ============================================

const StatsCard = ({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-card border border-border rounded-lg p-2.5 sm:p-4 text-center"
  >
    <div className={`${color} mb-1.5 sm:mb-2 flex justify-center`}>{icon}</div>
    <p className="text-lg sm:text-2xl font-bold text-foreground">{value}</p>
    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
      {label}
    </p>
  </motion.div>
);

const PatientCard = ({
  patient,
  index,
}: {
  patient: Patient;
  index: number;
}) => {
  const specialty = SPECIALTIES.find((s) => s.id === patient.specialty);
  const acuity = patient.acuity ? ACUITY_CONFIG[patient.acuity] : null;
  const SpecialtyIcon = specialty?.icon || Users;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="bg-card border-border">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Acuity indicator */}
            <div
              className={`w-1 h-10 sm:h-12 rounded-full flex-shrink-0 ${
                patient.acuity === "critical"
                  ? "bg-destructive"
                  : patient.acuity === "high"
                    ? "bg-warning"
                    : patient.acuity === "moderate"
                      ? "bg-yellow-500"
                      : "bg-success"
              }`}
            />

            {/* Specialty icon - hidden on mobile */}
            <div className="hidden sm:flex p-2 rounded-lg bg-primary/10">
              <SpecialtyIcon
                className={`h-5 w-5 ${specialty?.color || "text-primary"}`}
              />
            </div>

            {/* Patient info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                  {patient.name}
                </h3>
                {acuity && (
                  <Badge
                    className={`${acuity.color} border text-[10px] sm:text-xs px-1.5 py-0`}
                  >
                    {acuity.label}
                  </Badge>
                )}
                {patient.status === "pending_discharge" && (
                  <Badge
                    variant="outline"
                    className="text-warning border-warning/30 text-[10px] sm:text-xs px-1.5 py-0"
                  >
                    D/C
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                <span>MRN: {patient.mrn || "N/A"}</span>
                <span>Rm: {patient.room || "TBD"}</span>
                {patient.diagnosis && (
                  <span className="truncate max-w-[120px] sm:max-w-xs hidden sm:inline">
                    {patient.diagnosis}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PracticeManager;
