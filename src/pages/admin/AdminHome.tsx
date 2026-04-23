import { Users, ScrollText, FileText, Activity } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";

const placeholderSections = [
  {
    icon: Users,
    label: "Providers",
    description: "Manage provider accounts, roles, and access.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: ScrollText,
    label: "Audit Log",
    description: "Review all system activity and access events.",
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    icon: FileText,
    label: "Clinical Activity",
    description: "Notes and billing records across all providers.",
    color: "text-success",
    bg: "bg-success/10",
  },
  {
    icon: Activity,
    label: "System Health",
    description: "Edge function status and usage metrics.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
];

export default function AdminHome() {
  return (
    <AdminLayout title="Dashboard" subtitle="Administration overview">
      <div className="max-w-4xl space-y-6">
        {/* Welcome banner */}
        <div className="glass-card p-4 border-l-2 border-l-primary">
          <p className="text-sm font-medium text-foreground">Welcome to the Admin Panel</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Use the sidebar to navigate. Content sections are being built — come back soon.
          </p>
        </div>

        {/* Section cards */}
        <div className="grid sm:grid-cols-2 gap-3">
          {placeholderSections.map(({ icon: Icon, label, description, color, bg }) => (
            <div key={label} className="glass-card p-4 flex items-start gap-3">
              <div className={`p-2 rounded-xl ${bg} shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                <span className="inline-block mt-2 text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                  Coming soon
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
