import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSessionSecurity } from "@/hooks/useSessionSecurity";
import { useToast } from "@/hooks/use-toast";
import useNotePreferences, {
  NotePreferences,
  SECTION_LABELS,
  NOTE_TEMPLATES,
} from "@/hooks/useNotePreferences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  User,
  Save,
  Loader2,
  AlertTriangle,
  Building2,
  Bone,
  Baby,
  Microscope,
  Shield,
  LogOut,
  Monitor,
  Sun,
  Moon,
  Laptop,
  FileText,
  ChevronUp,
  ChevronDown,
  ExternalLink as ExternalLinkIcon,
} from "lucide-react";

import { motion } from "framer-motion";
import { format } from "date-fns";
import MFAEnrollment from "@/components/auth/MFAEnrollment";
import { ProfileSettingsSkeleton } from "@/components/layout/tabs/TabSkeletons";

import { SPECIALTIES, getSpecialtyById } from "@/data/specialties";

interface Profile {
  full_name: string | null;
  specialty: string | null;
  npi_number: string | null;
  tax_id: string | null;
  taxonomy_code: string | null;
  billing_address: string | null;
  place_of_service_default: string | null;
}

interface UserSession {
  id: string;
  last_activity_at: string;
  user_agent: string | null;
  is_active: boolean;
  created_at: string;
}

