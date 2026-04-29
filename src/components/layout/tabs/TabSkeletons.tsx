import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Generic container for consistent tab entry animations
const SkeletonContainer = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className={cn("h-full flex flex-col px-4 pt-4", className)}
  >
    {children}
  </motion.div>
);

export function PatientListSkeleton() {
  return (
    <SkeletonContainer className="px-0">
      {/* Header Skeleton */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 w-[130px] rounded-lg" />
          <Skeleton className="h-9 w-[100px] rounded-lg hidden sm:block" />
        </div>
      </div>

      {/* List Skeleton */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="glass-card p-3 border border-border/50">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-12 rounded-full" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-8 w-20 rounded-xl hidden sm:block" />
              <Skeleton className="w-4 h-4 rounded-full opacity-20" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonContainer>
  );
}

export function BillListSkeleton() {
  return (
    <SkeletonContainer>
      {/* Header Skeleton */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <div className="text-right space-y-1">
            <Skeleton className="h-6 w-16 ml-auto" />
            <Skeleton className="h-3 w-20 ml-auto" />
          </div>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-full" />
        ))}
      </div>

      {/* List Skeleton */}
      <div className="flex-1 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-4 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-6 w-12 ml-auto" />
                <Skeleton className="h-2 w-8 ml-auto" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-7 w-16 rounded-lg" />
              <Skeleton className="h-7 w-32 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonContainer>
  );
}

export function NoteListSkeleton() {
  return (
    <SkeletonContainer className="px-0">
      {/* Header Skeleton */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border/30">
        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton className="h-9 flex-1 min-w-[140px] rounded-lg" />
          <Skeleton className="h-9 w-[100px] rounded-lg" />
          <Skeleton className="h-9 w-[110px] rounded-lg" />
          <Skeleton className="h-9 w-[120px] rounded-lg" />
        </div>
      </div>

      {/* List Skeleton */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-12 rounded-full" />
                    <Skeleton className="h-3 w-20 rounded-full" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
              <Skeleton className="w-5 h-5 rounded-full md:hidden opacity-20" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonContainer>
  );
}

export function SettingsSkeleton() {
  // Match SettingsTab exactly: outer absolute flex column, scrollable content,
  // a thin border-top footer with just the Sign Out button.
  // The old skeleton had pt-4 applied twice (once on SkeletonContainer, once
  // on the inner list) and pb-20 on the footer — both caused visible gaps
  // that don't exist in the real screen.
  return (
    <SkeletonContainer className="px-0 pt-0">
      <div className="flex-1 px-4 pt-4 pb-4 space-y-6 overflow-y-auto">
        <Skeleton className="h-8 w-40 mb-4" />

        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-full h-14 px-4 rounded-xl border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-5 h-5 rounded-md" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="w-4 h-4 rounded-full opacity-20" />
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 md:pb-6 border-t border-border bg-background">
        <Skeleton className="w-full h-12 rounded-xl" />
      </div>
    </SkeletonContainer>
  );
}

export function NoteItemsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-3 rounded-xl border border-border/50">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-24" />
              <div className="flex items-center gap-1">
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PracticeManagerSkeleton() {
  return (
    <div className="min-h-screen bg-background p-4 pt-16 space-y-6">
      {/* Header Mock */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/50 px-4 py-4" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-3 w-64 hidden sm:block" />
            </div>
          </div>
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6 pt-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-3 text-center space-y-2">
              <Skeleton className="h-5 w-5 mx-auto" />
              <Skeleton className="h-6 w-12 mx-auto" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>

        {/* Tabs Mock */}
        <Skeleton className="h-10 w-full rounded-lg" />

        {/* Search Header */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-16 rounded-lg" />
            ))}
          </div>
        </div>

        {/* List of Patient Cards */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
              <Skeleton className="w-1 h-12 rounded-full shrink-0" />
              <Skeleton className="h-12 w-12 rounded-lg hidden sm:block shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <Skeleton className="h-8 w-8 rounded-full shrink-0 opacity-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProfileSettingsSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header Mock */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/50 px-4 py-4" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-24 space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card border border-border p-6 space-y-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