const ProfileSettings = () => {
  const { user } = useAuth();
  const { signOutAllDevices, getActiveSessions } = useSessionSecurity();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Note preferences hook
  const {
    preferences: notePreferences,
    loading: notePrefsLoading,
    saving: notePrefsaving,
    savePreferences: saveNotePreferences,
    applyTemplate,
    toggleSection,
    setPreferences: setNotePreferences,
  } = useNotePreferences();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    specialty: null,
    npi_number: "",
    tax_id: "",
    taxonomy_code: "",
    billing_address: "",
    place_of_service_default: "21",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "full_name, specialty, npi_number, tax_id, taxonomy_code, billing_address, place_of_service_default",
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        toast({
          title: "Error loading profile",
          description: error.message,
          variant: "destructive",
        });
      } else if (data) {
        setProfile({
          full_name: data.full_name || "",
          specialty: data.specialty,
          npi_number: data.npi_number || "",
          tax_id: (data as any).tax_id || "",
          taxonomy_code: (data as any).taxonomy_code || "",
          billing_address: (data as any).billing_address || "",
          place_of_service_default:
            (data as any).place_of_service_default || "21",
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user, toast]);

  // Fetch active sessions
  const fetchSessions = async () => {
    setLoadingSessions(true);
    const data = await getActiveSessions();
    setSessions(data as UserSession[]);
    setLoadingSessions(false);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        specialty: profile.specialty,
        npi_number: profile.npi_number,
        tax_id: profile.tax_id,
        taxonomy_code: profile.taxonomy_code,
        billing_address: profile.billing_address,
        place_of_service_default: profile.place_of_service_default,
      } as any)
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast({
        title: "Error saving profile",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    }
  };

  const handleSignOutAllDevices = async () => {
    setSigningOut(true);
    const result = await signOutAllDevices();
    setSigningOut(false);

    if (result.success) {
      toast({
        title: "Signed out all devices",
        description: "All other sessions have been terminated.",
      });
      fetchSessions();
    } else {
      toast({
        title: "Error",
        description: "Failed to sign out other devices.",
        variant: "destructive",
      });
    }
  };

  // Handle saving note preferences
  const handleSaveNotePreferences = async () => {
    const success = await saveNotePreferences(notePreferences);
    if (success) {
      toast({
        title: "Note preferences saved",
        description: "Your note template preferences have been updated.",
      });
    } else {
      toast({
        title: "Error saving preferences",
        description: "Failed to save note preferences.",
        variant: "destructive",
      });
    }
  };

  // Move section up in order
  const moveSectionUp = (sectionKey: string) => {
    const currentOrder = notePreferences.sectionOrder;
    const idx = currentOrder.indexOf(sectionKey);
    if (idx > 0) {
      const newOrder = [...currentOrder];
      [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
      setNotePreferences({
        ...notePreferences,
        sectionOrder: newOrder,
        noteFormat: "custom",
      });
    }
  };

  // Move section down in order
  const moveSectionDown = (sectionKey: string) => {
    const currentOrder = notePreferences.sectionOrder;
    const idx = currentOrder.indexOf(sectionKey);
    if (idx < currentOrder.length - 1) {
      const newOrder = [...currentOrder];
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
      setNotePreferences({
        ...notePreferences,
        sectionOrder: newOrder,
        noteFormat: "custom",
      });
    }
  };

  const selectedSpecialtyData = getSpecialtyById(profile.specialty);

  const getDeviceLabel = (userAgent: string | null) => {
    if (!userAgent) return "Unknown Device";

    let browser = "Browser";
    if (userAgent.includes("Edg/")) browser = "Edge";
    else if (userAgent.includes("Chrome/")) browser = "Chrome";
    else if (userAgent.includes("Firefox/")) browser = "Firefox";
    else if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/"))
      browser = "Safari";

    let os = "";
    if (userAgent.includes("iPhone")) os = "iPhone";
    else if (userAgent.includes("iPad")) os = "iPad";
    else if (userAgent.includes("Android")) os = "Android";
    else if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Macintosh") || userAgent.includes("Mac OS"))
      os = "Mac";
    else if (userAgent.includes("Linux")) os = "Linux";

    return os ? `${browser} on ${os}` : browser;
  };

  if (loading) {
    return <ProfileSettingsSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Fixed Header Wrapper */}
      <div
        className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/50"
        style={{
          paddingTop: "var(--safe-top, env(safe-area-inset-top, 40px))",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/?tab=settings")}
            className="text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">
              Profile Settings
            </h1>
            <p className="text-[11px] text-muted-foreground truncate font-medium uppercase tracking-wider opacity-70">
              Physician Console • Settings
            </p>
          </div>
        </div>
      </div>

      <div
        className="max-w-2xl mx-auto px-4"
        style={{
          paddingTop:
            "calc(5.5rem + var(--safe-top, env(safe-area-inset-top, 0px)))",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="space-y-8"
        >
          {/* Profile Card */}
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Physician Information</CardTitle>
                  <CardDescription>
                    Update your name, specialty, and credentials
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  placeholder="Dr. John Smith"
                  value={profile.full_name || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, full_name: e.target.value })
                  }
                  className="bg-background/50"
                />
              </div>

              {/* Specialty Selection */}
              <div className="space-y-2">
                <Label htmlFor="specialty">Specialty</Label>
                <Select
                  value={profile.specialty || ""}
                  onValueChange={(value) =>
                    setProfile({ ...profile, specialty: value })
                  }
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select your specialty">
                      {selectedSpecialtyData && (
                        <div className="flex items-center gap-2">
                          <selectedSpecialtyData.icon className="h-4 w-4 text-primary" />
                          <span>{selectedSpecialtyData.name}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {SPECIALTIES.map((specialty) => (
                      <SelectItem key={specialty.id} value={specialty.id}>
                        <div className="flex items-center gap-2">
                          <specialty.icon className="h-4 w-4 text-muted-foreground" />
                          <span>{specialty.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Your specialty determines which billing records you can see
                  from your group
                </p>
              </div>

              {/* NPI Number */}
              <div className="space-y-2">
                <Label htmlFor="npi_number">NPI Number</Label>
                <Input
                  id="npi_number"
                  placeholder="1234567890"
                  value={profile.npi_number || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, npi_number: e.target.value })
                  }
                  className="bg-background/50"
                />
              </div>

              {/* Claims & Billing Fields */}
              <div className="pt-4 border-t border-border space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Claims & Billing
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Required for CMS 1500 and EDI 837P export
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_id">Tax ID / EIN (Box 25)</Label>
                  <Input
                    id="tax_id"
                    placeholder="12-3456789"
                    value={profile.tax_id || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, tax_id: e.target.value })
                    }
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxonomy_code">Taxonomy Code</Label>
                  <Input
                    id="taxonomy_code"
                    placeholder="207R00000X"
                    value={profile.taxonomy_code || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, taxonomy_code: e.target.value })
                    }
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing_address">
                    Billing Address (Box 33)
                  </Label>
                  <Input
                    id="billing_address"
                    placeholder="123 Medical Plaza, Suite 100, City, ST 12345"
                    value={profile.billing_address || ""}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        billing_address: e.target.value,
                      })
                    }
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pos_default">Default Place of Service</Label>
                  <Select
                    value={profile.place_of_service_default || "21"}
                    onValueChange={(value) =>
                      setProfile({
                        ...profile,
                        place_of_service_default: value,
                      })
                    }
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="11">11 - Office</SelectItem>
                      <SelectItem value="21">
                        21 - Inpatient Hospital
                      </SelectItem>
                      <SelectItem value="22">
                        22 - Outpatient Hospital
                      </SelectItem>
                      <SelectItem value="23">23 - Emergency Room</SelectItem>
                      <SelectItem value="31">
                        31 - Skilled Nursing Facility
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-background/30 text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              {/* Save Button */}
              <div className="pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Appearance Card */}
          <Card className="bg-card/50 backdrop-blur-sm border-border mt-6">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Sun className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>
                    Customize how ELYN looks on your device
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Theme</Label>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="h-5 w-5" />
                    <span className="text-xs">Light</span>
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="h-5 w-5" />
                    <span className="text-xs">Dark</span>
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                    onClick={() => setTheme("system")}
                  >
                    <Laptop className="h-5 w-5" />
                    <span className="text-xs">System</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Choose between light, dark, or system-based theme
                </p>
              </div>
            </CardContent>
          </Card>

          {/* MFA Enrollment */}
          <MFAEnrollment />

          {/* Note Preferences Card */}
          <Card className="bg-card/50 backdrop-blur-sm border-border mt-6">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Note Preferences</CardTitle>
                  <CardDescription>
                    Customize which sections appear in generated notes
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {notePrefsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Template Selection */}
                  <div className="space-y-2">
                    <Label>Default Format</Label>
                    <Select
                      value={notePreferences.noteFormat}
                      onValueChange={(value) =>
                        applyTemplate(value as NotePreferences["noteFormat"])
                      }
                    >
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="soap">
                          <div className="flex flex-col">
                            <span>SOAP (Standard)</span>
                            <span className="text-xs text-muted-foreground">
                              Subjective, Objective, Assessment, Plan
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="apso">
                          <div className="flex flex-col">
                            <span>APSO (Problem-Focused)</span>
                            <span className="text-xs text-muted-foreground">
                              Assessment, Plan, Subjective, Objective
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="brief">
                          <div className="flex flex-col">
                            <span>Brief</span>
                            <span className="text-xs text-muted-foreground">
                              Assessment and Plan only
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="custom">
                          <div className="flex flex-col">
                            <span>Custom</span>
                            <span className="text-xs text-muted-foreground">
                              Your custom configuration
                            </span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Choose a template or customize sections below
                    </p>
                  </div>

                  {/* Sections to Include */}
                  <div className="space-y-3">
                    <Label>Sections to Include</Label>
                    <div className="space-y-2">
                      {Object.entries(SECTION_LABELS).map(
                        ([key, { label, description }]) => {
                          const sectionKey =
                            key as keyof NotePreferences["sections"];
                          const isEnabled =
                            notePreferences.sections[sectionKey];
                          const orderIndex =
                            notePreferences.sectionOrder.indexOf(key);
                          const isInOrder = orderIndex !== -1;

                          return (
                            <div
                              key={key}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                isEnabled
                                  ? "bg-primary/5 border-primary/20"
                                  : "bg-muted/30 border-border"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  id={`section-${key}`}
                                  checked={isEnabled}
                                  onCheckedChange={() => {
                                    toggleSection(sectionKey);
                                    // Update order accordingly
                                    if (isEnabled) {
                                      // Removing - take out of order
                                      setNotePreferences({
                                        ...notePreferences,
                                        noteFormat: "custom",
                                        sections: {
                                          ...notePreferences.sections,
                                          [sectionKey]: false,
                                        },
                                        sectionOrder:
                                          notePreferences.sectionOrder.filter(
                                            (s) => s !== key,
                                          ),
                                      });
                                    } else {
                                      // Adding - add to end of order
                                      setNotePreferences({
                                        ...notePreferences,
                                        noteFormat: "custom",
                                        sections: {
                                          ...notePreferences.sections,
                                          [sectionKey]: true,
                                        },
                                        sectionOrder: [
                                          ...notePreferences.sectionOrder,
                                          key,
                                        ],
                                      });
                                    }
                                  }}
                                />
                                <div>
                                  <label
                                    htmlFor={`section-${key}`}
                                    className="text-sm font-medium text-foreground cursor-pointer"
                                  >
                                    {label}
                                  </label>
                                  <p className="text-xs text-muted-foreground">
                                    {description}
                                  </p>
                                </div>
                              </div>

                              {/* Reorder buttons - only show for enabled sections */}
                              {isEnabled && isInOrder && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground mr-2">
                                    #{orderIndex + 1}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => moveSectionUp(key)}
                                    disabled={orderIndex === 0}
                                  >
                                    <ChevronUp className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => moveSectionDown(key)}
                                    disabled={
                                      orderIndex ===
                                      notePreferences.sectionOrder.length - 1
                                    }
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-4">
                    <Button
                      onClick={handleSaveNotePreferences}
                      disabled={notePrefsaving}
                      className="w-full"
                    >
                      {notePrefsaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Note Preferences
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Security & Compliance Card */}
          <Card className="bg-card/50 backdrop-blur-sm border-border mt-6">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle>Security & Compliance</CardTitle>
                  <CardDescription>
                    Enterprise security status and compliance indicators
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                  <span className="text-[10px] font-semibold uppercase text-green-600 dark:text-green-400">
                    HIPAA
                  </span>
                  <p className="text-sm font-medium text-foreground mt-1">
                    Compliant
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    PHI de-identified before AI
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                  <span className="text-[10px] font-semibold uppercase text-green-600 dark:text-green-400">
                    SOC 2 Type II
                  </span>
                  <p className="text-sm font-medium text-foreground mt-1">
                    Certified
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Annual audit
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                    Encryption
                  </span>
                  <p className="text-sm font-medium text-foreground mt-1">
                    AES-256 / TLS 1.3
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    At rest & in transit
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                    Active Devices
                  </span>
                  <p className="text-sm font-medium text-foreground mt-1">
                    {sessions.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    30-min idle timeout
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/20 border border-border">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Audit Logging
                </span>
                <p className="text-xs text-foreground mt-1">
                  All note creation, edits, and access events are logged with
                  immutable audit trail
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Session Security Card */}
          <Card className="bg-card/50 backdrop-blur-sm border-border mt-6">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-destructive/10">
                  <Shield className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <CardTitle>Session Security</CardTitle>
                  <CardDescription>
                    Manage your active sessions and sign out from other devices
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Active Sessions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm">Active Sessions</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchSessions}
                    disabled={loadingSessions}
                  >
                    {loadingSessions ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Refresh"
                    )}
                  </Button>
                </div>

                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active sessions found
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((session, idx) => (
                      <div
                        key={session.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border"
                      >
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">
                            {getDeviceLabel(session.user_agent)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Last active:{" "}
                            {format(
                              new Date(session.last_activity_at),
                              "MMM d, HH:mm",
                            )}
                          </p>
                        </div>
                        {idx === 0 && (
                          <Badge variant="outline" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sign Out All Devices */}
              <div className="pt-4 border-t border-border">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="w-full"
                      disabled={signingOut}
                    >
                      {signingOut ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing out...
                        </>
                      ) : (
                        <>
                          <LogOut className="mr-2 h-4 w-4" />
                          Sign Out All Other Devices
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Sign out all other devices?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will terminate all other active sessions. You will
                        remain logged in on this device.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSignOutAllDevices}>
                        Sign Out All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Use this if you suspect unauthorized access to your account
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfileSettings;
